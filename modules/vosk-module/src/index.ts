/**
 * رابط TypeScript برای ماژول native Vosk STT.
 * موتور Vosk از طریق JNI در کاتلین پیاده‌سازی شده است.
 * ضبط زنده میکروفون کاملاً native انجام می‌شود (AudioRecord)؛
 * نتایج جزئی/نهایی از طریق رویداد به JS می‌رسند.
 */
import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

const VoskNative = NativeModulesProxy.VoskModule;
const voskEmitter = new EventEmitter(VoskNative);

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

/**
 * شروع ضبط زنده میکروفون + تشخیص گفتار — کاملاً در سمت native.
 * نتایج از طریق addPartialResultListener / addFinalResultListener دریافت می‌شوند.
 */
export async function voskStart(sampleRate: number = 16000): Promise<void> {
  return VoskNative.start(sampleRate);
}

/**
 * ارسال دستی بلوک صوتی PCM 16-bit (برای مسیرهای غیر زنده، مثل transcribeFile آینده).
 * samplesBase64 باید base64-encoded bytes باشد.
 */
export async function voskFeedAudio(samplesBase64: string): Promise<VoskPartialResult | null> {
  return VoskNative.feedAudio(samplesBase64);
}

/** توقف ضبط زنده و دریافت نتیجه نهایی */
export async function voskStop(): Promise<VoskFinalResult> {
  return VoskNative.stop();
}

/** آزادسازی منابع موتور Vosk */
export async function voskDestroy(): Promise<void> {
  return VoskNative.destroy();
}

/** ثبت شنونده برای نتیجه جزئی (حین صحبت کردن) */
export function addPartialResultListener(
  listener: (event: VoskPartialResult) => void,
): Subscription {
  return voskEmitter.addListener<VoskPartialResult>('onPartialResult', listener);
}

/** ثبت شنونده برای نتیجه نهایی هر بخش گفتار */
export function addFinalResultListener(
  listener: (event: VoskFinalResult) => void,
): Subscription {
  return voskEmitter.addListener<VoskFinalResult>('onFinalResult', listener);
}

/** ثبت شنونده برای خطاهای حین ضبط زنده میکروفون */
export function addErrorListener(
  listener: (event: VoskErrorResult) => void,
): Subscription {
  return voskEmitter.addListener<VoskErrorResult>('onError', listener);
}
