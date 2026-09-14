import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  hasOverlayPermission,
  requestOverlayPermission,
  startOverlayBubble,
  stopOverlayBubble,
} from '../../../modules/overlay-module/src';

/**
 * پل بین حباب داخل‌اپ (FloatingBubble.tsx) و حباب سیستمی واقعی (OverlayService.kt).
 *
 * وقتی اپ به بک‌گراند می‌رود و حباب میکروفون باید فعال بماند، همان حباب را به‌صورت
 * حباب سیستمی (روی همه‌ی برنامه‌ها، طبق مشخصات) نشان می‌دهیم؛ وقتی اپ به foreground
 * برمی‌گردد (چه با تپ‌کردن حباب سیستمی چه با بازکردن دستی اپ)، حباب سیستمی بسته
 * می‌شود و حباب داخل‌اپ دوباره جایگزینش می‌شود.
 *
 * طبق تصمیم فعلی: فقط حباب میکروفون مجاز است روی همه‌ی برنامه‌ها (حتی صوتی‌تصویری)
 * بنشیند. حباب TTS/OCR فعلاً فقط داخل‌اپ باقی می‌مانند — تمایز نهایی (مثلاً تشخیص
 * برنامه صوتی‌تصویری در فورگراند) به فاز بعد موکول شده است.
 *
 * @param shouldShowMicBubble حباب میکروفون در حال حاضر باید نمایش داده شود
 *   (یعنی activeFeature === 'stt' && bubbleVisible && پنل میکروفون بسته است)
 */
export function useOverlayBubble(shouldShowMicBubble: boolean): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isNowBackground = next === 'inactive' || next === 'background';
      const isNowActive = next === 'active';
      const wasBackground = appState.current === 'inactive' || appState.current === 'background';

      appState.current = next;

      if (!shouldShowMicBubble) return;

      if (wasActive && isNowBackground) {
        if (hasOverlayPermission()) {
          startOverlayBubble('stt').catch(() => {
            // نادیده می‌گیریم — کاربر می‌تواند دوباره اپ را باز کند و امتحان کند
          });
        } else {
          requestOverlayPermission();
        }
      } else if (wasBackground && isNowActive) {
        stopOverlayBubble().catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [shouldShowMicBubble]);

  // اگر شرط نمایش در همین رندر false شد (مثلاً کاربر پنل میکروفون را باز کرد)،
  // حباب سیستمی احتمالاً فعال باقی‌مانده را هم می‌بندیم.
  useEffect(() => {
    if (!shouldShowMicBubble) {
      stopOverlayBubble().catch(() => {});
    }
  }, [shouldShowMicBubble]);
}
