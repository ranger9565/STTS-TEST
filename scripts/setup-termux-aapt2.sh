#!/usr/bin/env bash
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
AAPT2_ROOT="$HOME/android-sdk-tools-lzhiyong-35.0.2"
AAPT2="$AAPT2_ROOT/build-tools/aapt2"
URL="https://github.com/lzhiyong/android-sdk-tools/releases/download/35.0.2/android-sdk-tools-static-aarch64.zip"

echo "Preparing Termux Android build toolchain..."

# Keep the old x86_64 NDK outside the SDK tree so sdkmanager stops reporting
# an inconsistent package location.
OLD_NDK="$ANDROID_HOME/ndk/27.1.12297006.google-x86_64"
if [ -d "$OLD_NDK" ]; then
  mkdir -p "$HOME/android-sdk-backup/ndk"
  mv "$OLD_NDK" "$HOME/android-sdk-backup/ndk/27.1.12297006.google-x86_64"
  echo "Moved old x86_64 NDK backup outside SDK metadata."
fi

if [ ! -x "$AAPT2" ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  echo "Downloading ARM64 AAPT2 from lzhiyong/android-sdk-tools..."
  curl -fL --retry 3 --retry-delay 2 -o "$tmp/tools.zip" "$URL"
  rm -rf "$AAPT2_ROOT"
  mkdir -p "$AAPT2_ROOT"
  unzip -q "$tmp/tools.zip" -d "$AAPT2_ROOT"
fi

chmod +x "$AAPT2"
"$AAPT2" version

test -f "$ANDROID_HOME/platforms/android-36/android.jar"
echo "Android SDK Platform 36: OK"
echo "Termux ARM64 AAPT2: OK"
echo "Build toolchain preparation complete."
