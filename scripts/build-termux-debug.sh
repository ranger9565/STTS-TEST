#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NODE_ENV="${NODE_ENV:-development}"

if [ -d "/data/data/com.termux/files/usr/lib/jvm/java-21-openjdk" ]; then
  export JAVA_HOME="/data/data/com.termux/files/usr/lib/jvm/java-21-openjdk"
fi

bash scripts/setup-termux-aapt2.sh

AAPT2_PATH="$(command -v aapt2)"
cd android
./gradlew assembleDebug --no-daemon \
  -PreactNativeArchitectures=arm64-v8a \
  -Pandroid.aapt2FromMavenOverride="$AAPT2_PATH"
