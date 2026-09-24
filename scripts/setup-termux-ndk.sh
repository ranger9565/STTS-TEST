#!/usr/bin/env bash
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
NDK_VERSION="27.1.12297006"
TARGET="$ANDROID_HOME/ndk/$NDK_VERSION"
URL="https://github.com/MrIkso/AndroidIDE-NDK/releases/download/ndk/android-ndk-r27b-aarch64.zip"

if [ "$(uname -m)" != "aarch64" ]; then
  echo "This Termux setup requires an aarch64 Android device."
  exit 1
fi

if [ -x "$TARGET/toolchains/llvm/prebuilt/linux-x86_64/bin/clang" ] &&
   "$TARGET/toolchains/llvm/prebuilt/linux-x86_64/bin/clang" --version >/dev/null 2>&1; then
  echo "A native ARM64 NDK $NDK_VERSION is already installed."
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading native ARM64 NDK r27b..."
curl -fL --retry 3 --retry-delay 2 -o "$tmp/ndk.zip" "$URL"

echo "Extracting..."
unzip -q "$tmp/ndk.zip" -d "$tmp"

SRC="$tmp/android-ndk-r27b"
test -d "$SRC"

mkdir -p "$ANDROID_HOME/ndk"

if [ -d "$TARGET" ]; then
  backup="${TARGET}.google-x86_64"
  rm -rf "$backup"
  mv "$TARGET" "$backup"
  echo "Original Google x86_64 NDK preserved at: $backup"
fi

mv "$SRC" "$TARGET"

CLANG="$TARGET/toolchains/llvm/prebuilt/linux-x86_64/bin/clang"
"$CLANG" --version

echo
echo "Native ARM64 NDK $NDK_VERSION is ready."
