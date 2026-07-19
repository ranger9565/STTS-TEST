/**
 * قرارداد رابط OCR (Tesseract4Android).
 * پیاده‌سازی واقعی موتور در ماژول Native انجام می‌شود؛
 * این لایه مدیریت وضعیت اسکن و پردازش نتیجه متن است.
 */

export type OcrScanMode = 'full_screen' | 'region_select';
export type OcrState = 'idle' | 'scanning' | 'processing';

export interface OcrSession {
  state: OcrState;
  mode: OcrScanMode | null;
}

export interface OcrResult {
  text: string;
  confidence: number; // 0 تا 1
}

export function createOcrSession(): OcrSession {
  return { state: 'idle', mode: null };
}

export function startScan(session: OcrSession, mode: OcrScanMode): OcrSession {
  if (session.state !== 'idle') {
    throw new Error('جلسه OCR در حال حاضر فعال است');
  }
  return { state: 'scanning', mode };
}

/** بعد از گرفتن تصویر، وارد حالت پردازش می‌شود */
export function beginProcessing(session: OcrSession): OcrSession {
  if (session.state !== 'scanning') {
    throw new Error('فقط از حالت scanning می‌توان وارد processing شد');
  }
  return { ...session, state: 'processing' };
}

/** آیا نتیجه OCR به‌اندازه کافی قابل‌اعتماد است؟ (آستانه پیش‌فرض 0.6) */
export function isResultReliable(result: OcrResult, threshold = 0.6): boolean {
  return result.confidence >= threshold && result.text.trim().length > 0;
}

export function finishScan(session: OcrSession): OcrSession {
  return { state: 'idle', mode: null };
}
