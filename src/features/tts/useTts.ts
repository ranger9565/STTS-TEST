/**
 * React hook برای مدیریت TTS در UI.
 *
 * مدل‌های Piper مقداردهی می‌شوند و وضعیت synthesis/playback
 * برای کنترل‌های UI برگردانده می‌شود.
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
    if (!text.trim()) {
      const e = new Error('TTS text cannot be empty');
      setError(e);
      setStatus('error');
      throw e;
    }

    setError(null);

    try {
      if (status === 'playing' || status === 'synthesizing') {
        await stopSpeaking();
      }

      setStatus('synthesizing');

      await speak(text, () => {
        setStatus('idle');
      });

      // speak() resolves when playback has started.
      // The callback above changes it back to idle when playback finishes.
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
