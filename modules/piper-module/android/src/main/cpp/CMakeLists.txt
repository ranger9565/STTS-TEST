cmake_minimum_required(VERSION 3.22.1)
project(espeak_jni)

# eSpeak NG is built from source during the native Android build.
# No Git submodule is required; EAS downloads the source into third_party.
set(ESPEAK_ROOT ${CMAKE_SOURCE_DIR}/../../../third_party/espeak-ng)

# Piper only needs eSpeak's phonemization engine. Disable desktop/data-generation
# features that require executing a host-built eSpeak binary during an Android
# cross-compile.
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(COMPILE_INTONATIONS OFF CACHE BOOL "" FORCE)
set(ENABLE_TESTS OFF CACHE BOOL "" FORCE)
set(USE_MBROLA OFF CACHE BOOL "" FORCE)
set(USE_LIBSONIC OFF CACHE BOOL "" FORCE)
set(USE_SPEECHPLAYER OFF CACHE BOOL "" FORCE)
set(USE_ASYNC OFF CACHE BOOL "" FORCE)

add_subdirectory(${ESPEAK_ROOT} espeak-ng-build EXCLUDE_FROM_ALL)

# JNI wrapper used by Piper for text -> phoneme conversion.
add_library(espeak_jni SHARED espeak_jni.cpp)

target_include_directories(espeak_jni PRIVATE
    ${ESPEAK_ROOT}/src/include
)

target_link_libraries(espeak_jni
    espeak-ng
    android
    log
)
