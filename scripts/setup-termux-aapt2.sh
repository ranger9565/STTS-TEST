#!/usr/bin/env bash
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"

echo "Preparing Termux Android build toolchain..."

# Android API 35+ requires a newer AAPT2 than the old Termux package
# that reports version 2.19. The current Termux android-build-tools
# package provides the ARM64-native AAPT2 needed by API 36.
echo "Updating Termux package metadata..."
pkg update -y

echo "Installing/upgrading Termux-native AAPT2..."
pkg install -y aapt2

AAPT2="$(command -v aapt2)"

if [ ! -x "$AAPT2" ]; then
  echo "ERROR: Termux aapt2 is not executable: $AAPT2" >&2
  exit 1
fi

if [ ! -f "$ANDROID_HOME/platforms/android-36/android.jar" ]; then
  echo "ERROR: Android SDK Platform 36 is missing: $ANDROID_HOME/platforms/android-36/android.jar" >&2
  exit 1
fi

AAPT2_VERSION="$("$AAPT2" version 2>&1 | head -n 1)"
echo "Using Termux-native AAPT2: $AAPT2"
echo "$AAPT2_VERSION"

# AAPT2 2.19 is known to fail when linking against android-35/android-36.
# API 36 requires the Termux android-build-tools 16.x line or newer.
if ! printf '%s\n' "$AAPT2_VERSION" | grep -Eq 'AAPT.*[[:space:]]16\.'; then
  echo "ERROR: AAPT2 is still too old for Android API 36." >&2
  echo "Expected Termux AAPT2 16.x or newer, but found: $AAPT2_VERSION" >&2
  echo "Check the Termux repository configuration and package source." >&2
  exit 1
fi

echo "Android SDK Platform 36: OK"
echo "Termux ARM64 AAPT2: API 36 compatible"
echo "Build toolchain preparation complete."
