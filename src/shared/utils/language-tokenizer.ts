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

/**
 * متن را به بخش‌های زبانی مناسب TTS تقسیم می‌کند.
 * ابتدا خطوط جدا می‌شوند، سپس واژه‌های فارسی و انگلیسی مجاور در یک خط
 * به بخش‌های مستقل تبدیل می‌شوند تا هر بخش با مدل صحیح Piper اجرا شود.
 * نشانه‌های نگارشی و اعداد به بخش فعلی متصل می‌مانند.
 */
export function splitIntoSegments(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const segments: string[] = [];

  for (const line of lines) {
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    let currentTokens: string[] = [];
    let currentLanguage: DetectedLanguage | null = null;

    const flush = () => {
      if (currentTokens.length > 0) {
        segments.push(currentTokens.join(' '));
        currentTokens = [];
      }
    };

    for (const token of tokens) {
      const tokenLanguage = detectLanguage(token);
      const hasPersian = PERSIAN_RANGE.test(token);
      const hasLatin = LATIN_RANGE.test(token);

      // اعداد و علائم خالص، زبان جدید ایجاد نمی‌کنند.
      const isNeutral = !hasPersian && !hasLatin;

      if (currentLanguage === null) {
        currentLanguage = isNeutral ? 'fa' : tokenLanguage;
        currentTokens.push(token);
        continue;
      }

      if (isNeutral || tokenLanguage === currentLanguage) {
        currentTokens.push(token);
      } else {
        flush();
        currentLanguage = tokenLanguage;
        currentTokens.push(token);
      }
    }

    flush();
  }

  return segments;
}
