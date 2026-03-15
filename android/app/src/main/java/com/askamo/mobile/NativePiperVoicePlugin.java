package com.askamo.mobile;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

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
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativePiperVoice")
public class NativePiperVoicePlugin extends Plugin {
    private static final String ACTIVE_VOICE_FILE = "active-voice.json";

    @Override
    public void load() {
        ensureDirectories();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            call.resolve(buildStatus());
        } catch (Exception exception) {
            call.reject("Failed to read Piper voice status", exception);
        }
    }

    @PluginMethod
    public void getPaths(PluginCall call) {
        JSObject result = new JSObject();
        result.put("root", getRootDirectory().getAbsolutePath());
        result.put("voices", getVoicesDirectory().getAbsolutePath());
        result.put("activeVoiceFile", new File(getRootDirectory(), ACTIVE_VOICE_FILE).getAbsolutePath());
        call.resolve(result);
    }

    @PluginMethod
    public void pickVoiceFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(call, intent, "handlePickVoiceFile");
    }

    @ActivityCallback
    private void handlePickVoiceFile(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Voice selection was cancelled");
            return;
        }

        Uri uri = result.getData().getData();
        String displayName = getDisplayName(uri);
        String safeName = displayName == null ? "amo-voice.onnx" : displayName;

        JSObject response = new JSObject();
        response.put("sourceUri", uri.toString());
        response.put("displayName", safeName);
        response.put("valid", isSupportedVoiceFile(safeName));
        response.put("kind", getVoiceFileKind(safeName));
        call.resolve(response);
    }

    @PluginMethod
    public void importVoiceFile(PluginCall call) {
        String sourceUri = call.getString("sourceUri");
        String displayName = call.getString("displayName", "amo-voice.onnx");

        if (sourceUri == null || sourceUri.trim().isEmpty()) {
            call.reject("sourceUri is required");
            return;
        }

        try {
            JSObject importedVoice = importVoiceFromUri(Uri.parse(sourceUri), displayName);
            JSObject result = new JSObject();
            result.put("importedVoice", importedVoice);
            result.put("status", buildStatus());
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Failed to import Piper voice file", exception);
        }
    }

    @PluginMethod
    public void setActiveVoice(PluginCall call) {
        String voiceId = call.getString("voiceId");
        String displayName = call.getString("displayName", voiceId);

        if (voiceId == null || voiceId.trim().isEmpty()) {
            call.reject("voiceId is required");
            return;
        }

        try {
            JSObject voicePack = findVoicePackById(voiceId);
            if (voicePack == null) {
                call.reject("Voice pack does not exist in Piper storage");
                return;
            }

            if (!voicePack.getBool("ready")) {
                call.reject("Voice pack is missing required Piper files");
                return;
            }

            writeActiveVoice(voiceId, displayName);
            call.resolve(buildStatus());
        } catch (Exception exception) {
            call.reject("Failed to set active Piper voice", exception);
        }
    }

    @PluginMethod
    public void removeVoice(PluginCall call) {
        String voiceId = call.getString("voiceId");
        if (voiceId == null || voiceId.trim().isEmpty()) {
            call.reject("voiceId is required");
            return;
        }

        File[] files = getVoicesDirectory().listFiles();
        if (files == null) {
            call.reject("Voice pack does not exist");
            return;
        }

        JSObject activeVoice = null;
        try {
            activeVoice = readActiveVoice();
        } catch (Exception ignored) {
        }

        boolean removedAny = false;
        for (File file : files) {
            if (!file.isFile() || !isSupportedVoiceFile(file.getName())) {
                continue;
            }

            if (!getVoiceId(file.getName()).equals(voiceId)) {
                continue;
            }

            if (!file.delete()) {
                call.reject("Failed to remove Piper voice file");
                return;
            }
            removedAny = true;
        }

        if (!removedAny) {
            call.reject("Voice pack does not exist");
            return;
        }

        File activeFile = new File(getRootDirectory(), ACTIVE_VOICE_FILE);
        if (activeVoice != null && voiceId.equals(activeVoice.optString("voiceId")) && activeFile.exists()) {
            activeFile.delete();
        }

        try {
            call.resolve(buildStatus());
        } catch (Exception exception) {
            call.reject("Failed to refresh Piper voice status", exception);
        }
    }

    @PluginMethod
    public void prepareRuntime(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", false);
        result.put("backend", "piper-scaffold");
        result.put("message", "Piper voice packs can be imported and validated here. Native synthesis binding is still not wired.");
        call.resolve(result);
    }

    private JSObject buildStatus() throws IOException, JSONException {
        JSArray voicePacks = listVoicePacks();
        JSObject activeVoice = readActiveVoice();
        if (activeVoice != null) {
            JSObject matchingPack = findVoicePackById(activeVoice.optString("voiceId"));
            if (matchingPack == null) {
                activeVoice = null;
            } else {
                activeVoice = matchingPack;
            }
        }

        JSObject result = new JSObject();
        result.put("backend", "piper-scaffold");
        result.put("runtimeReady", false);
        result.put("message", "Piper voice packs can be stored and validated here. Native synthesis is not wired yet.");
        result.put("availableVoices", voicePacks);
        result.put("activeVoice", activeVoice);
        return result;
    }

    private JSArray listVoicePacks() throws JSONException {
        JSArray voices = new JSArray();
        File[] files = getVoicesDirectory().listFiles();
        if (files == null) {
            return voices;
        }

        java.util.LinkedHashMap<String, java.util.ArrayList<File>> groupedFiles = new java.util.LinkedHashMap<>();
        for (File file : files) {
            if (!file.isFile() || !isSupportedVoiceFile(file.getName())) {
                continue;
            }

            String voiceId = getVoiceId(file.getName());
            if (!groupedFiles.containsKey(voiceId)) {
                groupedFiles.put(voiceId, new java.util.ArrayList<>());
            }
            groupedFiles.get(voiceId).add(file);
        }

        for (java.util.Map.Entry<String, java.util.ArrayList<File>> entry : groupedFiles.entrySet()) {
            JSObject item = buildVoicePack(entry.getKey(), entry.getValue());
            voices.put(item);
        }

        return voices;
    }

    private JSObject readActiveVoice() throws IOException, JSONException {
        File activeFile = new File(getRootDirectory(), ACTIVE_VOICE_FILE);
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
        JSObject active = new JSObject();
        active.put("voiceId", object.optString("voiceId"));
        active.put("displayName", object.optString("displayName"));
        return active;
    }

    private void writeActiveVoice(String voiceId, String displayName) throws IOException, JSONException {
        JSONObject object = new JSONObject();
        object.put("voiceId", voiceId);
        object.put("displayName", displayName);

        File activeFile = new File(getRootDirectory(), ACTIVE_VOICE_FILE);
        try (FileOutputStream outputStream = new FileOutputStream(activeFile, false)) {
            outputStream.write(object.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    private JSObject importVoiceFromUri(Uri uri, String displayName) throws IOException, JSONException {
        ContentResolver resolver = getContext().getContentResolver();
        String safeName = sanitizeFileName(displayName);
        if (!isSupportedVoiceFile(safeName)) {
            throw new IOException("Incorrect voice file format");
        }

        File target = new File(getVoicesDirectory(), safeName);
        try (InputStream inputStream = resolver.openInputStream(uri);
             OutputStream outputStream = new FileOutputStream(target, false)) {
            if (inputStream == null) {
                throw new IOException("Unable to open selected voice file");
            }
            copyStream(inputStream, outputStream);
        }

        JSObject imported = buildVoicePack(getVoiceId(target.getName()), getFilesForVoiceId(getVoiceId(target.getName())));
        return imported;
    }

    private void ensureDirectories() {
        File root = getRootDirectory();
        if (!root.exists()) {
            root.mkdirs();
        }

        File voices = getVoicesDirectory();
        if (!voices.exists()) {
            voices.mkdirs();
        }
    }

    private File getRootDirectory() {
        return new File(getContext().getNoBackupFilesDir(), "voices/native-piper");
    }

    private File getVoicesDirectory() {
        return new File(getRootDirectory(), "imports");
    }

    private boolean isSupportedVoiceFile(String value) {
        String lower = value.toLowerCase();
        return lower.endsWith(".onnx") || lower.endsWith(".json") || lower.endsWith(".bin");
    }

    private String getVoiceFileKind(String value) {
        String lower = value.toLowerCase();
        if (lower.endsWith(".onnx")) return "model";
        if (lower.endsWith(".json")) return "config";
        if (lower.endsWith(".bin")) return "data";
        return "unknown";
    }

    private String getVoiceId(String value) {
        return stripExtension(value);
    }

    private JSObject findVoicePackById(String voiceId) throws JSONException {
        java.util.ArrayList<File> files = getFilesForVoiceId(voiceId);
        if (files.isEmpty()) {
            return null;
        }

        return buildVoicePack(voiceId, files);
    }

    private java.util.ArrayList<File> getFilesForVoiceId(String voiceId) {
        java.util.ArrayList<File> result = new java.util.ArrayList<>();
        File[] files = getVoicesDirectory().listFiles();
        if (files == null) {
            return result;
        }

        for (File file : files) {
            if (!file.isFile() || !isSupportedVoiceFile(file.getName())) {
                continue;
            }

            if (getVoiceId(file.getName()).equals(voiceId)) {
                result.add(file);
            }
        }

        return result;
    }

    private JSObject buildVoicePack(String voiceId, java.util.ArrayList<File> files) throws JSONException {
        JSArray fileKinds = new JSArray();
        JSArray fileNames = new JSArray();
        boolean hasModel = false;
        boolean hasConfig = false;
        long totalBytes = 0L;

        for (File file : files) {
            String kind = getVoiceFileKind(file.getName());
            fileKinds.put(kind);
            fileNames.put(file.getName());
            totalBytes += file.length();

            if ("model".equals(kind)) {
                hasModel = true;
            } else if ("config".equals(kind)) {
                hasConfig = true;
            }
        }

        JSObject item = new JSObject();
        item.put("voiceId", voiceId);
        item.put("displayName", voiceId);
        item.put("ready", hasModel && hasConfig);
        item.put("fileKinds", fileKinds);
        item.put("files", fileNames);
        item.put("sizeBytes", totalBytes);
        return item;
    }

    private String sanitizeFileName(String value) {
        return value.replaceAll("[^A-Za-z0-9._-]", "-");
    }

    private String stripExtension(String value) {
        int index = value.lastIndexOf('.');
        return index > 0 ? value.substring(0, index) : value;
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
        byte[] buffer = new byte[8192];
        int read;
        while ((read = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, read);
        }
        outputStream.flush();
    }
}
