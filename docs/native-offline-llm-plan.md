# Native Offline LLM Plan

This project now has a non-breaking Android native scaffold for moving offline inference away from WebGPU/WebLLM and toward a native `llama.cpp` path.

## Current State

- Capacitor plugin: `android/app/src/main/java/com/askamo/mobile/NativeOfflineLlmPlugin.java`
- Java runtime wrapper: `android/app/src/main/java/com/askamo/mobile/NativeOfflineLlmRuntime.java`
- JNI/C++ scaffold: `android/app/src/main/cpp/native_offline_llama.cpp`
- CMake entrypoint: `android/app/src/main/cpp/CMakeLists.txt`
- TS bridge: `src/services/nativeOfflineLlmService.ts`
- UI wiring: `src/App.tsx`

## What Works Now

- Native runtime status reporting
- Native model import into app-private storage
- Native model activation metadata
- JNI library loading
- Placeholder load/unload/generate calls through the plugin
- Detection of whether vendored `llama.cpp` source is present

## What Is Still Placeholder-Only

- GGUF model parsing
- Real model/context initialization
- Token generation
- Streaming responses from native code to JS
- Native unload/cleanup beyond placeholder state

## Vendor Layout

Place the real source here:

- `android/app/src/main/cpp/third_party/llama.cpp/include/llama.h`
- `android/app/src/main/cpp/third_party/llama.cpp/src/llama.cpp`

The current CMake file already detects those paths and flips the backend label accordingly.

Current vendored tag:

- `llama.cpp` release `b8234`

## Next Binding Steps

1. Vendor a stable `llama.cpp` revision.
2. Add the needed llama.cpp source files to `CMakeLists.txt`.
3. Replace placeholder JNI methods with real implementations:
   - `nativeLoadModel(...)`
   - `nativeUnloadModel()`
   - `nativeGenerate(...)`
4. Add native error objects and return structured status instead of plain strings.
5. Add streaming callbacks or polling for token output.
6. In `src/App.tsx`, prefer native Android generation over WebLLM whenever:
   - native runtime is ready
   - a native model is loaded

## Recommended Runtime Contract

- `prepareRuntime(modelsRoot, importsRoot)`
- `loadModel(relativePath, templateHint)`
- `generate(prompt, systemPrompt?, context?)`
- `interruptGeneration()`
- `unloadModel()`
- `getStatus()`

## Practical Goal

For Android:

- `Groq` remains reliable online mode.
- `SmolLM2` or another small GGUF model should eventually run through the native backend instead of WebGPU.
- WebGPU can remain as a browser/web fallback, not the primary Android offline path.
