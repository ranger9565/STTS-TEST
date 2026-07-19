/**
 * React hook برای مدیریت کامل TTS در UI.
 *
 * مدل‌های Piper مقداردهی می‌شوند؛
 * صف پخش PlaybackQueue هماهنگ می‌شود.
 */

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
  /** تبدیل متن به صدا و پخش */
  speak: (text: string) => Promise<void>;
  /** توقف پخش جاری */
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

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initPiper({ modelsDir, espeakDataDir }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    });

    return () => {
      destroyPiper().catch(() => {});
    };
  }, [modelsDir, espeakDataDir]);

  const speakText = useCallback(async (text: string) => {
    if (status === 'playing' || status === 'synthesizing') {
      await stopSpeaking();
    }

    setError(null);
    setStatus('synthesizing');

    try {
      await speak(text, () => {
        setStatus('idle');
      });
      setStatus('playing');
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus('error');
      throw e;
    }
  }, [status]);

  const stop = useCallback(async () => {
    await stopSpeaking();
    setStatus('idle');
  }, []);

  return { status, speak: speakText, stop, error };
}
