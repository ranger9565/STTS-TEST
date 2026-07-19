/**
 * React hook برای مدیریت کامل OCR در UI.
 *
 * وضعیت اسکن از ocr-session.ts مدیریت می‌شود؛
 * تشخیص متن از طریق tesseract-bridge.ts انجام می‌شود.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Camera } from 'expo-camera';
import {
  OcrSession,
  OcrScanMode,
  OcrResult,
  createOcrSession,
  startScan,
  beginProcessing,
  finishScan,
} from './ocr-session';
import {
  initTesseract,
  recognizeBase64Image,
  destroyTesseract,
  TESSDATA_PATH,
} from './tesseract-bridge';

export interface UseOcrResult {
  session: OcrSession;
  lastResult: (OcrResult & { isReliable: boolean }) | null;
  /** شروع جلسه اسکن */
  startScan: (mode: OcrScanMode) => void;
  /** تشخیص متن از تصویر base64 گرفته‌شده توسط expo-camera */
  processImage: (base64Image: string) => Promise<void>;
  /** بازگشت به حالت آماده */
  reset: () => void;
  error: Error | null;
}

export function useOcr(tessDataPath: string = TESSDATA_PATH): UseOcrResult {
  const [session, setSession] = useState<OcrSession>(createOcrSession());
  const [lastResult, setLastResult] = useState<(OcrResult & { isReliable: boolean }) | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initTesseract({ tessDataPath, language: 'fas' }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    });

    return () => {
      destroyTesseract().catch(() => {});
    };
  }, [tessDataPath]);

  const handleStartScan = useCallback((mode: OcrScanMode) => {
    setError(null);
    setLastResult(null);
    try {
      setSession((prev) => startScan(prev, mode));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
    }
  }, []);

  const processImage = useCallback(async (base64Image: string) => {
    setError(null);
    try {
      setSession((prev) => beginProcessing(prev));

      const result = await recognizeBase64Image(base64Image, 'jpeg');
      setLastResult(result);
      setSession(finishScan);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setSession(createOcrSession);
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setSession(createOcrSession());
    setLastResult(null);
    setError(null);
  }, []);

  return {
    session,
    lastResult,
    startScan: handleStartScan,
    processImage,
    reset,
    error,
  };
}
