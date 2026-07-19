cmake_minimum_required(VERSION 3.22.1)
project(espeak_jni)

# مسیر espeak-ng که به عنوان submodule در third_party قرار دارد
set(ESPEAK_ROOT ${CMAKE_SOURCE_DIR}/../../../third_party/espeak-ng)

# کامپایل espeak-ng به عنوان static library
add_subdirectory(${ESPEAK_ROOT} espeak-ng-build EXCLUDE_FROM_ALL)

# ماژول JNI اصلی
add_library(espeak_jni SHARED espeak_jni.cpp)

target_include_directories(espeak_jni PRIVATE
    ${ESPEAK_ROOT}/src/include
)

target_link_libraries(espeak_jni
    espeak-ng
    android
    log
)
