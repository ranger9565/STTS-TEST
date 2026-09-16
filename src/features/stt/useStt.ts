/**
 * React hook برای مدیریت کامل STT در UI.
 *
 * وضعیت‌ها و رویدادها از stt-session.ts می‌آیند؛
 * ارتباط با موتور Vosk از طریق vosk-bridge.ts انجام می‌شود؛
 * تایپ متن نهایی در فیلد فوکوس‌شده‌ی هر اپ دیگر از طریق typing-module انجام می‌شود.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SttSession,
  createSttSession,
  startListening,
  applyPartialResult,
  stopListening,
} from './stt-session';
import {
  initVosk,
  startRecording,
  stopRecording,
  destroyVosk,
  VOSK_MODEL_PATH,
} from './vosk-bridge';
import {
  isAccessibilityServiceEnabled,
  typeText,
} from '../../../modules/typing-module/src';

export interface UseSttResult {
  session: SttSession;
  partialText: string;
  /** شروع ضبط */
  start: () => Promise<void>;
  /** توقف ضبط و دریافت متن نهایی */
  stop: () => Promise<string>;
  /** پاکسازی state بدون توقف ضبط */
  reset: () => void;
  error: Error | null;
  /** آیا سرویس دسترس‌پذیری (لازم برای تایپ در اپ‌های دیگر) فعال است */
  isTypingEnabled: boolean;
}

export function useStt(modelPath: string = VOSK_MODEL_PATH): UseSttResult {
  const [session, setSession] = useState<SttSession>(createSttSession());
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isTypingEnabled, setIsTypingEnabled] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initVosk({ modelPath }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    });

    setIsTypingEnabled(isAccessibilityServiceEnabled());

    return () => {
      destroyVosk().catch(() => {});
    };
  }, [modelPath]);

  const start = useCallback(async () => {
    setError(null);
    setIsTypingEnabled(isAccessibilityServiceEnabled());

    try {
      setSession((prev) => startListening(prev));

      await startRecording(
        {
          onPartial: (text) => {
            setPartialText(text);
            setSession((prev) =>
              applyPartialResult(prev, { text, isFinal: false }),
            );
          },
          onFinal: (text) => {
            setSession((prev) =>
              applyPartialResult(prev, { text, isFinal: true }),
            );
            if (text.trim().length > 0 && isAccessibilityServiceEnabled()) {
              typeText(text.trim()).catch((err) => {
                setError(err instanceof Error ? err : new Error(String(err)));
              });
            }
          },
          onError: (err) => {
            setError(err);
            setSession(createSttSession());
          },
        },
      );
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setSession(createSttSession());
      throw e;
    }
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    try {
      const finalText = await stopRecording();
      setSession((prev) => stopListening(prev));
      setPartialText('');
      return finalText;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setSession(createSttSession());
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setSession(createSttSession());
    setPartialText('');
    setError(null);
  }, []);

  return { session, partialText, start, stop, reset, error, isTypingEnabled };
}
