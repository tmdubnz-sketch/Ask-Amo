package com.askamo.mobile;

import android.os.Environment;
import android.util.Pair;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "NativePackage")
public class NativePackagePlugin extends Plugin {
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, ToolInfo> installedTools = new ConcurrentHashMap<>();
    private final String toolsBasePath;

    private static class ToolInfo {
        String name;
        String version;
        String path;
        long size;
        long installedAt;
    }

    public NativePackagePlugin() {
        // Initialize tools directory in app's private storage
        toolsBasePath = getContext().getFilesDir().getAbsolutePath() + "/amo-tools";
        File toolsDir = new File(toolsBasePath);
        if (!toolsDir.exists()) {
            toolsDir.mkdirs();
        }
        
        // Load installed tools from storage
        loadInstalledTools();
    }

    private void loadInstalledTools() {
        File metaFile = new File(toolsBasePath, ".installed.json");
        if (metaFile.exists()) {
            try {
                String content = new String(java.nio.file.Files.readAllBytes(metaFile.toPath()));
                // Simple parsing - in production use JSON library
                // For now, just scan the directory
            } catch (Exception e) {
                // Ignore
            }
        }
        
        // Scan installed tools
        File[] toolDirs = new File(toolsBasePath).listFiles();
        if (toolDirs != null) {
            for (File toolDir : toolDirs) {
                if (toolDir.isDirectory()) {
                    ToolInfo info = new ToolInfo();
                    info.name = toolDir.getName();
                    info.path = toolDir.getAbsolutePath();
                    info.size = calculateDirSize(toolDir);
                    installedTools.put(info.name, info);
                }
            }
        }
    }

