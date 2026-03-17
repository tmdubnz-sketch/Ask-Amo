cmake_minimum_required(VERSION 3.22.1)

project(native_offline_llama)

set(LLAMA_CPP_VENDOR_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/llama.cpp)

# Force disable vendor - header conflicts in bundled llama.cpp prevent building
# Issue: ggml-cpu-impl.h has multiple duplicate function definitions that conflict
# with definitions in ggml-impl.h:
# - ggml_compute_bf16_to_fp32 (line 69 vs ggml-impl.h:533)
# - ggml_compute_fp32_to_bf16 (line 86 vs ggml-impl.h:550)
# - ggml_vdotq_s32 (line 376 vs ggml-cpu/ggml-cpu-impl.h:309)
# - ggml_compute_fp16_to_fp32 (line 398 vs ggml-impl.h:378)
# - ggml_compute_fp32_to_fp16 (line 404 vs ggml-impl.h:401)
#
# This appears to be a version mismatch or improper merge in the bundled llama.cpp.
# Options to fix:
# 1. Update bundled llama.cpp to latest version
# 2. Remove duplicate definitions from ggml-cpu-impl.h
# 3. Use Android NDK pre-built llama.cpp library instead
set(LLAMA_CPP_VENDOR_READY FALSE)

# Auto-detection disabled - re-enable once llama.cpp headers are fixed
# if(EXISTS ${LLAMA_CPP_VENDOR_DIR}/src/llama.cpp AND EXISTS ${LLAMA_CPP_VENDOR_DIR}/include/llama.h)
#     set(LLAMA_CPP_VENDOR_READY TRUE)
# endif()

if(LLAMA_CPP_VENDOR_READY)
    set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
    set(LLAMA_TOOLS_INSTALL OFF CACHE BOOL "" FORCE)
    set(LLAMA_TESTS_INSTALL OFF CACHE BOOL "" FORCE)
    set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
    set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
    add_subdirectory(${LLAMA_CPP_VENDOR_DIR} ${CMAKE_CURRENT_BINARY_DIR}/llama_cpp EXCLUDE_FROM_ALL)
endif()

add_library(
    native_offline_llama
    SHARED
    native_offline_llama.cpp
)

if(LLAMA_CPP_VENDOR_READY)
    target_compile_definitions(native_offline_llama PRIVATE LLAMA_CPP_VENDOR_READY=1)
    target_include_directories(native_offline_llama PRIVATE ${LLAMA_CPP_VENDOR_DIR}/include)
else()
    target_compile_definitions(native_offline_llama PRIVATE LLAMA_CPP_VENDOR_READY=0)
endif()

find_library(
    log-lib
    log
)

target_link_libraries(
    native_offline_llama
    $<$<BOOL:${LLAMA_CPP_VENDOR_READY}>:llama>
    ${log-lib}
)
