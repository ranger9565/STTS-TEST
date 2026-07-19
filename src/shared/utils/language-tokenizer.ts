/**
 * تشخیص زبان غالب یک متن بر اساس محدوده یونیکد حروف فارسی/عربی در برابر لاتین.
 * برای انتخاب خودکار مدل TTS (fa_IR-gyro-medium یا en_US-lessac-medium) استفاده می‌شود.
 */

const PERSIAN_RANGE = /[\u0600-\u06FF]/;
const LATIN_RANGE = /[a-zA-Z]/;

export type DetectedLanguage = 'fa' | 'en';

export function detectLanguage(text: string): DetectedLanguage {
  const persianCount = (text.match(new RegExp(PERSIAN_RANGE, 'g')) || []).length;
  const latinCount = (text.match(new RegExp(LATIN_RANGE, 'g')) || []).length;

  if (persianCount === 0 && latinCount === 0) {
    return 'fa'; // پیش‌فرض وقتی هیچ حرفی تشخیص داده نشد (مثلاً فقط عدد)
  }
  return persianCount >= latinCount ? 'fa' : 'en';
}

/** تقسیم متن به جملات مجزا برای شماره‌گذاری در پنجره نمایشگر */
export function splitIntoSegments(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
