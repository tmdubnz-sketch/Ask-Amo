package com.askamo.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "NativeTerminal")
public class NativeTerminalPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Map<String, String> sessionCwds = new ConcurrentHashMap<>();

    @PluginMethod
    public void exec(PluginCall call) {
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
                    resolvedCwd = sessionCwds.getOrDefault(sessionId, getContext().getFilesDir().getAbsolutePath());
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
                String nextCwd = resolvedCwd;
                String cleanOutput = rawOutput;

                int markerIndex = rawOutput.lastIndexOf(marker);
                if (markerIndex >= 0) {
                    nextCwd = rawOutput.substring(markerIndex + marker.length()).trim();
                    cleanOutput = rawOutput.substring(0, markerIndex).trim();
                }

                sessionCwds.put(sessionId, nextCwd);

                JSObject result = new JSObject();
                result.put("command", command);
                result.put("output", cleanOutput);
                result.put("exitCode", exitCode);
                result.put("cwd", nextCwd);
                result.put("sessionId", sessionId);
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Failed to execute terminal command", exception);
            }
        });
    }
}
