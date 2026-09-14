/**
 * رابط TypeScript برای حباب شناور سیستمی (Overlay) روی اندروید.
 * پیاده‌سازی واقعی در OverlayService.kt (سرویس + WindowManager) انجام می‌شود.
 */
import { NativeModulesProxy } from 'expo-modules-core';

const OverlayNative = NativeModulesProxy.OverlayModule;

export type OverlayBubbleMode = 'stt' | 'tts' | 'ocr';

/** آیا مجوز «نمایش روی برنامه‌های دیگر» به اپ داده شده است */
export function hasOverlayPermission(): boolean {
  return OverlayNative.hasOverlayPermission();
}

/** باز کردن صفحه‌ی تنظیمات اندروید برای اعطای مجوز Overlay */
export function requestOverlayPermission(): void {
  OverlayNative.requestOverlayPermission();
}

/**
 * نمایش حباب شناور سیستمی (بیرون از اپ، روی همه‌ی برنامه‌ها).
 * پیش‌نیاز: hasOverlayPermission() باید true باشد، وگرنه throw می‌کند.
 */
export async function startOverlayBubble(mode: OverlayBubbleMode): Promise<void> {
  return OverlayNative.startBubble(mode);
}

/** حذف کامل حباب شناور سیستمی */
export async function stopOverlayBubble(): Promise<void> {
  return OverlayNative.stopBubble();
}