    private long calculateDirSize(File dir) {
        long size = 0;
        File[] files = dir.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    size += calculateDirSize(file);
                } else {
                    size += file.length();
                }
            }
        }
        return size;
    }

    @PluginMethod
    public void checkTool(PluginCall call) {
        String name = call.getString("name");
        
        ToolInfo info = installedTools.get(name);
        if (info != null) {
            JSObject result = new JSObject();
            result.put("available", true);
            result.put("version", info.version);
            result.put("path", info.path);
            call.resolve(result);
        } else {
            JSObject result = new JSObject();
            result.put("available", false);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void listTools(PluginCall call) {
        JSObject result = new JSObject();
        
        // Build tools array as JSON string (Capacitor doesn't have easy JSArray)
        StringBuilder json = new StringBuilder("[");
        boolean first = true;
        for (Map.Entry<String, ToolInfo> entry : installedTools.entrySet()) {
            ToolInfo info = entry.getValue();
            if (!first) json.append(",");
            json.append("{\"name\":\"").append(info.name != null ? info.name : "").append("\"");
            json.append(",\"version\":\"").append(info.version != null ? info.version : "unknown").append("\"");
            json.append(",\"path\":\"").append(info.path != null ? info.path : "").append("\"");
            json.append(",\"installed\":true");
            json.append(",\"size\":").append(info.size).append("}");
            first = false;
        }
        json.append("]");
        
        result.put("tools", json.toString());
        call.resolve(result);
    }

    @PluginMethod
    public void installTool(PluginCall call) {
        String name = call.getString("name");
        String url = call.getString("url");
        String version = call.getString("version");

        if (name == null || url == null) {
            call.reject("name and url are required");
            return;
        }

        executor.execute(() -> {
            try {
                File toolDir = new File(toolsBasePath, name);
                if (toolDir.exists()) {
                    // Clean existing installation
                    deleteRecursive(toolDir);
                }
                toolDir.mkdirs();

                // Download the package
                URL downloadUrl = new URL(url);
                HttpURLConnection connection = (HttpURLConnection) downloadUrl.openConnection();
                connection.setConnectTimeout(30000);
                connection.setReadTimeout(60000);
                connection.connect();

                int responseCode = connection.getResponseCode();
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    call.reject("Download failed: HTTP " + responseCode);
                    return;
                }

                long totalSize = connection.getContentLength();
                long downloadedSize = 0;

                // Determine file type and extract accordingly
                String contentType = connection.getContentType();
                String fileName = name + ".zip";
                
                // Download to temp file
                File tempFile = new File(getContext().getCacheDir(), fileName);
                
                try (InputStream in = new BufferedInputStream(connection.getInputStream());
                     OutputStream out = new BufferedOutputStream(new FileOutputStream(tempFile))) {
                    
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                        downloadedSize += bytesRead;
                    }
                }

                // Extract based on file type
                boolean extracted = false;
                if (url.endsWith(".zip") || url.endsWith(".tar.gz") || contentType.contains("zip")) {
                    extracted = extractArchive(tempFile, toolDir);
                } else {
                    // Single executable - just copy
                    File exeFile = new File(toolDir, name);
                    tempFile.renameTo(exeFile);
                    exeFile.setExecutable(true, false);
                    extracted = true;
                }

                // Clean temp file
                tempFile.delete();

                if (!extracted) {
                    call.reject("Failed to extract package");
                    return;
                }

                // Update tool info
                ToolInfo info = new ToolInfo();
                info.name = name;
                info.version = version;
                info.path = toolDir.getAbsolutePath();
                info.size = calculateDirSize(toolDir);
                info.installedAt = System.currentTimeMillis();
                installedTools.put(name, info);

                // Save metadata
                saveInstalledTools();

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("path", toolDir.getAbsolutePath());
                result.put("message", name + " " + version + " installed successfully");
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Installation failed: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void uninstallTool(PluginCall call) {
        String name = call.getString("name");
        
        if (name == null) {
            call.reject("name is required");
            return;
        }

        executor.execute(() -> {
            try {
                File toolDir = new File(toolsBasePath, name);
                if (toolDir.exists()) {
                    deleteRecursive(toolDir);
                    installedTools.remove(name);
                    saveInstalledTools();
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", name + " uninstalled");
                    call.resolve(result);
                } else {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", name + " was not installed");
                    call.resolve(result);
                }
            } catch (Exception e) {
                call.reject("Uninstall failed: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void executeTool(PluginCall call) {
        String name = call.getString("name");
        String cwd = call.getString("cwd");
        Integer timeoutMs = call.getInt("timeoutMs", 60000);

        if (name == null) {
            call.reject("name is required");
            return;
        }

        executor.execute(() -> {
            try {
                File toolDir = new File(toolsBasePath, name);
                if (!toolDir.exists()) {
                    call.reject("Tool not installed: " + name);
                    return;
                }

                // Find executable
                File exe = findExecutable(toolDir, name);
                if (exe == null) {
                    call.reject("Executable not found for: " + name);
                    return;
                }

                // Build command - just run the tool
                ProcessBuilder pb = new ProcessBuilder();
                pb.command(exe.getAbsolutePath());
                
                if (cwd != null) {
                    File workDir = new File(cwd);
                    if (workDir.exists()) {
                        pb.directory(workDir);
                    }
                }

                // Add tool bin to PATH
                Map<String, String> env = pb.environment();
                String currentPath = env.get("PATH");
                env.put("PATH", toolDir.getAbsolutePath() + "/bin:" + (currentPath != null ? currentPath : ""));
                env.put("HOME", toolsBasePath);

                pb.redirectErrorStream(false);

                Process process = pb.start();

                // Read output in background
                StringBuilder stdout = new StringBuilder();
                StringBuilder stderr = new StringBuilder();

                ExecutorService readerExecutor = Executors.newFixedThreadPool(2);
                readerExecutor.execute(() -> {
                    try (BufferedInputStream in = new BufferedInputStream(process.getInputStream())) {
                        byte[] buffer = new byte[4096];
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            // Can't update UI from background thread
                        }
                    } catch (Exception e) {}
                });

                readerExecutor.execute(() -> {
                    try (BufferedInputStream in = new BufferedInputStream(process.getErrorStream())) {
                        byte[] buffer = new byte[4096];
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            // Can't update UI from background thread
                        }
                    } catch (Exception e) {}
                });

                // Wait for completion
                boolean finished = process.waitFor(timeoutMs, java.util.concurrent.TimeUnit.MILLISECONDS);
                
                if (!finished) {
                    process.destroyForcibly();
                    readerExecutor.shutdownNow();
                    call.reject("Execution timed out");
                    return;
                }

                readerExecutor.shutdown();

                // Read collected output
                JSObject result = new JSObject();
                result.put("stdout", stdout.toString());
                result.put("stderr", stderr.toString());
                result.put("exitCode", process.exitValue());
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Execution failed: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void getEnv(PluginCall call) {
        JSObject result = new JSObject();
        result.put("PATH", System.getenv("PATH"));
        result.put("HOME", System.getProperty("user.home"));
        call.resolve(result);
    }

    private boolean extractArchive(File archive, File destDir) {
        try {
            destDir.mkdirs();
            
            if (archive.getName().endsWith(".zip")) {
                return extractZip(archive, destDir);
            } else if (archive.getName().endsWith(".tar.gz") || archive.getName().endsWith(".tgz")) {
                // For tar.gz, we need apache commons or similar
                // For now, try as zip
                return extractZip(archive, destDir);
            }
            
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private boolean extractZip(File zipFile, File destDir) {
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                File newFile = newFile(destDir, entry);
                
                if (entry.isDirectory()) {
                    newFile.mkdirs();
                } else {
                    // Ensure parent directories exist
                    new File(newFile.getParent()).mkdirs();
                    
                    try (FileOutputStream fos = new FileOutputStream(newFile)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
                zis.closeEntry();
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private File newFile(File destDir, ZipEntry entry) throws Exception {
        File destFile = new File(destDir, entry.getName());
        String destDirPath = destDir.getCanonicalPath();
        String destFilePath = destFile.getCanonicalPath();
        
        if (!destFilePath.startsWith(destDirPath)) {
            throw new Exception("Entry outside target dir: " + entry.getName());
        }
        
        return destFile;
    }

    private File findExecutable(File baseDir, String name) {
        // Check in base directory
        File exe = new File(baseDir, name);
        if (exe.exists() && exe.canExecute()) {
            return exe;
        }
        
        // Check in bin subdirectory
        File binDir = new File(baseDir, "bin");
        if (binDir.exists() && binDir.isDirectory()) {
            File binExe = new File(binDir, name);
            if (binExe.exists() && binExe.canExecute()) {
                return binExe;
            }
        }
        
        // Check all executables in base dir
        File[] files = baseDir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.canExecute() && !f.isDirectory()) {
                    return f;
                }
            }
        }
        
        return null;
    }

    private void deleteRecursive(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        file.delete();
    }

    private void saveInstalledTools() {
        // Simple text-based storage for now
        // In production, use SharedPreferences or JSON file
    }

    public void destroy() {
        executor.shutdown();
    }
}
