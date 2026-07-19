/**
 * قانون نگهداری صدا/متن بر اساس «منبع تولید صدا»، نه نوع دکمه.
 * منبع: سند «اصلاحیه ذخیره‌سازی صدا-متن»
 */

export type AudioSource = 'stt_recording' | 'tts_output' | 'uploaded_file';

export interface RetentionDecision {
  keepAudio: boolean;
  keepText: boolean;
}

export function getRetentionDecision(source: AudioSource): RetentionDecision {
  switch (source) {
    case 'stt_recording':
      // صدای ضبط‌شده مستقیم کاربر از حباب صوت‌به‌متن: هر دو نگه داشته شوند
      return { keepAudio: true, keepText: true };
    case 'tts_output':
      // خروجی متن‌به‌صوت: هر دو کامل نگه داشته شوند
      return { keepAudio: true, keepText: true };
    case 'uploaded_file':
      // فایل آپلودی حجیم: فقط متن نگه داشته شود، فایل صوتی کپی نشود
      return { keepAudio: false, keepText: true };
    default: {
      const exhaustiveCheck: never = source;
      throw new Error(`منبع صدای ناشناخته: ${exhaustiveCheck}`);
    }
  }
}
