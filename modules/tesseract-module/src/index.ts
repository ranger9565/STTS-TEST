/**
 * رابط TypeScript برای ماژول native Tesseract4Android OCR.
 */
import { requireNativeModule } from 'expo-modules-core';

interface TesseractNativeModule {
  init(tessDataPath: string, language: string): Promise<void>;
  recognize(imagePath: string): Promise<TesseractResult>;
  destroy(): Promise<void>;
}

const TesseractNative = requireNativeModule<TesseractNativeModule>('TesseractModule');

export interface TesseractResult {
  text: string;
  /** عدد اطمینان ۰ تا ۱۰۰ (از Tesseract)، تبدیل‌شده به ۰-۱ */
  confidence: number;
}

export async function tesseractInit(
  tessDataPath: string,
  language: string = 'fas',
): Promise<void> {
  return TesseractNative.init(tessDataPath, language);
}

export async function tesseractRecognize(imagePath: string): Promise<TesseractResult> {
  return TesseractNative.recognize(imagePath);
}

export async function tesseractDestroy(): Promise<void> {
  return TesseractNative.destroy();
}
