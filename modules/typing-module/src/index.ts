/**
 * رابط TypeScript برای تایپ متن تشخیص‌داده‌شده در فیلد فوکوس‌شده‌ی هر اپ دیگر
 * (از طریق AccessibilityService، نه IME).
 */
import { NativeModulesProxy } from 'expo-modules-core';

const TypingNative = NativeModulesProxy.TypingModule;

/** آیا کاربر سرویس دسترس‌پذیری STTS را از تنظیمات اندروید فعال کرده است */
export function isAccessibilityServiceEnabled(): boolean {
  return TypingNative.isAccessibilityServiceEnabled();
}

/** باز کردن صفحه‌ی تنظیمات دسترس‌پذیری اندروید تا کاربر خودش سرویس را فعال کند */
export function openAccessibilitySettings(): void {
  TypingNative.openAccessibilitySettings();
}

/**
 * تایپ متن در فیلد ورودیِ فوکوس‌شده‌ی فعلی (در هر اپی که باز باشد).
 * پیش‌نیاز: isAccessibilityServiceEnabled() باید true باشد، وگرنه throw می‌کند.
 */
export async function typeText(text: string): Promise<void> {
  return TypingNative.typeText(text);
}
