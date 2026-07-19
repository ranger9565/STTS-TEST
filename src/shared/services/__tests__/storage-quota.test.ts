import { getStorageStatus, canStoreNewAudio, HISTORY_CAP_BYTES } from '../storage-quota';

test('زیر ۸۰٪ وضعیت ok است', () => {
  const info = getStorageStatus(HISTORY_CAP_BYTES * 0.5);
  expect(info.status).toBe('ok');
});

test('بین ۸۰ تا ۹۹٪ وضعیت warning است', () => {
  const info = getStorageStatus(HISTORY_CAP_BYTES * 0.85);
  expect(info.status).toBe('warning');
  expect(info.percentUsed).toBe(85);
});

test('در ۱۰۰٪ یا بیشتر وضعیت full است', () => {
  const info = getStorageStatus(HISTORY_CAP_BYTES * 1.2);
  expect(info.status).toBe('full');
  expect(info.percentUsed).toBe(100);
});

test('اگر فایل جدید از سقف رد کند، اجازه ذخیره داده نمی‌شود', () => {
  const used = HISTORY_CAP_BYTES * 0.99;
  const newFile = HISTORY_CAP_BYTES * 0.05;
  expect(canStoreNewAudio(used, newFile)).toBe(false);
});

test('اگر فایل جدید در سقف جا شود، اجازه داده می‌شود', () => {
  const used = HISTORY_CAP_BYTES * 0.5;
  const newFile = HISTORY_CAP_BYTES * 0.1;
  expect(canStoreNewAudio(used, newFile)).toBe(true);
});
