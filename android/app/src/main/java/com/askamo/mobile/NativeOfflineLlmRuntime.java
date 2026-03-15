package com.askamo.mobile;

public final class NativeOfflineLlmRuntime {
    private static final String RUNTIME_MODE = "native";
    private static boolean libraryLoaded = false;
    private static String loadError = null;
    private static boolean modelLoaded = false;
    private static String loadedModelPath = null;

    static {
        try {
            System.loadLibrary("native_offline_llama");
            libraryLoaded = true;
        } catch (UnsatisfiedLinkError error) {
            loadError = error.getMessage();
        } catch (SecurityException error) {
            loadError = error.getMessage();
        }
    }

    private NativeOfflineLlmRuntime() {
    }

    public static boolean isLibraryLoaded() {
        return libraryLoaded;
    }

    public static String getLoadError() {
        return loadError;
    }

    public static String getBackendName() {
        if (!libraryLoaded) {
            return "llama.cpp-jni-unavailable";
        }

        return nativeGetBackendName();
    }

    public static String getRuntimeMode() {
        return RUNTIME_MODE;
    }

    public static boolean isRuntimeReady() {
        return libraryLoaded;
    }

    public static boolean isModelLoaded() {
        return libraryLoaded && modelLoaded;
    }

    public static String getLoadedModelPath() {
        return loadedModelPath;
    }

    public static String prepareRuntime(String modelsRoot, String importsRoot) {
        if (!libraryLoaded) {
            return "Native JNI library not loaded yet. Build ships the scaffold only.";
        }

        return nativePrepareRuntime(modelsRoot, importsRoot);
    }

    public static String getRuntimeMessage() {
        if (!libraryLoaded) {
            return loadError == null
                ? "Native offline JNI scaffold is not loaded yet."
                : "Native offline JNI scaffold failed to load: " + loadError;
        }

        return nativeGetRuntimeMessage();
    }

    public static String loadModel(String modelPath, String templateHint) {
        if (!libraryLoaded) {
            modelLoaded = false;
            loadedModelPath = modelPath;
            return "Native offline JNI scaffold is not loaded yet.";
        }

        String message = nativeLoadModel(modelPath, templateHint);
        modelLoaded = message != null && message.toLowerCase().contains("loaded successfully");
        loadedModelPath = modelLoaded ? modelPath : null;
        return message;
    }

    public static String unloadModel() {
        if (!libraryLoaded) {
            modelLoaded = false;
            loadedModelPath = null;
            return "Native offline JNI scaffold is not loaded yet.";
        }

        String message = nativeUnloadModel();
        modelLoaded = false;
        loadedModelPath = null;
        return message;
    }

    public static String generate(String prompt) {
        if (!libraryLoaded) {
            return "Native offline JNI scaffold is not loaded yet.";
        }

        String message = nativeGenerate(prompt);
        if (message != null && !message.trim().isEmpty() && !message.toLowerCase().contains("no native llama.cpp model is loaded")) {
            modelLoaded = true;
        }
        return message;
    }

    private static native String nativeGetBackendName();
    private static native String nativePrepareRuntime(String modelsRoot, String importsRoot);
    private static native String nativeGetRuntimeMessage();
    private static native String nativeLoadModel(String modelPath, String templateHint);
    private static native String nativeUnloadModel();
    private static native String nativeGenerate(String prompt);
}
