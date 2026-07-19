/**
 * رابط بین منطق جلسه OCR (ocr-session.ts) و ماژول native Tesseract4Android.
 *
 * این فایل:
 *   ۱. موتور Tesseract را با زبان فارسی مقداردهی می‌کند
 *   ۲. تصویر گرفته‌شده توسط expo-camera را پردازش می‌کند
 *   ۳. نتیجه را از طریق isResultReliable() از ocr-session.ts ارزیابی می‌کند
 */

import * as FileSystem from 'expo-file-system';
import { tesseractInit, tesseractRecognize, tesseractDestroy } from '../../../modules/tesseract-module/src';
import { OcrResult, isResultReliable } from './ocr-session';

export interface TesseractBridgeConfig {
  /**
   * مسیر پوشه‌ای که tessdata/ درون آن است.
   * مثلاً: /data/data/com.hossein.stts/files
   * (tessdata/fas.traineddata باید از assets کپی شده باشد)
   */
  tessDataPath: string;
  /** کد زبان Tesseract — پیش‌فرض "fas" برای فارسی */
  language?: string;
}

/** مسیر پیش‌فرض tessdata در فضای ذخیره‌سازی اپ */
export const TESSDATA_PATH = FileSystem.documentDirectory ?? '';

let isInitialized = false;

/** مقداردهی اولیه Tesseract — یک بار در startup اپ */
export async function initTesseract(config: TesseractBridgeConfig): Promise<void> {
  if (isInitialized) return;
  await tesseractInit(config.tessDataPath, config.language ?? 'fas');
  isInitialized = true;
}

/**
 * تشخیص متن از یک فایل تصویر.
 *
 * @param imagePath مسیر مطلق فایل تصویر روی دستگاه
 * @param confidenceThreshold آستانه قابلیت اطمینان (پیش‌فرض ۰.۶)
 * @returns {text, confidence, isReliable}
 */
export async function recognizeImage(
  imagePath: string,
  confidenceThreshold = 0.6,
): Promise<OcrResult & { isReliable: boolean }> {
  if (!isInitialized) {
    throw new Error('Tesseract bridge not initialized — call initTesseract() first');
  }

  const raw = await tesseractRecognize(imagePath);
  const result: OcrResult = {
    text: raw.text,
    confidence: raw.confidence,
  };

  return {
    ...result,
    isReliable: isResultReliable(result, confidenceThreshold),
  };
}

/**
 * تشخیص متن از base64-encoded تصویر.
 * تصویر موقتاً در cache ذخیره می‌شود، پردازش می‌شود و سپس حذف می‌گردد.
 */
export async function recognizeBase64Image(
  base64Image: string,
  mimeType: 'jpeg' | 'png' = 'jpeg',
  confidenceThreshold = 0.6,
): Promise<OcrResult & { isReliable: boolean }> {
  const tempPath = `${FileSystem.cacheDirectory}ocr_${Date.now()}.${mimeType}`;

  await FileSystem.writeAsStringAsync(tempPath, base64Image, {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    return await recognizeImage(tempPath, confidenceThreshold);
  } finally {
    // حذف فایل موقت حتی در صورت خطا
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }
}

/** آزادسازی منابع Tesseract */
export async function destroyTesseract(): Promise<void> {
  await tesseractDestroy();
  isInitialized = false;
}
