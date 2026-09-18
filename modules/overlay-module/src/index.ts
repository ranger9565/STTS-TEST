/**
 * رابط TypeScript برای حباب شناور سیستمی (Overlay) روی اندروید.
 * پیاده‌سازی واقعی در OverlayService.kt انجام می‌شود.
 */
import { requireNativeModule } from 'expo-modules-core';

interface OverlayNativeModule {
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  startBubble(mode: OverlayBubbleMode, visible: boolean): Promise<void>;
  setBubbleVisibility(mode: OverlayBubbleMode, visible: boolean): Promise<void>;
  stopBubble(mode: OverlayBubbleMode): Promise<void>;
}

export type OverlayBubbleMode = 'stt' | 'tts' | 'ocr';

const OverlayNative = requireNativeModule<OverlayNativeModule>('OverlayModule');

export function hasOverlayPermission(): boolean {
  return OverlayNative.hasOverlayPermission();
}

export function requestOverlayPermission(): void {
  OverlayNative.requestOverlayPermission();
}

export function startOverlayBubble(mode: OverlayBubbleMode, visible = true): Promise<void> {
  return OverlayNative.startBubble(mode, visible);
}

export function setOverlayBubbleVisibility(mode: OverlayBubbleMode, visible: boolean): Promise<void> {
  return OverlayNative.setBubbleVisibility(mode, visible);
}

export function stopOverlayBubble(mode: OverlayBubbleMode): Promise<void> {
  return OverlayNative.stopBubble(mode);
}
