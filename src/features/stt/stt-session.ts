/**
 * قرارداد رابط STT (Vosk).
 * پیاده‌سازی واقعی موتور در ماژول Native (JNI) انجام می‌شود؛
 * این لایه، منطق مدیریت جلسه ضبط و پردازش نتیجه است - کاملاً تست‌پذیر.
 */

export type SttSessionState = 'idle' | 'listening' | 'processing';

export interface SttPartialResult {
  text: string;
  isFinal: boolean;
}

export interface SttSession {
  state: SttSessionState;
  accumulatedText: string;
}

export function createSttSession(): SttSession {
  return { state: 'idle', accumulatedText: '' };
}

/** شروع جلسه ضبط جدید - فقط از حالت idle مجاز است */
export function startListening(session: SttSession): SttSession {
  if (session.state !== 'idle') {
    throw new Error('جلسه STT در حال حاضر فعال است؛ نمی‌توان دوباره شروع کرد');
  }
  return { state: 'listening', accumulatedText: '' };
}

/** دریافت نتیجه جزئی/نهایی از موتور Vosk و به‌روزرسانی جلسه */
export function applyPartialResult(session: SttSession, result: SttPartialResult): SttSession {
  if (session.state === 'idle') {
    throw new Error('نمی‌توان نتیجه را روی جلسه غیرفعال اعمال کرد');
  }
  const newText = result.isFinal
    ? `${session.accumulatedText}${result.text} `.trim() + ' '
    : session.accumulatedText;

  return {
    state: result.isFinal ? 'processing' : 'listening',
    accumulatedText: result.isFinal ? newText.trim() : session.accumulatedText,
  };
}

/** توقف دستی ضبط - بازگشت به idle با متن نهایی جمع‌شده */
export function stopListening(session: SttSession): SttSession {
  return { state: 'idle', accumulatedText: session.accumulatedText };
}
