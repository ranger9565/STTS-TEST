/**
 * رابط TypeScript برای ماژول native Piper TTS.
 * فونیمیزیشن (espeak-ng) و synthesis (ONNX Runtime) در کاتلین انجام می‌شود.
 */
import { NativeModulesProxy } from 'expo-modules-core';

const PiperNative = NativeModulesProxy.PiperModule;

/**
 * مقداردهی اولیه موتور Piper.
 * @param modelPath مسیر مطلق فایل .onnx مدل روی دستگاه
 * @param configPath مسیر فایل .json کانفیگ مدل (کنار فایل .onnx)
 * @param espeakDataPath مسیر پوشه espeak-ng-data (برای فونیمیزیشن)
 */
export async function piperInit(
  modelPath: string,
  configPath: string,
  espeakDataPath: string,
): Promise<void> {
  return PiperNative.init(modelPath, configPath, espeakDataPath);
}

/**
 * تبدیل متن به صدا با مدل Piper.
 * @param text متن ورودی (فارسی یا انگلیسی)
 * @param modelId شناسه مدل مشخص‌کننده زبان (مثلاً "fa_IR-gyro-medium")
 * @returns base64-encoded WAV bytes
 */
export async function piperSynthesize(text: string, modelId: string): Promise<string> {
  return PiperNative.synthesize(text, modelId);
}

/** آزادسازی منابع ONNX Runtime */
export async function piperDestroy(): Promise<void> {
  return PiperNative.destroy();
}
