#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/android/app/src/main/assets"
ESPEAK_SRC="$ROOT/modules/piper-module/android/third_party/espeak-ng"

VOSK_URL="https://alphacephei.com/vosk/models/vosk-model-small-fa-0.42.zip"
FA_PIPER_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/gyro/medium"
EN_PIPER_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"
TESS_URL="https://github.com/tesseract-ocr/tessdata/raw/main/fas.traineddata"
PIPER_DATA_URL="https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz"
ESPEAK_SRC_URL="https://github.com/espeak-ng/espeak-ng/archive/4870adf5b7d2d4f1f3e1f5f4f6e0c5d9b1a0d4c6.tar.gz"

download() {
  local url="$1"
  local dest="$2"
  echo "Downloading: $dest"
  curl -fL --retry 3 --retry-delay 2 -o "$dest" "$url"
}

mkdir -p "$ASSETS/vosk" "$ASSETS/piper" "$ASSETS/tessdata"
mkdir -p "$(dirname "$ESPEAK_SRC")"

if [ ! -f "$ASSETS/vosk/vosk-model-small-fa-0.42/conf/model.conf" ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download "$VOSK_URL" "$tmp/vosk.zip"
  unzip -q "$tmp/vosk.zip" -d "$ASSETS/vosk"
fi

download_if_missing() {
  local url="$1"
  local dest="$2"
  if [ ! -s "$dest" ]; then
    download "$url" "$dest"
  else
    echo "Exists: $dest"
  fi
}

download_if_missing "$FA_PIPER_BASE/fa_IR-gyro-medium.onnx" "$ASSETS/piper/fa_IR-gyro-medium.onnx"
download_if_missing "$FA_PIPER_BASE/fa_IR-gyro-medium.onnx.json" "$ASSETS/piper/fa_IR-gyro-medium.onnx.json"
download_if_missing "$EN_PIPER_BASE/en_US-lessac-medium.onnx" "$ASSETS/piper/en_US-lessac-medium.onnx"
download_if_missing "$EN_PIPER_BASE/en_US-lessac-medium.onnx.json" "$ASSETS/piper/en_US-lessac-medium.onnx.json"
download_if_missing "$TESS_URL" "$ASSETS/tessdata/fas.traineddata"

if [ ! -f "$ASSETS/espeak-ng-data/phondata" ] ||
   [ ! -f "$ASSETS/espeak-ng-data/phonindex" ] ||
   [ ! -f "$ASSETS/espeak-ng-data/phontab" ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download "$PIPER_DATA_URL" "$tmp/piper.tar.gz"
  mkdir -p "$ASSETS/espeak-ng-data"
  tar -xzf "$tmp/piper.tar.gz" -C "$tmp" piper/espeak-ng-data
  cp -a "$tmp/piper/espeak-ng-data/." "$ASSETS/espeak-ng-data/"
fi

if [ ! -f "$ESPEAK_SRC/CMakeLists.txt" ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download "$ESPEAK_SRC_URL" "$tmp/espeak-ng.tar.gz"
  tar -xzf "$tmp/espeak-ng.tar.gz" -C "$tmp"
  src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d -name 'espeak-ng-*' | head -n 1)"
  test -n "$src"
  rm -rf "$ESPEAK_SRC"
  mv "$src" "$ESPEAK_SRC"
fi

echo "STTS EAS assets and eSpeak source are ready."
