#include <jni.h>
#include <android/log.h>

#include <algorithm>
#include <chrono>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#ifndef LLAMA_CPP_VENDOR_READY
#define LLAMA_CPP_VENDOR_READY 0
#endif

#if LLAMA_CPP_VENDOR_READY
#include "llama.h"
#endif

namespace {
constexpr const char * kLogTag = "NativeOfflineLlm";
std::mutex g_runtime_mutex;
std::string g_models_root;
std::string g_imports_root;
std::string g_loaded_model_path;
std::string g_loaded_mmproj_path;
std::string g_template_hint = "generic";
std::string g_runtime_message = LLAMA_CPP_VENDOR_READY
    ? "Native llama.cpp runtime is available."
    : "Native llama.cpp source is not bundled in this build.";
bool g_backend_initialized = false;
bool g_model_loaded = false;

#if LLAMA_CPP_VENDOR_READY
llama_model * g_model = nullptr;
llama_context * g_ctx = nullptr;
llama_sampler * g_sampler = nullptr;
const llama_vocab * g_vocab = nullptr;
#endif
}

void log_error(const std::string & message) {
    __android_log_print(ANDROID_LOG_ERROR, kLogTag, "%s", message.c_str());
}

std::string toStdString(JNIEnv * env, jstring value) {
    if (value == nullptr) {
        return "";
    }

    const char * chars = env->GetStringUTFChars(value, nullptr);
    if (chars == nullptr) {
        return "";
    }

    std::string result(chars);
    env->ReleaseStringUTFChars(value, chars);
    return result;
}

#if LLAMA_CPP_VENDOR_READY
void unload_model_locked() {
    g_model_loaded = false;
    g_loaded_model_path.clear();
    g_loaded_mmproj_path.clear();

    if (g_sampler != nullptr) {
        llama_sampler_free(g_sampler);
        g_sampler = nullptr;
    }

    if (g_ctx != nullptr) {
        llama_free(g_ctx);
        g_ctx = nullptr;
    }

    if (g_model != nullptr) {
        llama_model_free(g_model);
        g_model = nullptr;
    }

    g_vocab = nullptr;
}

void ensure_backend_initialized_locked() {
    if (g_backend_initialized) {
        return;
    }

    llama_backend_init();
    g_backend_initialized = true;
}

std::string apply_template_locked(const std::string & prompt) {
    if (prompt.rfind("RAW:", 0) == 0) {
        return prompt.substr(4);
    }

    if (g_model == nullptr) {
        return prompt;
    }

    const char * builtin_template = llama_model_chat_template(g_model, nullptr);
    if (builtin_template == nullptr || builtin_template[0] == '\0') {
        if (g_template_hint == "llama" || g_template_hint == "qwen" || g_template_hint == "smollm" || g_template_hint == "generic") {
            return "<|system|>\nYou are Amo, a grounded New Zealand Maori assistant.\n<|user|>\n" + prompt + "\n<|assistant|>\n";
        }

        if (g_template_hint == "gemma") {
            return "<start_of_turn>user\n" + prompt + "<end_of_turn>\n<start_of_turn>model\n";
        }

        return prompt;
    }

    llama_chat_message message {
        "user",
        prompt.c_str()
    };

    int32_t required = llama_chat_apply_template(builtin_template, &message, 1, true, nullptr, 0);
    if (required <= 0) {
        return prompt;
    }

    std::vector<char> buffer(static_cast<size_t>(required) + 1, '\0');
    int32_t written = llama_chat_apply_template(
        builtin_template,
        &message,
        1,
        true,
        buffer.data(),
        static_cast<int32_t>(buffer.size())
    );

    if (written <= 0) {
        return prompt;
    }

    return std::string(buffer.data(), static_cast<size_t>(written));
}

