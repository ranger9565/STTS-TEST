/**
 * رابط TypeScript برای ماژول native Piper TTS.
 * فونیمیزیشن (espeak-ng) و synthesis (ONNX Runtime) در کاتلین انجام می‌شود.
 */
import { requireNativeModule } from 'expo-modules-core';

interface PiperNativeModule {
  init(modelPath: string, configPath: string, espeakDataPath: string): Promise<void>;
  synthesize(text: string, modelId: string): Promise<string>;
  destroy(): Promise<void>;
}

const PiperNative = requireNativeModule<PiperNativeModule>('PiperModule');

export async function piperInit(
  modelPath: string,
  configPath: string,
  espeakDataPath: string,
): Promise<void> {
  return PiperNative.init(modelPath, configPath, espeakDataPath);
}

export async function piperSynthesize(text: string, modelId: string): Promise<string> {
  return PiperNative.synthesize(text, modelId);
}

export async function piperDestroy(): Promise<void> {
  return PiperNative.destroy();
}
