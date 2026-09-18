/**
 * رابط TypeScript برای تایپ متن تشخیص‌داده‌شده در فیلد فوکوس‌شده‌ی هر اپ دیگر
 * (از طریق AccessibilityService، نه IME).
 */
import { requireNativeModule } from 'expo-modules-core';

interface TypingNativeModule {
  isAccessibilityServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  typeText(text: string): Promise<void>;
}

const TypingNative = requireNativeModule<TypingNativeModule>('TypingModule');

export function isAccessibilityServiceEnabled(): boolean {
  return TypingNative.isAccessibilityServiceEnabled();
}

export function openAccessibilitySettings(): void {
  TypingNative.openAccessibilitySettings();
}

export async function typeText(text: string): Promise<void> {
  return TypingNative.typeText(text);
}
