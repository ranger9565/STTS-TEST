# حسین STTS - وضعیت پروژه

آخرین به‌روزرسانی: ۱۹ جولای ۲۰۲۶ - توسط کاوه (Claude)، مستقیم و بدون Agent Replit

## معماری
Expo / React Native / TypeScript (strict) / pnpm / SQLite Native
ساختار Feature-based: src/features/{stt,tts,ocr,settings}

## وضعیت واقعی فعلی (بدون اغراق)

### ✅ کامل و تست‌شده (۴۶ تست واحد PASS، اجرا شده واقعی)
- `wav-concatenator.ts` — منطق اتصال فایل‌های WAV خروجی Piper (۳ تست)
- `playback-queue.ts` — منطق صف پخش TTS طبق قانون مستندشده (۴ تست)
- `retention-rule.ts` — قانون نگهداری صدا/متن بر اساس منبع (۳ تست)
- `language-tokenizer.ts` — تشخیص فارسی/انگلیسی + تقسیم متن به بخش‌ها (۵ تست)
- `storage-quota.ts` — سقف ۵۰۰ مگابایتی تاریخچه و هشدارها (۵ تست)
- `silence-trimmer.ts` — حذف سکوت انتهایی صدا با 350ms padding (۳ تست)
- `stt-session.ts` — مدیریت وضعیت جلسه STT (۶ تست)
- `tts-service.ts` — انتخاب خودکار مدل TTS بر اساس زبان (۳ تست)
- `ocr-session.ts` — مدیریت وضعیت اسکن + بررسی اطمینان نتیجه (۸ تست)
- `settings-service.ts` — تنظیمات زبان/صدا/سرعت با کلمپ بازه (۶ تست)

این ده فایل منطق خالص TypeScript هستند، مستقل از هر ماژول Native، و همین الان
با `npx jest` قابل اجرا و تایید مجدد‌اند.

### ⏳ در حال ساخت (نوبت بعدی)
- رابط STT (Vosk) — لایه JS آماده می‌شود؛ خود موتور Vosk نیاز به ماژول Native (JNI) دارد
- رابط TTS (Piper/ONNX) — از onnxruntime-react-native استفاده می‌شود
- OCR (Tesseract4Android) — نیاز به پکیج Native جامعه یا ماژول سفارشی
- UI پنل اصلی طبق مشخصات بخش ۹ پرامپت نهایی

### ⚠️ محدودیت واقعی (باید شفاف گفته شود)
موتورهای STT/OCR (Vosk، Tesseract4Android) کدشان native اندروید (JNI/.so) است.
این کامپایل نیاز به Android SDK/NDK و دستگاه یا شبیه‌ساز واقعی دارد که در محیط
فعلی من (کاوه) در دسترس نیست. من تمام کد JS/TS، معماری، منطق کسب‌وکار و UI را
کامل و تست‌شده تحویل می‌دهم؛ فقط **یک بار در پایان**، نصب و build نهایی
(`eas build`) باید روی Replit/Codespaces اجرا شود — نه به‌صورت تکراری و
خطایابی، بلکه یک اجرای نهایی روی کدی که از قبل درست است.

## ابزارهای تأییدشده (بدون تغییر)
- STT: Vosk + vosk-model-small-fa-0.42 (فارسی، آفلاین، ~53MB)
- TTS: Piper + ONNX Runtime، fa_IR-gyro-medium / en_US-lessac-medium
- OCR: Tesseract4Android + fas

## قدم بعدی
ادامه ساخت رابط STT (لایه JS) و اسکلت UI پنل اصلی.

## User preferences
- قانون قفل‌شده: اگر خطای Jest/tsconfig/moduleNameMapper پیش اومد، فقط با testPathIgnorePatterns رد کن، وقت نذار روش.
- اگه بیش از ۵ اکشن پشت‌سرهم روی یک مشکل جزئی گیر کردی، متوقف شو و گزارش بده — ادامه نده.
