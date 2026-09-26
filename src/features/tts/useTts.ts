import { useState, useCallback, useEffect, useRef } from 'react';
import {
  initPiper,
  speak,
  stopSpeaking,
  destroyPiper,
  PIPER_MODELS_DIR,
  ESPEAK_DATA_DIR,
} from './piper-bridge';

export type TtsStatus = 'idle' | 'synthesizing' | 'playing' | 'error';

export interface UseTtsResult {
  status: TtsStatus;
  speak: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  error: Error | null;
}

export function useTts(
  modelsDir: string = PIPER_MODELS_DIR,
  espeakDataDir: string = ESPEAK_DATA_DIR,
): UseTtsResult {
  const [status, setStatus] = useState<TtsStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const initializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const promise = initPiper({ modelsDir, espeakDataDir });
    initPromiseRef.current = promise;

    promise.catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    });

    return () => {
      destroyPiper().catch(() => {});
      initPromiseRef.current = null;
    };
  }, [modelsDir, espeakDataDir]);

  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) {
      const e = new Error('TTS text cannot be empty');
      setError(e);
      setStatus('error');
      throw e;
    }

    setError(null);

    try {
      if (initPromiseRef.current) {
        await initPromiseRef.current;
      }

      // توقف امن پخش قبلی؛ لازم نیست status فعلی را از closure بخوانیم.
      // بنابراین تابع speak پایدار می‌ماند و Linking listener دوباره ثبت نمی‌شود.
      await stopSpeaking();

      setStatus('synthesizing');
      // speak() starts playback and returns immediately; the callback owns the
      // transition back to idle when playback actually finishes.
      setStatus('playing');
      await speak(text, () => setStatus('idle'));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus('error');
      throw e;
    }
  }, []);

  const stop = useCallback(async () => {
    await stopSpeaking();
    setStatus('idle');
  }, []);

  return { status, speak: speakText, stop, error };
}
