/**
 * رابط بین منطق جلسه STT (stt-session.ts) و ماژول native Vosk.
 *
 * این فایل:
 *   ۱. ماژول Vosk native را مقداردهی می‌کند
 *   ۲. جلسه ضبط زنده میکروفون را آغاز/پایان می‌دهد (ضبط واقعی در کاتلین/AudioRecord انجام می‌شود)
 *   ۳. رویدادهای نتیجه جزئی/نهایی/خطا را از native گوش می‌دهد و به لایه بالا (callback) می‌دهد
 */

import * as FileSystem from 'expo-file-system/legacy';
import {
  voskInit,
  voskStart,
  voskStop,
  voskDestroy,
  addPartialResultListener,
  addFinalResultListener,
  addErrorListener,
  VoskFinalResult,
} from '../../../modules/vosk-module/src';

export interface VoskBridgeCallbacks {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: Error) => void;
}

export interface VoskBridgeConfig {
  /** مسیر مطلق پوشه مدل Vosk روی دستگاه */
  modelPath: string;
  sampleRate?: number;
}

const DEFAULT_SAMPLE_RATE = 16000;

/** مسیر پیش‌فرض مدل فارسی Vosk در فضای ذخیره‌سازی اپ */
export const VOSK_MODEL_PATH = `${FileSystem.documentDirectory}vosk-model-small-fa-0.42`;

let isInitialized = false;
let isListening = false;
let activeSubscriptions: { remove: () => void }[] = [];

/** مقداردهی اولیه موتور Vosk — یک بار در startup اپ */
export async function initVosk(config: VoskBridgeConfig): Promise<void> {
  if (isInitialized) return;
  await voskInit(config.modelPath);
  isInitialized = true;
}

/**
 * شروع ضبط زنده میکروفون و تشخیص گفتار.
 * ضبط صدا کاملاً در سمت native (AudioRecord در کاتلین) انجام می‌شود؛
 * این تابع فقط listener های نتیجه را وصل کرده و جلسه Vosk را آغاز می‌کند.
 */
export async function startRecording(
  callbacks: VoskBridgeCallbacks,
  sampleRate = DEFAULT_SAMPLE_RATE,
): Promise<void> {
  if (!isInitialized) {
    throw new Error('Vosk bridge not initialized — call initVosk() first');
  }
  if (isListening) {
    throw new Error('ضبط در حال انجام است؛ ابتدا stopRecording() فراخوانی کنید');
  }

  activeSubscriptions = [
    addPartialResultListener((event) => callbacks.onPartial(event.partial)),
    addFinalResultListener((event) => callbacks.onFinal(event.text)),
    addErrorListener((event) => callbacks.onError(new Error(event.error))),
  ];

  try {
    await voskStart(sampleRate);
    isListening = true;
  } catch (err) {
    activeSubscriptions.forEach((s) => s.remove());
    activeSubscriptions = [];
    throw err;
  }
}

/**
 * توقف ضبط زنده و دریافت نتیجه نهایی از Vosk.
 */
export async function stopRecording(): Promise<string> {
  if (!isListening) {
    throw new Error('ضبطی در جریان نیست');
  }

  const result: VoskFinalResult = await voskStop();
  isListening = false;

  activeSubscriptions.forEach((s) => s.remove());
  activeSubscriptions = [];

  return result.text;
}

/** آزادسازی کامل منابع Vosk */
export async function destroyVosk(): Promise<void> {
  if (isListening) {
    await stopRecording().catch(() => {});
  }
  await voskDestroy();
  isInitialized = false;
}