bool tokenize_prompt_locked(const std::string & prompt, std::vector<llama_token> & tokens, std::string & error_message) {
    if (g_vocab == nullptr) {
        error_message = "Native vocabulary is not ready.";
        return false;
    }

    int32_t required = -llama_tokenize(g_vocab, prompt.c_str(), static_cast<int32_t>(prompt.size()), nullptr, 0, true, true);
    if (required <= 0) {
        error_message = "Failed to tokenize prompt.";
        return false;
    }

    tokens.resize(static_cast<size_t>(required));
    int32_t written = llama_tokenize(
        g_vocab,
        prompt.c_str(),
        static_cast<int32_t>(prompt.size()),
        tokens.data(),
        static_cast<int32_t>(tokens.size()),
        true,
        true
    );

    if (written < 0) {
        error_message = "Failed to tokenize prompt.";
        return false;
    }

    if (written < static_cast<int32_t>(tokens.size())) {
        tokens.resize(static_cast<size_t>(written));
    }

    if (static_cast<int>(tokens.size()) > kMaxContextTokens - kReservedGenerationTokens) {
        const size_t keep_from = tokens.size() - static_cast<size_t>(kMaxContextTokens - kReservedGenerationTokens);
        tokens.erase(tokens.begin(), tokens.begin() + static_cast<long long>(keep_from));
    }

    return !tokens.empty();
}

