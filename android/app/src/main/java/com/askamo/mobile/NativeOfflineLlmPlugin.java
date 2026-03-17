package com.askamo.mobile;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeOfflineLlm")
public class NativeOfflineLlmPlugin extends Plugin {
    private static final String TAG = "NativeOfflineLlm";
    private static final String ACTIVE_MODEL_FILE = "active-model.json";
    private static final long MIN_EXPECTED_GGUF_BYTES = 32L * 1024L * 1024L;
    private static final String[] BLOCKED_MODEL_PATTERNS = {
        "tiny-moe",
        "tinymoe",
        "gptq",
        "mlx",
        ".f16",
        "bf16",
        "q8_0",
        "q8-0",
        "q8.gguf"
    };

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        ensureDirectories();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        executor.execute(() -> {
            try {
                call.resolve(buildStatus());
            } catch (Exception exception) {
                call.reject("Failed to read native offline runtime status", exception);
            }
        });
    }

    @PluginMethod
    public void prepareRuntime(PluginCall call) {
        executor.execute(() -> {
            JSObject result = new JSObject();
            result.put("ready", NativeOfflineLlmRuntime.isRuntimeReady());
            result.put("backend", NativeOfflineLlmRuntime.getBackendName());
            result.put("message", NativeOfflineLlmRuntime.prepareRuntime(
                getRootDirectory().getAbsolutePath(),
                getImportsDirectory().getAbsolutePath()
            ));
            call.resolve(result);
        });
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String relativePath = call.getString("relativePath");
        String templateHint = call.getString("templateHint", "generic");
        String mmprojRelativePath = call.getString("mmprojRelativePath", null);

        if (relativePath == null || relativePath.trim().isEmpty()) {
            call.reject("relativePath is required");
            return;
        }

        executor.execute(() -> {
            try {
                File modelFile = requireImportedModel(relativePath);
                String normalizedTemplateHint = normalizeTemplateHint(templateHint, modelFile.getName());
                writeActiveModel(modelFile.getName(), stripExtension(modelFile.getName()), normalizedTemplateHint);
                String mmprojPath = null;
                if (mmprojRelativePath != null && !mmprojRelativePath.trim().isEmpty()) {
                    File mmprojFile = requireImportedModel(mmprojRelativePath);
                    mmprojPath = mmprojFile.getAbsolutePath();
                }
                String message = NativeOfflineLlmRuntime.loadModel(modelFile.getAbsolutePath(), normalizedTemplateHint, mmprojPath);

                JSObject result = new JSObject();
                result.put("message", message);
                result.put("status", buildStatus());
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Failed to load native offline model", exception);
            }
        });
    }

    @PluginMethod
    public void unloadModel(PluginCall call) {
        executor.execute(() -> {
            try {
                String message = NativeOfflineLlmRuntime.unloadModel();
                JSObject result = new JSObject();
                result.put("message", message);
                result.put("status", buildStatus());
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Failed to unload native offline model", exception);
            }
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            call.reject("prompt is required");
            return;
        }

        executor.execute(() -> {
            try {
                Log.d(TAG, "generate:start promptChars=" + prompt.length());
                String output = NativeOfflineLlmRuntime.generate(prompt);
                Log.d(TAG, "generate:done outputChars=" + (output != null ? output.length() : 0));
                JSObject result = new JSObject();
                result.put("text", output);
                result.put("status", buildStatus());
                call.resolve(result);
            } catch (Exception exception) {
                Log.e(TAG, "generate:error", exception);
                call.reject("Failed to run native offline generate", exception);
            }
        });
    }

    @PluginMethod
    public void pickModelFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "handlePickModelFile");
    }

    @ActivityCallback
    private void handlePickModelFile(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Model selection was cancelled");
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("Model selection was cancelled");
            return;
        }

        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException ignored) {
        }

        String displayName = getDisplayName(uri);
        String effectiveName = displayName != null && !displayName.trim().isEmpty() ? displayName : String.valueOf(uri);
        String compatibilityError = getModelCompatibilityError(effectiveName);
        boolean valid = compatibilityError == null;

        JSObject response = new JSObject();
        response.put("sourceUri", uri.toString());
        response.put("displayName", effectiveName);
        response.put("valid", valid);
        response.put("templateHint", normalizeTemplateHint(null, effectiveName));
        if (!valid) {
            response.put("error", compatibilityError);
        }
        call.resolve(response);
    }

    @PluginMethod
    public void importModel(PluginCall call) {
        String sourceUri = call.getString("sourceUri");
        String displayName = call.getString("displayName");
        String templateHint = call.getString("templateHint", "generic");
        boolean activate = call.getBoolean("activate", false);

        if (sourceUri == null || sourceUri.trim().isEmpty()) {
            call.reject("sourceUri is required");
            return;
        }

        executor.execute(() -> {
            try {
                JSObject importedModel = importModelFromUri(Uri.parse(sourceUri), displayName, templateHint, activate);
                JSObject result = new JSObject();
                result.put("importedModel", importedModel);
                result.put("status", buildStatus());
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Failed to import native offline model", exception);
            }
        });
    }

    @PluginMethod
    public void removeModel(PluginCall call) {
        String relativePath = call.getString("relativePath");
        if (relativePath == null || relativePath.trim().isEmpty()) {
            call.reject("relativePath is required");
            return;
        }

        executor.execute(() -> {
            try {
                File target = requireImportedModel(relativePath);
                JSObject activeModel = readActiveModel();
                if (!target.delete()) {
                    call.reject("Failed to remove model file");
                    return;
                }

                if (activeModel != null && target.getName().equals(activeModel.optString("relativePath"))) {
                    clearActiveModelSelection();
                    NativeOfflineLlmRuntime.unloadModel();
                }

                call.resolve(buildStatus());
            } catch (Exception exception) {
                call.reject("Failed to remove native offline model", exception);
            }
        });
    }

    @PluginMethod
    public void setActiveModel(PluginCall call) {
        String relativePath = call.getString("relativePath");
        String displayName = call.getString("displayName", relativePath);
        String templateHint = call.getString("templateHint", "generic");

        if (relativePath == null || relativePath.trim().isEmpty()) {
            call.reject("relativePath is required");
            return;
        }

        executor.execute(() -> {
            try {
                File modelFile = requireImportedModel(relativePath);
                writeActiveModel(
                    modelFile.getName(),
                    normalizeDisplayName(displayName, modelFile.getName()),
                    normalizeTemplateHint(templateHint, modelFile.getName())
                );
                NativeOfflineLlmRuntime.unloadModel();
                call.resolve(buildStatus());
            } catch (Exception exception) {
                call.reject("Failed to set active native model", exception);
            }
        });
    }

    @PluginMethod
    public void clearActiveModel(PluginCall call) {
        executor.execute(() -> {
            try {
                clearActiveModelSelection();
                NativeOfflineLlmRuntime.unloadModel();
                call.resolve(buildStatus());
            } catch (Exception exception) {
                call.reject("Failed to clear active native model", exception);
            }
        });
    }

    @PluginMethod
    public void getPaths(PluginCall call) {
        JSObject result = new JSObject();
        result.put("root", getRootDirectory().getAbsolutePath());
        result.put("imports", getImportsDirectory().getAbsolutePath());
        result.put("activeModelFile", new File(getRootDirectory(), ACTIVE_MODEL_FILE).getAbsolutePath());
        call.resolve(result);
    }

    @PluginMethod
    public void getDownloadAuthStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("hfTokenConfigured", hasHfToken());
        result.put("message", hasHfToken()
            ? "Hugging Face token is available in the Android build."
            : "No Hugging Face token is configured in android/local.properties.");
        call.resolve(result);
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String sourceUrl = call.getString("sourceUrl");
        String displayName = call.getString("displayName");
        String templateHint = call.getString("templateHint", "generic");
        boolean activate = call.getBoolean("activate", true);

        if (sourceUrl == null || sourceUrl.trim().isEmpty()) {
            call.reject("sourceUrl is required");
            return;
        }

        executor.execute(() -> {
            File target = null;
            try {
                ensureDirectories();
                DownloadedModel downloaded = downloadModelFromUrl(sourceUrl, displayName, templateHint);
                target = downloaded.file;

                JSObject imported = new JSObject();
                imported.put("relativePath", target.getName());
                imported.put("displayName", stripExtension(target.getName()));
                imported.put("templateHint", downloaded.templateHint);
                imported.put("sizeBytes", target.length());

                if (activate) {
                    writeActiveModel(target.getName(), stripExtension(target.getName()), downloaded.templateHint);
                    NativeOfflineLlmRuntime.unloadModel();
                }

                JSObject result = new JSObject();
                result.put("importedModel", imported);
                result.put("status", buildStatus());
                result.put("message", "Native offline model downloaded successfully.");
                call.resolve(result);
            } catch (Exception exception) {
                if (target != null && target.exists() && target.length() <= 0) {
                    target.delete();
                }
                String message = exception.getMessage() == null || exception.getMessage().trim().isEmpty()
                    ? "Failed to download native offline model"
                    : exception.getMessage().trim();
                call.reject(message, exception);
            }
        });
    }

    private JSObject buildStatus() throws IOException, JSONException {
        JSObject activeSelection = readActiveModel();
        String activeRelativePath = activeSelection == null ? null : activeSelection.optString("relativePath", null);
        JSArray availableModels = listImportedModels(activeRelativePath, activeSelection);
        JSObject activeModel = findActiveModel(availableModels);

        String loadedModelPath = NativeOfflineLlmRuntime.getLoadedModelPath();
        if ((loadedModelPath == null || loadedModelPath.trim().isEmpty()) && activeModel != null) {
            File activeFile = new File(getImportsDirectory(), activeModel.optString("relativePath", ""));
            if (activeFile.exists()) {
                loadedModelPath = activeFile.getAbsolutePath();
            }
        }

        JSObject result = new JSObject();
        result.put("backend", NativeOfflineLlmRuntime.getBackendName());
        result.put("runtimeMode", NativeOfflineLlmRuntime.getRuntimeMode());
        result.put("scaffold", false);
        result.put("runtimeReady", NativeOfflineLlmRuntime.isRuntimeReady());
        result.put("message", buildRuntimeMessage(activeModel));
        result.put("modelLoaded", NativeOfflineLlmRuntime.isModelLoaded());
        result.put("loadedModelPath", loadedModelPath);
        result.put("availableModels", availableModels);
        result.put("activeModel", activeModel);
        return result;
    }

    private String buildRuntimeMessage(JSObject activeModel) {
        String baseMessage = NativeOfflineLlmRuntime.getRuntimeMessage();
        if (activeModel == null || NativeOfflineLlmRuntime.isModelLoaded()) {
            return baseMessage;
        }

        return baseMessage + " Active GGUF is configured in app storage but is not loaded into the native runtime yet.";
    }

    private JSObject importModelFromUri(Uri uri, String displayName, String templateHint, boolean activate) throws IOException, JSONException {
        ContentResolver resolver = getContext().getContentResolver();
        String resolvedName = displayName;
        if (resolvedName == null || resolvedName.trim().isEmpty()) {
            resolvedName = getDisplayName(uri);
        }
        if (resolvedName == null || resolvedName.trim().isEmpty()) {
            throw new IOException("Unable to resolve selected model name");
        }

        String safeName = toSafeModelFileName(resolvedName);
        if (!isSupportedModelName(safeName)) {
            throw new IOException("Incorrect file format");
        }

        File target = new File(getImportsDirectory(), safeName);
        if (target.exists()) {
            throw new IOException("A model with that name already exists");
        }

        try (InputStream inputStream = resolver.openInputStream(uri);
             OutputStream outputStream = new FileOutputStream(target, false)) {
            if (inputStream == null) {
                throw new IOException("Unable to open selected model file");
            }

            copyStream(inputStream, outputStream);
        }

        if (!target.exists() || target.length() <= 0) {
            if (target.exists()) {
                target.delete();
            }
            throw new IOException("Imported model file was empty");
        }

        String normalizedTemplateHint = normalizeTemplateHint(templateHint, target.getName());
        JSObject imported = new JSObject();
        imported.put("relativePath", target.getName());
        imported.put("displayName", stripExtension(target.getName()));
        imported.put("templateHint", normalizedTemplateHint);
        imported.put("sizeBytes", target.length());

        if (activate) {
            writeActiveModel(target.getName(), stripExtension(target.getName()), normalizedTemplateHint);
            NativeOfflineLlmRuntime.unloadModel();
        }

        return imported;
    }

    private JSArray listImportedModels(String activeRelativePath, JSObject activeSelection) throws JSONException {
        JSArray models = new JSArray();
        File[] files = getImportsDirectory().listFiles();

        if (files == null) {
            return models;
        }

        Arrays.sort(files, (left, right) -> left.getName().compareToIgnoreCase(right.getName()));
        for (File file : files) {
            if (!file.isFile() || !file.getName().toLowerCase().endsWith(".gguf")) {
                continue;
            }

            boolean isActive = activeRelativePath != null && activeRelativePath.equals(file.getName());
            JSObject item = new JSObject();
            item.put("relativePath", file.getName());
            item.put("displayName", stripExtension(file.getName()));
            item.put("sizeBytes", file.length());
            item.put("templateHint", isActive && activeSelection != null
                ? activeSelection.optString("templateHint", guessTemplateHint(file.getName()))
                : guessTemplateHint(file.getName()));
            item.put("active", isActive);
            models.put(item);
        }

        return models;
    }

    private JSObject findActiveModel(JSArray models) {
        for (int index = 0; index < models.length(); index += 1) {
            Object raw = models.opt(index);
            if (!(raw instanceof JSONObject)) {
                continue;
            }

            JSONObject object = (JSONObject) raw;
            if (!object.optBoolean("active", false)) {
                continue;
            }

            JSObject active = new JSObject();
            active.put("relativePath", object.optString("relativePath", null));
            active.put("displayName", object.optString("displayName", null));
            active.put("templateHint", object.optString("templateHint", null));
            active.put("sizeBytes", object.optLong("sizeBytes", 0));
            return active;
        }

        return null;
    }

    private JSObject readActiveModel() throws IOException, JSONException {
        File activeFile = new File(getRootDirectory(), ACTIVE_MODEL_FILE);
        if (!activeFile.exists()) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(activeFile), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }

        JSONObject object = new JSONObject(builder.toString());
        String relativePath = object.optString("relativePath", null);
        if (relativePath == null || relativePath.trim().isEmpty()) {
            return null;
        }

        File modelFile = new File(getImportsDirectory(), relativePath);
        if (!modelFile.exists()) {
            return null;
        }

        JSObject active = new JSObject();
        active.put("relativePath", modelFile.getName());
        active.put("displayName", normalizeDisplayName(object.optString("displayName", null), modelFile.getName()));
        active.put("templateHint", normalizeTemplateHint(object.optString("templateHint", null), modelFile.getName()));
        active.put("sizeBytes", modelFile.length());
        return active;
    }

    private void writeActiveModel(String relativePath, String displayName, String templateHint) throws IOException, JSONException {
        JSONObject object = new JSONObject();
        object.put("relativePath", relativePath);
        object.put("displayName", displayName);
        object.put("templateHint", templateHint);

        File activeFile = new File(getRootDirectory(), ACTIVE_MODEL_FILE);
        try (FileOutputStream outputStream = new FileOutputStream(activeFile, false)) {
            outputStream.write(object.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    private void clearActiveModelSelection() {
        File activeFile = new File(getRootDirectory(), ACTIVE_MODEL_FILE);
        if (activeFile.exists()) {
            activeFile.delete();
        }
    }

    private void ensureDirectories() {
        File root = getRootDirectory();
        if (!root.exists()) {
            root.mkdirs();
        }

        File imports = getImportsDirectory();
        if (!imports.exists()) {
            imports.mkdirs();
        }
    }

    private File getRootDirectory() {
        return new File(getContext().getNoBackupFilesDir(), "models/native-offline-llm");
    }

    private File getImportsDirectory() {
        return new File(getRootDirectory(), "imports");
    }

    private File requireImportedModel(String relativePath) throws IOException {
        File modelFile = new File(getImportsDirectory(), relativePath);
        if (!modelFile.exists() || !modelFile.isFile() || !modelFile.getName().toLowerCase().endsWith(".gguf")) {
            throw new IOException("Model file does not exist in native imports directory");
        }
        return modelFile;
    }

    private DownloadedModel downloadModelFromUrl(String sourceUrl, String displayName, String templateHint) throws IOException {
        HttpURLConnection connection = null;
        InputStream inputStream = null;
        FileOutputStream outputStream = null;

        try {
            URL url = new URL(sourceUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(300000);
            connection.setRequestProperty("Accept", "application/octet-stream");

            if (isHuggingFaceUrl(url) && hasHfToken()) {
                connection.setRequestProperty("Authorization", "Bearer " + BuildConfig.HF_TOKEN);
            }

            int statusCode = connection.getResponseCode();
            if (statusCode < 200 || statusCode >= 300) {
                String errorBody = readErrorBody(connection);
                throw new IOException("Download failed with HTTP " + statusCode + (errorBody.isEmpty() ? "" : ": " + errorBody));
            }

            String resolvedName = displayName;
            if (resolvedName == null || resolvedName.trim().isEmpty()) {
                resolvedName = resolveFileName(connection, url);
            }

            String safeName = toSafeModelFileName(resolvedName);
            String compatibilityError = getModelCompatibilityError(safeName);
            if (compatibilityError != null) {
                throw new IOException(compatibilityError);
            }

            File target = new File(getImportsDirectory(), safeName);
            if (target.exists()) {
                throw new IOException("A model with that name already exists");
            }

            inputStream = connection.getInputStream();
            outputStream = new FileOutputStream(target, false);
            copyStream(inputStream, outputStream);

            if (!target.exists() || target.length() <= 0) {
                if (target.exists()) {
                    target.delete();
                }
                throw new IOException("Downloaded model file was empty");
            }

            if (target.length() < MIN_EXPECTED_GGUF_BYTES) {
                target.delete();
                throw new IOException("Downloaded file is too small to be a valid GGUF for Amo on Android. Use a real GGUF quantization such as Q2_K, Q3_K_M, Q4_0, or Q4_K_M.");
            }

            return new DownloadedModel(target, normalizeTemplateHint(templateHint, target.getName()));
        } finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (IOException ignored) {
                }
            }
            if (outputStream != null) {
                try {
                    outputStream.close();
                } catch (IOException ignored) {
                }
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String stripExtension(String value) {
        int index = value.lastIndexOf('.');
        return index > 0 ? value.substring(0, index) : value;
    }

    private boolean hasHfToken() {
        return BuildConfig.HF_TOKEN != null && !BuildConfig.HF_TOKEN.trim().isEmpty();
    }

    private boolean isHuggingFaceUrl(URL url) {
        String host = url.getHost();
        return host != null && host.toLowerCase().contains("huggingface.co");
    }

    private String readErrorBody(HttpURLConnection connection) throws IOException {
        InputStream errorStream = connection.getErrorStream();
        if (errorStream == null) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(errorStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString().trim();
    }

    private String resolveFileName(HttpURLConnection connection, URL url) throws IOException {
        String contentDisposition = connection.getHeaderField("Content-Disposition");
        if (contentDisposition != null) {
            String[] segments = contentDisposition.split(";");
            for (String segment : segments) {
                String trimmed = segment.trim();
                if (trimmed.startsWith("filename=")) {
                    String value = trimmed.substring("filename=".length()).replace("\"", "").trim();
                    if (!value.isEmpty()) {
                        return value;
                    }
                }
            }
        }

        String path = url.getPath();
        if (path != null && !path.trim().isEmpty()) {
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                return path.substring(lastSlash + 1);
            }
        }

        throw new IOException("Unable to resolve downloaded model name");
    }

    private String sanitizeFileStem(String value) {
        String sanitized = value == null ? "" : value.replaceAll("[^A-Za-z0-9._-]", "-");
        sanitized = sanitized.replaceAll("-{2,}", "-");
        sanitized = sanitized.replaceAll("^[.-]+", "").replaceAll("[.-]+$", "");
        return sanitized;
    }

    private String toSafeModelFileName(String value) throws IOException {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new IOException("Unable to resolve selected model name");
        }

        String withoutExtension = trimmed.replaceAll("(?i)\\.gguf$", "");
        String stem = sanitizeFileStem(withoutExtension);
        if (stem.isEmpty()) {
            throw new IOException("Unable to resolve selected model name");
        }
        return stem + ".gguf";
    }

    private String normalizeDisplayName(String displayName, String fallbackFileName) {
        String candidate = displayName == null ? "" : displayName.trim();
        if (candidate.isEmpty()) {
            return stripExtension(fallbackFileName);
        }
        return stripExtension(candidate);
    }

    private String getDisplayName(Uri uri) {
        Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null);
        if (cursor == null) {
            return null;
        }

        try {
            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            if (nameIndex == -1 || !cursor.moveToFirst()) {
                return null;
            }

            return cursor.getString(nameIndex);
        } finally {
            cursor.close();
        }
    }

    private void copyStream(InputStream inputStream, OutputStream outputStream) throws IOException {
        byte[] buffer = new byte[262144];
        int read;
        long totalBytes = 0;
        while ((read = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, read);
            totalBytes += read;
        }
        outputStream.flush();
        if (totalBytes <= 0) {
            throw new IOException("Imported model file was empty");
        }
    }

    private boolean isSupportedModelName(String name) {
        return getModelCompatibilityError(name) == null;
    }

    private String getModelCompatibilityError(String name) {
        if (name == null) {
            return "Incorrect file format";
        }

        String lower = name.toLowerCase();
        if (!lower.endsWith(".gguf")) {
            return "Incorrect file format";
        }

        for (String blockedPattern : BLOCKED_MODEL_PATTERNS) {
            if (lower.contains(blockedPattern)) {
                return "This model format is not suitable for Amo on Android. Use a real GGUF instruct quantization. Prefer Qwen2.5 0.5B in Q2_K or Q3_K_M on this phone, or use Qwen3 0.6B, Gemma 3 1B, or Llama 3.2 1B in small instruct quantization.";
            }
        }

        return null;
    }

    private String normalizeTemplateHint(String templateHint, String fallbackName) {
        String candidate = templateHint == null ? "" : templateHint.trim().toLowerCase();
        switch (candidate) {
            case "llama":
            case "qwen":
            case "gemma":
            case "smollm":
            case "generic":
                return candidate;
            default:
                return guessTemplateHint(fallbackName);
        }
    }

    private String guessTemplateHint(String name) {
        String lower = name == null ? "" : name.toLowerCase();
        if (lower.contains("llama")) return "llama";
        if (lower.contains("qwen")) return "qwen";
        if (lower.contains("gemma")) return "gemma";
        if (lower.contains("smollm")) return "smollm";
        return "generic";
    }

    private static final class DownloadedModel {
        final File file;
        final String templateHint;

        DownloadedModel(File file, String templateHint) {
            this.file = file;
            this.templateHint = templateHint;
        }
    }
}
