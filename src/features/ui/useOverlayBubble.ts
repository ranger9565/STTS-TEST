import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  hasOverlayPermission,
  requestOverlayPermission,
  startOverlayBubble,
  setOverlayBubbleVisibility,
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
  const pendingStartRef = useRef<Set<OverlayBubbleMode>>(new Set());
  const pendingStopRef = useRef<Set<OverlayBubbleMode>>(new Set());
  const permissionRequestedRef = useRef(false);
  const reconcileRef = useRef<() => void>(() => {});

  bubblesRef.current = bubbles;

  useEffect(() => {
    const startMode = async (mode: OverlayBubbleMode) => {
      if (
        startedModesRef.current.has(mode) ||
        pendingStartRef.current.has(mode)
      ) {
        return;
      }

      if (!hasOverlayPermission()) {
        if (!permissionRequestedRef.current) {
          permissionRequestedRef.current = true;
          requestOverlayPermission();
        }
        return;
      }

      permissionRequestedRef.current = false;

      pendingStartRef.current.add(mode);
      try {
        await startOverlayBubble(mode, appState.current === 'background' || appState.current === 'inactive');
        startedModesRef.current.add(mode);
      } catch {
        // تلاش بعدی با تغییر lifecycle یا وضعیت حباب انجام می‌شود.
      } finally {
        pendingStartRef.current.delete(mode);
      }
    };

    const stopMode = async (mode: OverlayBubbleMode) => {
      if (
        !startedModesRef.current.has(mode) ||
        pendingStopRef.current.has(mode)
      ) {
        return;
      }

      pendingStopRef.current.add(mode);
      try {
        await stopOverlayBubble(mode);
      } finally {
        pendingStopRef.current.delete(mode);
        startedModesRef.current.delete(mode);
      }
    };

    const reconcile = () => {
      const requested = bubblesRef.current;
      const isBackground =
        appState.current === 'background' || appState.current === 'inactive';

      (Object.keys(requested) as OverlayBubbleMode[]).forEach((mode) => {
        if (requested[mode]) {
          void startMode(mode);
        } else {
          void stopMode(mode);
        }
      });

      Array.from(startedModesRef.current).forEach((mode) => {
        if (requested[mode]) {
          void setOverlayBubbleVisibility(mode, isBackground);
        }
      });
    };

    reconcileRef.current = reconcile;

    const subscription = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        const previous = appState.current;
        appState.current = next;

        const wasActive = previous === 'active';
        const isNowBackground =
          next === 'inactive' || next === 'background';
        const wasBackground =
          previous === 'inactive' || previous === 'background';
        const isNowActive = next === 'active';

        if (wasActive && isNowBackground) {
          reconcile();
        } else if (wasBackground && isNowActive) {
          permissionRequestedRef.current = false;
          Array.from(startedModesRef.current).forEach((mode) =>
            void setOverlayBubbleVisibility(mode, false),
          );
          reconcile();
        }
      },
    );

    return () => {
      subscription.remove();
      reconcileRef.current = () => {};
      Array.from(startedModesRef.current).forEach((mode) =>
        void stopMode(mode),
      );
    };
  }, []);

  useEffect(() => {
    if (
      appState.current === 'background' ||
      appState.current === 'inactive'
    ) {
      reconcileRef.current();
    }
  }, [bubbles]);
}
