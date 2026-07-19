/**
 * محاسبه وضعیت فضای تاریخچه بر اساس سقف ۵۰۰ مگابایت.
 * هشدار در ۸۰-۹۹٪، نیاز به پاک‌سازی دستی در ۱۰۰٪.
 */

export const HISTORY_CAP_BYTES = 500 * 1024 * 1024; // ۵۰۰ مگابایت

export type StorageStatus = 'ok' | 'warning' | 'full';

export interface StorageInfo {
  usedBytes: number;
  capBytes: number;
  percentUsed: number;
  status: StorageStatus;
}

export function getStorageStatus(usedBytes: number): StorageInfo {
  const percentUsed = Math.min((usedBytes / HISTORY_CAP_BYTES) * 100, 100);

  let status: StorageStatus = 'ok';
  if (percentUsed >= 100) {
    status = 'full';
  } else if (percentUsed >= 80) {
    status = 'warning';
  }

  return {
    usedBytes,
    capBytes: HISTORY_CAP_BYTES,
    percentUsed: Math.round(percentUsed * 10) / 10,
    status,
  };
}

/** آیا اجازه ذخیره فایل صوتی جدید با این حجم وجود دارد؟ */
export function canStoreNewAudio(currentUsedBytes: number, newFileBytes: number): boolean {
  return currentUsedBytes + newFileBytes <= HISTORY_CAP_BYTES;
}
