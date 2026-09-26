# راهنمای دانلود و قراردادن مدل‌های AI

قبل از اجرای `eas build`، فایل‌های مدل باید در مسیر صحیح قرار گیرند.

---

## ساختار مورد نیاز

```
android/app/src/main/assets/
├── vosk/
│   └── vosk-model-small-fa-0.42/   ← پوشه مدل Vosk فارسی
│       ├── am/
│       ├── conf/
│       ├── graph/
│       └── ivector/
├── piper/
│   ├── fa_IR-gyro-medium.onnx       ← مدل TTS فارسی
│   ├── fa_IR-gyro-medium.onnx.json  ← کانفیگ مدل فارسی
│   ├── en_US-lessac-medium.onnx     ← مدل TTS انگلیسی
│   └── en_US-lessac-medium.onnx.json
├── espeak-ng-data/                  ← داده‌های phonemization
│   ├── fa/
│   └── en/
└── tessdata/
    └── fas.traineddata              ← فایل آموزشی Tesseract فارسی
```

---

## لینک دانلود مدل‌ها

| مدل | لینک | حجم |
|-----|------|-----|
| **Vosk انگلیسی** | https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip | ~40MB |
| **Vosk فارسی** | https://alphacephei.com/vosk/models/vosk-model-small-fa-0.42.zip | ~53MB |
| **Piper fa_IR-gyro-medium** | https://huggingface.co/rhasspy/piper-voices/tree/main/fa/fa_IR/gyro/medium | ~63MB |
| **Piper en_US-lessac-medium** | https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium | ~63MB |
| **espeak-ng-data** | https://github.com/rhasspy/piper/tree/master/src/python_run/piper/espeak-ng-data | ~2MB |
| **Tesseract fas** | https://github.com/tesseract-ocr/tessdata/raw/main/fas.traineddata | ~8MB |

---

## دستورات دانلود (Linux/macOS)

```bash
# Vosk
wget https://alphacephei.com/vosk/models/vosk-model-small-fa-0.42.zip
unzip vosk-model-small-fa-0.42.zip -d android/app/src/main/assets/vosk/

# Piper fa
mkdir -p android/app/src/main/assets/piper
wget -P android/app/src/main/assets/piper/ \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/gyro/medium/fa_IR-gyro-medium.onnx" \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/gyro/medium/fa_IR-gyro-medium.onnx.json"

# Piper en
wget -P android/app/src/main/assets/piper/ \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"

# Tesseract fas
mkdir -p android/app/src/main/assets/tessdata
wget -P android/app/src/main/assets/tessdata/ \
  "https://github.com/tesseract-ocr/tessdata/raw/main/fas.traineddata"
```

---

## مراحل build بعد از قراردادن مدل‌ها

```bash
# ۱. نصب dependencies
npm install

# ۲. تولید کد native با expo prebuild
npx expo prebuild --platform android

# ۳. در EAS، اسکریپت build به‌صورت خودکار مدل‌ها و سورس eSpeak NG را آماده می‌کند.
#    نیازی به git submodule نیست.

# ۴. build APK از طریق EAS
eas build --platform android --profile preview
```

---

## نکات مهم

- **eSpeak NG source**: برای کامپایل لایه JNI فونیمیزیشن Piper لازم است. اسکریپت EAS سورس ثابت eSpeak NG 1.52.0 را در `modules/piper-module/android/third_party/espeak-ng` آماده می‌کند؛ Git submodule لازم نیست.

- **ONNX Runtime**: از طریق وابستگی `onnxruntime-react-native` به صورت transitiveای موجود است.
  نیازی به دانلود جداگانه نیست.

- **حجم APK**: با همه مدل‌ها حدود ~260MB خواهد بود.
  برای کاهش، می‌توان از `aab` (Android App Bundle) استفاده کرد.
