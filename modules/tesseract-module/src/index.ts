/**
 * رابط TypeScript برای ماژول native Tesseract4Android OCR.
 */
import { NativeModulesProxy } from 'expo-modules-core';

const TesseractNative = NativeModulesProxy.TesseractModule;

export interface TesseractResult {
  text: string;
  /** عدد اطمینان ۰ تا ۱۰۰ (از Tesseract)، تبدیل‌شده به ۰-۱ */
  confidence: number;
}

/**
 * مقداردهی اولیه موتور Tesseract.
 * @param tessDataPath مسیر پوشه‌ای که پوشه tessdata درون آن قرار دارد
 * @param language کد زبان Tesseract (مثلاً "fas" برای فارسی، "eng" برای انگلیسی)
 */
export async function tesseractInit(
  tessDataPath: string,
  language: string = 'fas',
): Promise<void> {
  return TesseractNative.init(tessDataPath, language);
}

/**
 * تشخیص متن از یک تصویر ذخیره‌شده روی دستگاه.
 * @param imagePath مسیر مطلق فایل تصویر (JPEG یا PNG)
 */
export async function tesseractRecognize(imagePath: string): Promise<TesseractResult> {
  return TesseractNative.recognize(imagePath);
}

/** آزادسازی منابع Tesseract */
export async function tesseractDestroy(): Promise<void> {
  return TesseractNative.destroy();
}
