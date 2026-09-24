#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/android/app/src/main/assets"
TMP="${TMPDIR:-/tmp}/stts-models"
mkdir -p "$ASSETS" "$TMP"
rm -rf "$TMP"/*

echo "== STTS: preparing offline model assets =="

# Vosk Persian
if [ ! -f "$ASSETS/vosk/vosk-model-small-fa-0.42/conf/model.conf" ]; then
  mkdir -p "$ASSETS/vosk"
  curl -fL --retry 3 --retry-delay 2 \
    "https://alphacephei.com/vosk/models/vosk-model-small-fa-0.42.zip" \
    -o "$TMP/vosk.zip"
  rm -rf "$ASSETS/vosk/vosk-model-small-fa-0.42"
  unzip -q "$TMP/vosk.zip" -d "$ASSETS/vosk"
fi

# Piper voices
mkdir -p "$ASSETS/piper"
curl -fL --retry 3 --retry-delay 2 \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/gyro/medium/fa_IR-gyro-medium.onnx" \
  -o "$ASSETS/piper/fa_IR-gyro-medium.onnx"
curl -fL --retry 3 --retry-delay 2 \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/gyro/medium/fa_IR-gyro-medium.onnx.json" \
  -o "$ASSETS/piper/fa_IR-gyro-medium.onnx.json"
curl -fL --retry 3 --retry-delay 2 \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
  -o "$ASSETS/piper/en_US-lessac-medium.onnx"
curl -fL --retry 3 --retry-delay 2 \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
  -o "$ASSETS/piper/en_US-lessac-medium.onnx.json"

# eSpeak-NG runtime data bundled with Piper
if [ ! -f "$ASSETS/espeak-ng-data/phondata" ] || \
   [ ! -f "$ASSETS/espeak-ng-data/phonindex" ] || \
   [ ! -f "$ASSETS/espeak-ng-data/phontab" ]; then
  curl -fL --retry 3 --retry-delay 2 \
    "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" \
    -o "$TMP/piper.tar.gz"
  rm -rf "$TMP/piper"
  mkdir -p "$TMP/piper"
  tar -xzf "$TMP/piper.tar.gz" -C "$TMP/piper"
  rm -rf "$ASSETS/espeak-ng-data"
  mkdir -p "$ASSETS/espeak-ng-data"
  cp -a "$TMP/piper/piper/espeak-ng-data/." "$ASSETS/espeak-ng-data/"
fi

# Tesseract Persian trained data
mkdir -p "$ASSETS/tessdata"
curl -fL --retry 3 --retry-delay 2 \
  "https://github.com/tesseract-ocr/tessdata/raw/main/fas.traineddata" \
  -o "$ASSETS/tessdata/fas.traineddata"

# Validate the exact files required by the runtime.
test -f "$ASSETS/vosk/vosk-model-small-fa-0.42/conf/model.conf"
test -f "$ASSETS/piper/fa_IR-gyro-medium.onnx"
test -f "$ASSETS/piper/fa_IR-gyro-medium.onnx.json"
test -f "$ASSETS/piper/en_US-lessac-medium.onnx"
test -f "$ASSETS/piper/en_US-lessac-medium.onnx.json"
test -f "$ASSETS/espeak-ng-data/phondata"
test -f "$ASSETS/espeak-ng-data/phonindex"
test -f "$ASSETS/espeak-ng-data/phontab"
test -f "$ASSETS/tessdata/fas.traineddata"

echo "== STTS: offline model assets are ready =="
