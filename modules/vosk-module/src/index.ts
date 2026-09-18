/**
 * رابط TypeScript برای ماژول native Vosk STT.
 * موتور Vosk از طریق JNI در کاتلین پیاده‌سازی شده است.
 * ضبط زنده میکروفون کاملاً native انجام می‌شود (AudioRecord)؛
 * نتایج جزئی/نهایی از طریق رویداد به JS می‌رسند.
 */
import { requireNativeModule, EventSubscription } from 'expo-modules-core';

export interface VoskPartialResult {
  partial: string;
}

export interface VoskFinalResult {
  text: string;
}

export interface VoskErrorResult {
  error: string;
}

interface VoskNativeModule {
  init(modelPath: string): Promise<void>;
  start(sampleRate: number): Promise<void>;
  feedAudio(samplesBase64: string): Promise<VoskPartialResult | null>;
  stop(): Promise<VoskFinalResult>;
  destroy(): Promise<void>;
  addListener(
    eventName: 'onPartialResult',
    listener: (event: VoskPartialResult) => void,
  ): EventSubscription;
  addListener(
    eventName: 'onFinalResult',
    listener: (event: VoskFinalResult) => void,
  ): EventSubscription;
  addListener(
    eventName: 'onError',
    listener: (event: VoskErrorResult) => void,
  ): EventSubscription;
}

const VoskNative = requireNativeModule<VoskNativeModule>('VoskModule');

export async function voskInit(modelPath: string): Promise<void> {
  return VoskNative.init(modelPath);
}

export async function voskStart(sampleRate: number = 16000): Promise<void> {
  return VoskNative.start(sampleRate);
}

export async function voskFeedAudio(samplesBase64: string): Promise<VoskPartialResult | null> {
  return VoskNative.feedAudio(samplesBase64);
}

export async function voskStop(): Promise<VoskFinalResult> {
  return VoskNative.stop();
}

export async function voskDestroy(): Promise<void> {
  return VoskNative.destroy();
}

export function addPartialResultListener(
  listener: (event: VoskPartialResult) => void,
): EventSubscription {
  return VoskNative.addListener('onPartialResult', listener);
}

export function addFinalResultListener(
  listener: (event: VoskFinalResult) => void,
): EventSubscription {
  return VoskNative.addListener('onFinalResult', listener);
}

export function addErrorListener(
  listener: (event: VoskErrorResult) => void,
): EventSubscription {
  return VoskNative.addListener('onError', listener);
}
