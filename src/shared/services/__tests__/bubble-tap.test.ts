import { decideBubbleTapAction } from '../bubble-tap';

test('اگر همه‌چیز آماده است، تپ ضبط را شروع می‌کند (بدون باز کردن اپ)', () => {
  expect(
    decideBubbleTapAction({ isListening: false, micGranted: true, typingEnabled: true }),
  ).toBe('start');
});

test('در حال ضبط، تپ ضبط را متوقف می‌کند', () => {
  expect(
    decideBubbleTapAction({ isListening: true, micGranted: true, typingEnabled: true }),
  ).toBe('stop');
});

test('توقف ضبط حتی وقتی سرویس دسترس‌پذیری خاموش شده هم کار می‌کند', () => {
  expect(
    decideBubbleTapAction({ isListening: true, micGranted: false, typingEnabled: false }),
  ).toBe('stop');
});

test('بدون مجوز میکروفون، اپ باز می‌شود تا مجوز گرفته شود', () => {
  expect(
    decideBubbleTapAction({ isListening: false, micGranted: false, typingEnabled: true }),
  ).toBe('open_app');
});

test('بدون سرویس دسترس‌پذیری، اپ باز می‌شود تا راهنمای فعال‌سازی نشان داده شود', () => {
  expect(
    decideBubbleTapAction({ isListening: false, micGranted: true, typingEnabled: false }),
  ).toBe('open_app');
});
