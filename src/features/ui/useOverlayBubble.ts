import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  hasOverlayPermission,
  requestOverlayPermission,
  startOverlayBubble,
  stopOverlayBubble,
  type OverlayBubbleMode,
} from '../../../modules/overlay-module/src';

interface BubbleVisibility {
  stt: boolean;
  tts: boolean;
  ocr: boolean;
}

/**
 * مالک lifecycle حباب‌های system overlay.
 *
 * هر mode مستقل مدیریت می‌شود؛ بنابراین رفتن TTS به overlay یا توقف OCR
 * نباید حباب STT را خاموش کند. حباب‌ها فقط هنگام background شدن اپ به
 * system overlay منتقل می‌شوند و با برگشت اپ به foreground حذف می‌شوند.
 */
export function useOverlayBubble(bubbles: BubbleVisibility): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const startedModesRef = useRef<Set<OverlayBubbleMode>>(new Set());

  useEffect(() => {
    const startMode = async (mode: OverlayBubbleMode) => {
      if (startedModesRef.current.has(mode)) return;

      if (!hasOverlayPermission()) {
        requestOverlayPermission();
        return;
      }

      try {
        await startOverlayBubble(mode);
        startedModesRef.current.add(mode);
      } catch {
        // با تغییر بعدی lifecycle دوباره تلاش می‌شود.
      }
    };

    const stopMode = async (mode: OverlayBubbleMode) => {
      if (!startedModesRef.current.has(mode)) return;

      try {
        await stopOverlayBubble(mode);
      } finally {
        startedModesRef.current.delete(mode);
      }
    };

    const startAllRequested = () => {
      (Object.keys(bubbles) as OverlayBubbleMode[]).forEach((mode) => {
        if (bubbles[mode]) void startMode(mode);
      });
    };

    const stopAllStarted = () => {
      Array.from(startedModesRef.current).forEach((mode) => {
        void stopMode(mode);
      });
    };

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const previous = appState.current;
      const wasActive = previous === 'active';
      const isNowBackground = next === 'inactive' || next === 'background';
      const wasBackground = previous === 'inactive' || previous === 'background';
      const isNowActive = next === 'active';

      appState.current = next;

      if (wasActive && isNowBackground) {
        startAllRequested();
      } else if (wasBackground && isNowActive) {
        stopAllStarted();
      }
    });

    if (appState.current === 'background' || appState.current === 'inactive') {
      startAllRequested();
    } else {
      // اگر یک mode در foreground خاموش شده باشد، overlay قبلی همان mode را
      // نیز تمیز می‌کنیم؛ modeهای دیگر دست‌نخورده می‌مانند.
      Array.from(startedModesRef.current).forEach((mode) => {
        if (!bubbles[mode]) void stopMode(mode);
      });
    }

    return () => {
      subscription.remove();
      stopAllStarted();
    };
  }, [bubbles]);

  useEffect(() => {
    if (appState.current !== 'background' && appState.current !== 'inactive') return;

    const requestedModes = new Set(
      (Object.keys(bubbles) as OverlayBubbleMode[]).filter((mode) => bubbles[mode]),
    );

    Array.from(startedModesRef.current).forEach((mode) => {
      if (!requestedModes.has(mode)) {
        void stopOverlayBubble(mode);
        startedModesRef.current.delete(mode);
      }
    });

    requestedModes.forEach((mode) => {
      if (hasOverlayPermission()) {
        void startOverlayBubble(mode).then(
          () => startedModesRef.current.add(mode),
          () => {},
        );
      }
    });
  }, [bubbles]);
}
