package com.askamo.mobile;

import android.os.Handler;
import android.os.Looper;
import android.util.Pair;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "NativeTerminal")
public class NativeTerminalPlugin extends Plugin {
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, SessionData> sessions = new ConcurrentHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    
    private static final int BUFFER_SIZE = 4096;
    private static final Pattern ESCAPE_PATTERN = Pattern.compile("\u001B\\[[0-9;]*[A-Za-z]");
    private static final Pattern CLEAR_PATTERN = Pattern.compile("\u001B\\[2J|\u001B\\[H");

    private static class SessionData {
        Process process;
        DataInputStream input;
        DataOutputStream output;
        String cwd;
        volatile boolean running = true;
        StringBuilder buffer = new StringBuilder();
        long lastRead = System.currentTimeMillis();
    }

    @PluginMethod
    public void createSession(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String cwd = call.getString("cwd");
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            call.reject("sessionId is required");
            return;
        }

        executor.execute(() -> {
            try {
                // Kill existing session if any
                if (sessions.containsKey(sessionId)) {
                    destroySessionInternal(sessionId);
                }

                String resolvedCwd = cwd;
                if (resolvedCwd == null || resolvedCwd.trim().isEmpty()) {
                    resolvedCwd = getContext().getFilesDir().getAbsolutePath();
                }

                File workingDir = new File(resolvedCwd);
                if (!workingDir.exists() || !workingDir.isDirectory()) {
                    workingDir = getContext().getFilesDir();
                    resolvedCwd = workingDir.getAbsolutePath();
                }

                // Use script command to create PTY, or fallback to simple shell
                ProcessBuilder pb = new ProcessBuilder();
                
                // Try to create PTY with script command (more Unix-like)
                String scriptCmd = "script -qfc '/bin/sh -i' /dev/null 2>&1";
                pb.command("/bin/sh", "-c", scriptCmd);
                pb.directory(workingDir);
                pb.environment().put("TERM", "xterm-256color");
                pb.environment().put("HOME", resolvedCwd);
                pb.redirectErrorStream(true);
                
                Process process;
                try {
                    process = pb.start();
                } catch (IOException e) {
                    // Fallback to simple shell without PTY
                    pb = new ProcessBuilder("/system/bin/sh");
                    pb.directory(workingDir);
                    pb.environment().put("TERM", "xterm-256color");
                    pb.environment().put("HOME", resolvedCwd);
                    pb.redirectErrorStream(true);
                    process = pb.start();
                }

                SessionData session = new SessionData();
                session.process = process;
                session.input = new DataInputStream(process.getInputStream());
                session.output = new DataOutputStream(process.getOutputStream());
                session.cwd = resolvedCwd;
                session.running = true;
                
                sessions.put(sessionId, session);

                // Start output reader thread
                startOutputReader(sessionId, session);

                // Send initial prompt
                Thread.sleep(100);
                String initialOutput = readAvailable(session.input);
                
                // Clean ANSI escape sequences
                initialOutput = cleanAnsi(initialOutput);

                JSObject result = new JSObject();
                result.put("sessionId", sessionId);
                result.put("cwd", resolvedCwd);
                result.put("output", initialOutput);
                result.put("success", true);
                call.resolve(result);

            } catch (Exception exception) {
                call.reject("Failed to create session: " + exception.getMessage(), exception);
            }
        });
    }

    @PluginMethod
    public void write(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String data = call.getString("data");
        
        if (sessionId == null) {
            call.reject("sessionId is required");
            return;
        }
        if (data == null) {
            call.reject("data is required");
            return;
        }

        executor.execute(() -> {
            SessionData session = sessions.get(sessionId);
            if (session == null || !session.running) {
                call.reject("Session not found or not running");
                return;
            }

            try {
                // Send input to PTY
                session.output.write(data.getBytes(StandardCharsets.UTF_8));
                session.output.flush();
                session.lastRead = System.currentTimeMillis();
                
                // Small delay to let output accumulate
                Thread.sleep(50);
                
                // Read available output
                String output = readAvailable(session.input);
                output = cleanAnsi(output);
                
                // Update CWD if we can detect it
                updateCwd(session, sessionId);

                JSObject result = new JSObject();
                result.put("sessionId", sessionId);
                result.put("output", output);
                result.put("cwd", session.cwd);
                result.put("success", true);
                call.resolve(result);

            } catch (Exception exception) {
                if (exception instanceof IOException) {
                    session.running = false;
                    call.reject("Session disconnected: " + exception.getMessage());
                } else {
                    call.reject("Write failed: " + exception.getMessage(), exception);
                }
            }
        });
    }

    @PluginMethod
    public void read(PluginCall call) {
        String sessionId = call.getString("sessionId");
        
        if (sessionId == null) {
            call.reject("sessionId is required");
            return;
        }

        executor.execute(() -> {
            SessionData session = sessions.get(sessionId);
            if (session == null) {
                call.reject("Session not found");
                return;
            }

            try {
                String output = readAvailable(session.input);
                output = cleanAnsi(output);
                
                boolean running = session.running && session.process.isAlive();
                session.running = running;
                
                JSObject result = new JSObject();
                result.put("sessionId", sessionId);
                result.put("output", output);
                result.put("cwd", session.cwd);
                result.put("running", running);
                call.resolve(result);

            } catch (Exception exception) {
                call.reject("Read failed: " + exception.getMessage(), exception);
            }
        });
    }

    @PluginMethod
    public void resize(PluginCall call) {
        String sessionId = call.getString("sessionId");
        Integer cols = call.getInt("cols", 80);
        Integer rows = call.getInt("rows", 24);
        
        // PTY resize would require JNI, so we just acknowledge
        JSObject result = new JSObject();
        result.put("sessionId", sessionId);
        result.put("cols", cols);
        result.put("rows", rows);
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void destroySession(PluginCall call) {
        String sessionId = call.getString("sessionId");
        
        if (sessionId == null) {
            call.reject("sessionId is required");
            return;
        }

        executor.execute(() -> {
            destroySessionInternal(sessionId);
            
            JSObject result = new JSObject();
            result.put("sessionId", sessionId);
            result.put("success", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void exec(PluginCall call) {
        // Legacy support - execute single command
        String command = call.getString("command");
        String sessionId = call.getString("sessionId");
        String cwd = call.getString("cwd");
        Integer timeoutMs = call.getInt("timeoutMs", 20000);

        if (command == null || command.trim().isEmpty()) {
            call.reject("command is required");
            return;
        }

        if (sessionId == null || sessionId.trim().isEmpty()) {
            call.reject("sessionId is required");
            return;
        }

        executor.execute(() -> {
            try {
                String resolvedCwd = cwd;
                if (resolvedCwd == null || resolvedCwd.trim().isEmpty()) {
                    resolvedCwd = getContext().getFilesDir().getAbsolutePath();
                }

                File workingDir = new File(resolvedCwd);
                if (!workingDir.exists() || !workingDir.isDirectory()) {
                    workingDir = getContext().getFilesDir();
                    resolvedCwd = workingDir.getAbsolutePath();
                }

                String marker = "__AMO_PWD__=";
                String shellCommand = command + "\nprintf '\n" + marker + "%s' \"$PWD\"";

                ProcessBuilder processBuilder = new ProcessBuilder("sh", "-lc", shellCommand);
                processBuilder.directory(workingDir);
                processBuilder.redirectErrorStream(true);

                Process process = processBuilder.start();

                StringBuilder outputBuilder = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        outputBuilder.append(line).append('\n');
                    }
                }

                boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    call.reject("Terminal command timed out");
                    return;
                }

                int exitCode = process.exitValue();
                String rawOutput = outputBuilder.toString();
                String cleanOutput = rawOutput;

                int markerIndex = rawOutput.lastIndexOf(marker);
                if (markerIndex >= 0) {
                    cleanOutput = rawOutput.substring(0, markerIndex).trim();
                }

                JSObject result = new JSObject();
                result.put("command", command);
                result.put("output", cleanOutput);
                result.put("exitCode", exitCode);
                result.put("cwd", resolvedCwd);
                result.put("sessionId", sessionId);
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Failed to execute terminal command", exception);
            }
        });
    }

    private void startOutputReader(final String sessionId, SessionData session) {
        executor.execute(() -> {
            try {
                while (session.running && session.process.isAlive()) {
                    String output = readAvailable(session.input);
                    if (!output.isEmpty()) {
                        output = cleanAnsi(output);
                        session.buffer.append(output);
                    }
                    
                    // Check if process exited
                    try {
                        session.process.exitValue();
                        session.running = false;
                        break;
                    } catch (IllegalThreadStateException e) {
                        // Process still running
                    }
                    
                    try {
                        Thread.sleep(20);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            } catch (Exception e) {
                session.running = false;
            }
        });
    }

    private String readAvailable(DataInputStream input) throws IOException {
        StringBuilder sb = new StringBuilder();
        
        // Check if data is available
        while (input.available() > 0) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int bytesRead = input.read(buffer);
            if (bytesRead > 0) {
                sb.append(new String(buffer, 0, bytesRead, StandardCharsets.UTF_8));
            }
            if (bytesRead < BUFFER_SIZE) break;
        }
        
        return sb.toString();
    }

    private void updateCwd(SessionData session, String sessionId) {
        // Try to detect current directory by parsing prompt
        // This is a simplified approach
        try {
            String marker = "__AMO_CWD__" + sessionId + "=";
            session.output.write(("echo '" + marker + "'$(pwd)\n").getBytes(StandardCharsets.UTF_8));
            session.output.flush();
            Thread.sleep(50);
            
            String output = readAvailable(session.input);
            int idx = output.indexOf(marker);
            if (idx >= 0) {
                int endIdx = output.indexOf("'", idx + marker.length());
                if (endIdx > idx) {
                    session.cwd = output.substring(idx + marker.length(), endIdx);
                }
            }
        } catch (Exception e) {
            // Ignore cwd detection failures
        }
    }

    private void destroySessionInternal(String sessionId) {
        SessionData session = sessions.remove(sessionId);
        if (session != null) {
            session.running = false;
            try {
                if (session.process.isAlive()) {
                    session.process.destroy();
                    try {
                        session.process.waitFor(500, TimeUnit.MILLISECONDS);
                    } catch (InterruptedException e) {
                        session.process.destroyForcibly();
                    }
                }
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    private String cleanAnsi(String input) {
        if (input == null) return "";
        String cleaned = ESCAPE_PATTERN.matcher(input).replaceAll("");
        cleaned = CLEAR_PATTERN.matcher(cleaned).replaceAll("");
        return cleaned;
    }

    @Override
    protected void handleDestroy() {
        super.handleDestroy();
        // Clean up all sessions
        for (String sessionId : sessions.keySet()) {
            destroySessionInternal(sessionId);
        }
        sessions.clear();
        executor.shutdown();
    }
}
