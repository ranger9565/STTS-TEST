#!/usr/bin/env bash
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"

echo "Preparing Termux Android build toolchain..."

# The Google Play build of Termux rejects static ET_EXEC Linux/ARM64
# binaries with: unexpected e_type: 2. Therefore do not download aapt2
# from generic Linux/ARM64 releases. Use Termux's native Android/Bionic
# aapt2 package instead.
if ! command -v aapt2 >/dev/null 2>&1; then
  echo "Termux-native aapt2 is not installed. Installing package aapt2..."
  pkg install -y aapt2
fi

AAPT2="$(command -v aapt2)"

if [ ! -x "$AAPT2" ]; then
  echo "ERROR: Termux aapt2 is not executable: $AAPT2" >&2
  exit 1
fi

if [ ! -f "$ANDROID_HOME/platforms/android-36/android.jar" ]; then
  echo "ERROR: Android SDK Platform 36 is missing: $ANDROID_HOME/platforms/android-36/android.jar" >&2
  exit 1
fi

echo "Using Termux-native AAPT2: $AAPT2"
"$AAPT2" version

echo "Android SDK Platform 36: OK"
echo "Termux ARM64 AAPT2: OK"
echo "Build toolchain preparation complete."
