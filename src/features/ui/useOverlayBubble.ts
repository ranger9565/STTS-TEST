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
 * هر mode مستقل مدیریت می‌شود؛ تغییر وضعیت یک حباب نباید باعث خاموش/روشن
 * شدن بی‌دلیل حباب‌های دیگر شود. حباب‌ها فقط در background فعال هستند.
 */
export function useOverlayBubble(bubbles: BubbleVisibility): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const bubblesRef = useRef(bubbles);
  const startedModesRef = useRef<Set<OverlayBubbleMode>>(new Set());

  bubblesRef.current = bubbles;

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
        // تلاش بعدی با تغییر lifecycle یا وضعیت حباب انجام می‌شود.
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

    const reconcile = () => {
      const requested = bubblesRef.current;

      if (appState.current !== 'background' && appState.current !== 'inactive') {
        Array.from(startedModesRef.current).forEach((mode) => {
          if (!requested[mode]) void stopMode(mode);
        });
        return;
      }

      (Object.keys(requested) as OverlayBubbleMode[]).forEach((mode) => {
        if (requested[mode]) void startMode(mode);
        else void stopMode(mode);
      });
    };

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const previous = appState.current;
      appState.current = next;

      const wasActive = previous === 'active';
      const isNowBackground = next === 'inactive' || next === 'background';
      const wasBackground = previous === 'inactive' || previous === 'background';
      const isNowActive = next === 'active';

      if (wasActive && isNowBackground) {
        reconcile();
      } else if (wasBackground && isNowActive) {
        Array.from(startedModesRef.current).forEach((mode) => void stopMode(mode));
      }
    });

    reconcile();

    return () => {
      subscription.remove();
      Array.from(startedModesRef.current).forEach((mode) => void stopMode(mode));
    };
  }, []);

  useEffect(() => {
    if (appState.current === 'background' || appState.current === 'inactive') {
      const requested = new Set(
        (Object.keys(bubbles) as OverlayBubbleMode[]).filter((mode) => bubbles[mode]),
      );

      Array.from(startedModesRef.current).forEach((mode) => {
        if (!requested.has(mode)) {
          void stopOverlayBubble(mode);
          startedModesRef.current.delete(mode);
        }
      });

      requested.forEach((mode) => {
        if (hasOverlayPermission() && !startedModesRef.current.has(mode)) {
          void startOverlayBubble(mode).then(
            () => startedModesRef.current.add(mode),
            () => {},
          );
        }
      });
    }
  }, [bubbles]);
}
