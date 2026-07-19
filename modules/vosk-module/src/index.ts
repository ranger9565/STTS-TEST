/**
 * رابط TypeScript برای ماژول native Vosk STT.
 * موتور Vosk از طریق JNI در کاتلین پیاده‌سازی شده است.
 */
import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

const VoskNative = NativeModulesProxy.VoskModule;

export interface VoskPartialResult {
  partial: string;
}

export interface VoskFinalResult {
  text: string;
}

export interface VoskErrorResult {
  error: string;
}

/** مقداردهی اولیه موتور Vosk با مسیر مدل
 *  @param modelPath مسیر مطلق پوشه مدل (مثلاً: /data/data/…/files/vosk-model-small-fa-0.42)
 */
export async function voskInit(modelPath: string): Promise<void> {
  return VoskNative.init(modelPath);
}

/** شروع تشخیص صوت — باید قبل از feedAudio فراخوانی شود */
export async function voskStart(sampleRate: number = 16000): Promise<void> {
  return VoskNative.start(sampleRate);
}

/**
 * ارسال بلوک صوتی PCM 16-bit به موتور Vosk.
 * samples باید Int16Array یا base64-encoded bytes باشد.
 * @returns نتیجه جزئی یا null اگر هنوز آماده نشده
 */
export async function voskFeedAudio(samplesBase64: string): Promise<VoskPartialResult | null> {
  return VoskNative.feedAudio(samplesBase64);
}

/** توقف ضبط و دریافت نتیجه نهایی */
export async function voskStop(): Promise<VoskFinalResult> {
  return VoskNative.stop();
}

/** آزادسازی منابع موتور Vosk */
export async function voskDestroy(): Promise<void> {
  return VoskNative.destroy();
}
