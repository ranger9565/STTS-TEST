/**
 * رابط TypeScript برای حباب شناور سیستمی (Overlay) روی اندروید.
 * پیاده‌سازی واقعی در OverlayService.kt انجام می‌شود.
 */
import { NativeModulesProxy } from 'expo-modules-core';

const OverlayNative = NativeModulesProxy.OverlayModule;

export type OverlayBubbleMode = 'stt' | 'tts' | 'ocr';

export function hasOverlayPermission(): boolean {
  return OverlayNative.hasOverlayPermission();
}

export function requestOverlayPermission(): void {
  OverlayNative.requestOverlayPermission();
}

export async function startOverlayBubble(mode: OverlayBubbleMode): Promise<void> {
  return OverlayNative.startBubble(mode);
}

/** فقط همان mode را حذف می‌کند؛ سایر حباب‌ها دست‌نخورده می‌مانند. */
export async function stopOverlayBubble(mode: OverlayBubbleMode): Promise<void> {
  return OverlayNative.stopBubble(mode);
}
