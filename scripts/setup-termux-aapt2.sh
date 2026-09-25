#!/usr/bin/env bash
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/stts-build"
AAPT2_VERSION="1.1.0"
AAPT2_URL="https://github.com/ReVanced/aapt2/releases/download/v${AAPT2_VERSION}/aapt2-arm64-v8a"
AAPT2="$CACHE_DIR/aapt2-arm64-v8a-$AAPT2_VERSION"

echo "Preparing Termux Android build toolchain..."

if [ ! -f "$ANDROID_HOME/platforms/android-36/android.jar" ]; then
  echo "ERROR: Android SDK Platform 36 is missing: $ANDROID_HOME/platforms/android-36/android.jar" >&2
  exit 1
fi

# Termux's packaged aapt2 (currently 2.19) cannot link modern SDK 35/36
# resources. Google does not publish a Linux ARM64 AAPT2, so use a native
# ARM64 Android/Bionic AAPT2 built from AOSP sources by ReVanced.
mkdir -p "$CACHE_DIR"

if [ ! -x "$AAPT2" ]; then
  echo "Downloading native ARM64 AAPT2 $AAPT2_VERSION..."
  tmp="$AAPT2.tmp"
  rm -f "$tmp"
  curl -fL --retry 3 --connect-timeout 20 -o "$tmp" "$AAPT2_URL"
  chmod 755 "$tmp"

  if ! file "$tmp" | grep -Eq 'ARM aarch64|ARM64'; then
    echo "ERROR: Downloaded AAPT2 is not an ARM64 executable." >&2
    file "$tmp" >&2 || true
    rm -f "$tmp"
    exit 1
  fi

  mv -f "$tmp" "$AAPT2"
fi

if [ ! -x "$AAPT2" ]; then
  echo "ERROR: AAPT2 is not executable: $AAPT2" >&2
  exit 1
fi

AAPT2_VERSION_LINE="$("$AAPT2" version 2>&1 | head -n 1)"
echo "Using native ARM64 AAPT2: $AAPT2"
echo "$AAPT2_VERSION_LINE"

# The important compatibility check is that the binary can execute on this
# ARM64 Android/Termux host; do not compare its internal version string with
# the unrelated Termux package version.
if ! printf '%s\n' "$AAPT2_VERSION_LINE" | grep -q 'Android Asset Packaging Tool'; then
  echo "ERROR: AAPT2 executable did not start correctly." >&2
  exit 1
fi

echo "Android SDK Platform 36: OK"
echo "Native ARM64 AAPT2: OK"
echo "Build toolchain preparation complete."
