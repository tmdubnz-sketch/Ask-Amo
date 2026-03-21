cmake_minimum_required(VERSION 3.22.1)

project(native_offline_llama)

set(LLAMA_CPP_VENDOR_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/llama.cpp)

# Updated to llama.cpp b8445 - header conflicts resolved
set(LLAMA_CPP_VENDOR_READY TRUE)

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
    # Suppress redefinition errors from duplicate function definitions in bundled llama.cpp headers
    target_compile_options(native_offline_llama PRIVATE -Wno-error=redefinition -Wno-redundant-decls -Wno-error=redundant-decls)
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
