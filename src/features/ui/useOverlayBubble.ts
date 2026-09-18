import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  hasOverlayPermission,
  requestOverlayPermission,
  startOverlayBubble,
  stopOverlayBubble,
} from '../../../modules/overlay-module/src';

/**
 * فقط حباب STT در خارج از اپ به‌صورت system overlay اجرا می‌شود.
 *
 * این hook عمداً مالکیت سایر حباب‌ها را لمس نمی‌کند. بنابراین بازشدن TTS/OCR
 * نباید باعث خاموش‌شدن حباب STT شود و بعداً می‌توان هر mode را مستقل به
 * system overlay منتقل کرد.
 */
export function useOverlayBubble(shouldShowMicBubble: boolean): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const overlayStartedRef = useRef(false);

  useEffect(() => {
    const startMicOverlay = async () => {
      if (overlayStartedRef.current) return;

      if (!hasOverlayPermission()) {
        requestOverlayPermission();
        return;
      }

      try {
        await startOverlayBubble('stt');
        overlayStartedRef.current = true;
      } catch {
        // در صورت خطای مجوز/سرویس، تلاش بعدی با تغییر وضعیت انجام می‌شود.
      }
    };

    const stopMicOverlay = async () => {
      if (!overlayStartedRef.current) return;
      try {
        await stopOverlayBubble('stt');
      } finally {
        overlayStartedRef.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const previous = appState.current;
      const wasActive = previous === 'active';
      const isNowBackground = next === 'inactive' || next === 'background';
      const wasBackground = previous === 'inactive' || previous === 'background';
      const isNowActive = next === 'active';

      appState.current = next;

      if (!shouldShowMicBubble) return;

      if (wasActive && isNowBackground) {
        startMicOverlay();
      } else if (wasBackground && isNowActive) {
        stopMicOverlay();
      }
    });

    if (!shouldShowMicBubble) {
      stopMicOverlay();
    }

    return () => subscription.remove();
  }, [shouldShowMicBubble]);
}
