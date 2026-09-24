/**
 * تصمیم‌گیری هنگام تپ روی حباب STT (وقتی اپ در پس‌زمینه است).
 *
 * هدف: کاربر در اپ دیگری است و می‌خواهد با صدا تایپ کند؛ پس اگر همه‌چیز آماده
 * است اپ STTS نباید جلو بیاید (وگرنه فوکوس ورودی اپ مقصد از بین می‌رود).
 * فقط اگر مجوز میکروفون یا سرویس دسترس‌پذیری آماده نیست، اپ باز می‌شود
 * تا کاربر بتواند آن‌ها را فعال کند.
 */

export type BubbleTapAction = 'start' | 'stop' | 'open_app';

export interface BubbleTapContext {
  isListening: boolean;
  micGranted: boolean;
  typingEnabled: boolean;
}

export function decideBubbleTapAction(ctx: BubbleTapContext): BubbleTapAction {
  // توقف ضبط همیشه باید ممکن باشد، حتی اگر شرایط دیگر تغییر کرده باشد.
  if (ctx.isListening) return 'stop';
  if (!ctx.micGranted || !ctx.typingEnabled) return 'open_app';
  return 'start';
}
