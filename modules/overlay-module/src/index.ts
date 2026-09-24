/**
 * رابط TypeScript برای حباب شناور سیستمی (Overlay) روی اندروید.
 * پیاده‌سازی واقعی در OverlayService.kt انجام می‌شود.
 */
import { requireNativeModule, EventSubscription } from 'expo-modules-core';

interface OverlayNativeModule {
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  startBubble(mode: OverlayBubbleMode, visible: boolean): Promise<void>;
  setBubbleVisibility(mode: OverlayBubbleMode, visible: boolean): Promise<void>;
  stopBubble(mode: OverlayBubbleMode): Promise<void>;
  setBubbleActive(mode: OverlayBubbleMode, active: boolean): Promise<void>;
  addListener(
    eventName: 'onBubbleTap',
    listener: (event: OverlayBubbleTapEvent) => void,
  ): EventSubscription;
}

export interface OverlayBubbleTapEvent {
  mode: OverlayBubbleMode;
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

/** حباب را «فعال» (قرمز) یا عادی نشان می‌دهد؛ مثلاً وقتی میکروفون در حال ضبط است. */
export function setOverlayBubbleActive(mode: OverlayBubbleMode, active: boolean): Promise<void> {
  return OverlayNative.setBubbleActive(mode, active);
}

/**
 * تپ روی حباب STT را بدون جلو آوردن اپ دریافت می‌کند.
 * تا وقتی این listener زنده است، تپ حباب STT اپ را باز نمی‌کند.
 */
export function addBubbleTapListener(
  listener: (event: OverlayBubbleTapEvent) => void,
): EventSubscription {
  return OverlayNative.addListener('onBubbleTap', listener);
}