std::string token_to_piece_locked(llama_token token) {
    if (g_vocab == nullptr) {
        return "";
    }

    char buffer[kTokenPieceBufferSize];
    int32_t size = llama_token_to_piece(g_vocab, token, buffer, kTokenPieceBufferSize, 0, true);
    if (size < 0) {
        return "";
    }

    return std::string(buffer, static_cast<size_t>(size));
}
#endif
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_askamo_mobile_NativeOfflineLlmRuntime_nativeGetBackendName(JNIEnv * env, jclass /* clazz */) {
#if LLAMA_CPP_VENDOR_READY
    return env->NewStringUTF("llama.cpp-native");
#else
    return env->NewStringUTF("llama.cpp-jni-unavailable");
#endif
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_askamo_mobile_NativeOfflineLlmRuntime_nativePrepareRuntime(
    JNIEnv * env,
    jclass /* clazz */,
    jstring modelsRoot,
    jstring importsRoot
) {
    std::lock_guard<std::mutex> lock(g_runtime_mutex);
    g_models_root = toStdString(env, modelsRoot);
    g_imports_root = toStdString(env, importsRoot);

#if LLAMA_CPP_VENDOR_READY
    ensure_backend_initialized_locked();
    g_runtime_message = "Native llama.cpp runtime is ready for GGUF model loading.";
#else
    g_runtime_message = "Native llama.cpp source is not bundled in this build.";
#endif

    return env->NewStringUTF(g_runtime_message.c_str());
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_askamo_mobile_NativeOfflineLlmRuntime_nativeGetRuntimeMessage(JNIEnv * env, jclass /* clazz */) {
    std::lock_guard<std::mutex> lock(g_runtime_mutex);
    return env->NewStringUTF(g_runtime_message.c_str());
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_askamo_mobile_NativeOfflineLlmRuntime_nativeLoadModel(
    JNIEnv * env,
    jclass /* clazz */,
    jstring modelPath,
    jstring templateHint
) {
    std::lock_guard<std::mutex> lock(g_runtime_mutex);

#if !LLAMA_CPP_VENDOR_READY
    g_runtime_message = "Native llama.cpp source is not bundled in this build.";
    return env->NewStringUTF(g_runtime_message.c_str());
#else
    const std::string model_path = toStdString(env, modelPath);
    const std::string template_hint = toStdString(env, templateHint);

    if (model_path.empty()) {
        g_runtime_message = "Model path is required.";
        log_error("loadModel:error missing model path");
        return env->NewStringUTF(g_runtime_message.c_str());
    }

    log_debug("loadModel:start path=" + model_path + " template=" + template_hint);
    ensure_backend_initialized_locked();
    unload_model_locked();

    llama_model_params model_params = llama_model_default_params();
    model_params.n_gpu_layers = 0;
    model_params.use_mmap = false;

    g_model = llama_model_load_from_file(model_path.c_str(), model_params);
    if (g_model == nullptr) {
        g_runtime_message = "Failed to load GGUF model.";
        log_error("loadModel:error llama_model_load_from_file failed");
        return env->NewStringUTF(g_runtime_message.c_str());
    }

    llama_context_params context_params = llama_context_default_params();
    int32_t trained_ctx = llama_model_n_ctx_train(g_model);
    if (trained_ctx <= 0) {
        trained_ctx = kMaxContextTokens;
    }

    context_params.n_ctx = static_cast<uint32_t>(std::min(trained_ctx, kMaxContextTokens));
    context_params.n_batch = static_cast<uint32_t>(std::min(8, static_cast<int>(context_params.n_ctx)));
    context_params.n_ubatch = 1;
    context_params.no_perf = true;

    g_ctx = llama_init_from_model(g_model, context_params);
    if (g_ctx == nullptr) {
        llama_model_free(g_model);
        g_model = nullptr;
        g_runtime_message = "Failed to create llama.cpp context.";
        log_error("loadModel:error llama_init_from_model failed");
        return env->NewStringUTF(g_runtime_message.c_str());
    }

    int32_t thread_count = static_cast<int32_t>(std::max(2u, std::thread::hardware_concurrency() > 0 ? std::min(2u, std::thread::hardware_concurrency()) : 2u));
    llama_set_n_threads(g_ctx, thread_count, thread_count);
    g_vocab = llama_model_get_vocab(g_model);

    auto sampler_params = llama_sampler_chain_default_params();
    sampler_params.no_perf = true;
    g_sampler = llama_sampler_chain_init(sampler_params);
    llama_sampler_chain_add(g_sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(g_sampler, llama_sampler_init_top_p(0.9f, 1));
    llama_sampler_chain_add(g_sampler, llama_sampler_init_temp(0.3f));
    llama_sampler_chain_add(g_sampler, llama_sampler_init_dist(0));

    g_loaded_model_path = model_path;
    g_template_hint = template_hint.empty() ? "generic" : template_hint;
    g_model_loaded = true;
    g_runtime_message = "Native llama.cpp model loaded successfully.";
    log_debug(
        "loadModel:done ctx=" + std::to_string(context_params.n_ctx) +
        " batch=" + std::to_string(context_params.n_batch) +
        " ubatch=" + std::to_string(context_params.n_ubatch) +
        " threads=" + std::to_string(thread_count) +
        " mmap=" + std::string(model_params.use_mmap ? "true" : "false")
    );
    return env->NewStringUTF(g_runtime_message.c_str());
#endif
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_askamo_mobile_NativeOfflineLlmRuntime_nativeUnloadModel(JNIEnv * env, jclass /* clazz */) {
    std::lock_guard<std::mutex> lock(g_runtime_mutex);

#if LLAMA_CPP_VENDOR_READY
    unload_model_locked();
    g_runtime_message = "Native llama.cpp model unloaded.";
#else
    g_runtime_message = "Native llama.cpp source is not bundled in this build.";
#endif

    return env->NewStringUTF(g_runtime_message.c_str());
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_askamo_mobile_NativeOfflineLlmRuntime_nativeGenerate(
    JNIEnv * env,
    jclass /* clazz */,
    jstring prompt
) {
    std::lock_guard<std::mutex> lock(g_runtime_mutex);

#if !LLAMA_CPP_VENDOR_READY
    g_runtime_message = "Native llama.cpp source is not bundled in this build.";
    return env->NewStringUTF(g_runtime_message.c_str());
#else
    if (!g_model_loaded || g_model == nullptr || g_ctx == nullptr || g_sampler == nullptr) {
        g_runtime_message = "No native llama.cpp model is loaded.";
        log_error("generate:error no model loaded");
        return env->NewStringUTF(g_runtime_message.c_str());
    }

    const std::string user_prompt = toStdString(env, prompt);
    if (user_prompt.empty()) {
        g_runtime_message = "Prompt is required.";
        log_error("generate:error empty prompt");
        return env->NewStringUTF(g_runtime_message.c_str());
    }

    log_debug("generate:prompt_chars=" + std::to_string(user_prompt.size()));
    log_debug("generate:clear_memory:start");
    llama_memory_clear(llama_get_memory(g_ctx), true);
    log_debug("generate:clear_memory:done");
    llama_sampler_reset(g_sampler);

    std::string formatted_prompt = apply_template_locked(user_prompt);
    log_debug("generate:formatted_prompt_chars=" + std::to_string(formatted_prompt.size()));
    std::vector<llama_token> prompt_tokens;
    std::string token_error;
    if (!tokenize_prompt_locked(formatted_prompt, prompt_tokens, token_error)) {
        g_runtime_message = token_error;
        log_error("generate:error tokenize failed: " + token_error);
        return env->NewStringUTF(g_runtime_message.c_str());
    }
    log_debug("generate:prompt_tokens=" + std::to_string(prompt_tokens.size()));

    const int32_t max_batch = 1;
    if (llama_model_has_encoder(g_model)) {
        log_debug("generate:encoder_model");
        llama_batch encode_batch = llama_batch_get_one(prompt_tokens.data(), static_cast<int32_t>(prompt_tokens.size()));
        int32_t encode_result = llama_encode(g_ctx, encode_batch);
        if (encode_result != 0) {
            g_runtime_message = "Failed to encode the prompt.";
            log_error("generate:error encode failed");
            return env->NewStringUTF(g_runtime_message.c_str());
        }

        llama_token decoder_start = llama_model_decoder_start_token(g_model);
        if (decoder_start == LLAMA_TOKEN_NULL) {
            decoder_start = llama_vocab_bos(g_vocab);
        }

        prompt_tokens.clear();
        prompt_tokens.push_back(decoder_start);
    }

    size_t offset = 0;
    while (offset < prompt_tokens.size()) {
        const int32_t chunk_size = static_cast<int32_t>(std::min(prompt_tokens.size() - offset, static_cast<size_t>(max_batch)));
        log_debug("generate:decode_prompt_chunk offset=" + std::to_string(offset) + " size=" + std::to_string(chunk_size));
        llama_batch prompt_batch = llama_batch_get_one(prompt_tokens.data() + offset, chunk_size);
        int32_t decode_result = llama_decode(g_ctx, prompt_batch);
        if (decode_result != 0) {
            g_runtime_message = "llama.cpp failed while loading the prompt into context.";
            log_error("generate:error prompt decode failed");
            return env->NewStringUTF(g_runtime_message.c_str());
        }
        offset += static_cast<size_t>(chunk_size);
    }
    log_debug("generate:prompt_loaded");

    std::string response;
    int generated_tokens = 0;
    llama_token next_token = LLAMA_TOKEN_NULL;
    llama_batch batch = llama_batch_get_one(&next_token, 1);
    bool needs_decode = false;
    const auto generation_start = std::chrono::steady_clock::now();

    while (generated_tokens < kMaxGenerationTokens) {
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - generation_start
        ).count();
        if (elapsed >= kMaxGenerationMillis) {
            log_debug("generate:timeout elapsed_ms=" + std::to_string(elapsed));
            break;
        }

        if (needs_decode) {
            log_debug("generate:decode_token index=" + std::to_string(generated_tokens));
            int32_t decode_result = llama_decode(g_ctx, batch);
            if (decode_result != 0) {
                g_runtime_message = "llama.cpp failed while generating tokens.";
                log_error("generate:error token decode failed");
                return env->NewStringUTF(g_runtime_message.c_str());
            }
        }

        llama_token token = llama_sampler_sample(g_sampler, g_ctx, -1);
        if (generated_tokens == 0) {
            log_debug("generate:first_token=" + std::to_string(token));
        }
        if (llama_vocab_is_eog(g_vocab, token)) {
            log_debug("generate:eog token=" + std::to_string(token));
            break;
        }

        std::string piece = token_to_piece_locked(token);
        if (!piece.empty()) {
            response += piece;
            if (response.size() >= 120 && (piece.find('.') != std::string::npos || piece.find('!') != std::string::npos || piece.find('?') != std::string::npos)) {
                break;
            }
        }

        batch = llama_batch_get_one(&token, 1);
        generated_tokens += 1;
        needs_decode = true;
    }

    if (response.empty()) {
        g_runtime_message = "Native llama.cpp generated an empty response.";
        log_error("generate:error empty response generated_tokens=" + std::to_string(generated_tokens));
        return env->NewStringUTF(g_runtime_message.c_str());
    }

    g_runtime_message = "Native llama.cpp generated a response.";
    log_debug("generate:done generated_tokens=" + std::to_string(generated_tokens) + " response_chars=" + std::to_string(response.size()));
    return env->NewStringUTF(response.c_str());
#endif
}
