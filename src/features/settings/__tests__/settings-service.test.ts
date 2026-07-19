import { DEFAULT_SETTINGS, clampPlaybackSpeed, updateSettings } from '../settings-service';

test('تنظیمات پیش‌فرض درست است', () => {
  expect(DEFAULT_SETTINGS.language).toBe('fa');
  expect(DEFAULT_SETTINGS.voiceGender).toBe('female');
  expect(DEFAULT_SETTINGS.playbackSpeed).toBe(1.0);
});

test('سرعت پایین‌تر از حد مجاز به کف محدود می‌شود', () => {
  expect(clampPlaybackSpeed(0.1)).toBe(0.5);
});

test('سرعت بالاتر از حد مجاز به سقف محدود می‌شود', () => {
  expect(clampPlaybackSpeed(5)).toBe(2.0);
});

test('سرعت داخل بازه بدون تغییر باقی می‌ماند', () => {
  expect(clampPlaybackSpeed(1.5)).toBe(1.5);
});

test('updateSettings فقط فیلدهای تغییریافته را عوض می‌کند', () => {
  const updated = updateSettings(DEFAULT_SETTINGS, { language: 'en' });
  expect(updated.language).toBe('en');
  expect(updated.voiceGender).toBe('female'); // بدون تغییر
});

test('updateSettings سرعت خارج از بازه را کلمپ می‌کند', () => {
  const updated = updateSettings(DEFAULT_SETTINGS, { playbackSpeed: 3 });
  expect(updated.playbackSpeed).toBe(2.0);
});
