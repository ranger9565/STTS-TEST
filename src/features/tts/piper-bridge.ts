/**
 * رابط بین منطق TTS (tts-service.ts) و ماژول native Piper.
 *
 * این فایل:
 *   ۱. مدل‌های Piper را برای فارسی و انگلیسی مقداردهی می‌کند
 *   ۲. درخواست‌های TtsRequest را از tts-service.ts دریافت می‌کند
 *   ۳. synthesis را اجرا و خروجی WAV را از طریق expo-av پخش می‌کند
 *   ۴. صف پخش (PlaybackQueue) را هماهنگ می‌کند
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { piperInit, piperSynthesize, piperDestroy } from '../../../modules/piper-module/src';
import { buildTtsRequests, TtsRequest } from './tts-service';
import { concatenateWavBuffers } from './wav-concatenator';

export interface PiperBridgeConfig {
  /** مسیر پوشه مدل‌های Piper در filesDir اپ */
  modelsDir: string;
  /** مسیر پوشه espeak-ng-data در filesDir اپ */
  espeakDataDir: string;
}

/** مسیرهای پیش‌فرض مدل‌ها */
export const PIPER_MODELS_DIR = `${FileSystem.documentDirectory}piper-models`;
export const ESPEAK_DATA_DIR = `${FileSystem.documentDirectory}espeak-ng-data`;

const MODEL_FILES = {
  fa: {
    model: 'fa_IR-gyro-medium.onnx',
    config: 'fa_IR-gyro-medium.onnx.json',
  },
  en: {
    model: 'en_US-lessac-medium.onnx',
    config: 'en_US-lessac-medium.onnx.json',
  },
} as const;

let isInitialized = false;
let currentSound: Audio.Sound | null = null;
let lastAudioPath: string | null = null;

/**
 * مقداردهی اولیه Piper با هر دو مدل (fa و en).
 * باید یک بار در startup اپ فراخوانی شود.
 */
export async function initPiper(config: PiperBridgeConfig): Promise<void> {
  if (isInitialized) return;

  const requiredPaths = Object.values(MODEL_FILES).flatMap((files) => [
    `${config.modelsDir}/${files.model}`,
    `${config.modelsDir}/${files.config}`,
  ]);

  requiredPaths.push(config.espeakDataDir);

  for (const path of requiredPaths) {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      throw new Error(`Piper asset not found: ${path}`);
    }
  }

  try {
    for (const [, files] of Object.entries(MODEL_FILES)) {
      const modelPath = `${config.modelsDir}/${files.model}`;
      const configPath = `${config.modelsDir}/${files.config}`;
      await piperInit(modelPath, configPath, config.espeakDataDir);
    }

    isInitialized = true;
  } catch (error) {
    // اگر مقداردهی یکی از مدل‌ها شکست خورد، session مدل قبلی نباید
    // به‌صورت نیمه‌کاره در حافظه باقی بماند.
    await piperDestroy().catch(() => {});
    isInitialized = false;
    throw error;
  }
}

/**
 * تبدیل متن کامل به صدا و پخش آن.
 * متن به بخش‌های فارسی/انگلیسی تقسیم می‌شود و هر بخش با مدل مناسب synthesize می‌شود.
 * خروجی‌های WAV به هم متصل و پخش می‌شوند.
 *
 * @param text متن ورودی (می‌تواند آمیخته‌ای از فارسی و انگلیسی باشد)
 * @param onFinished callback پس از پایان پخش
 */
export async function speak(
  text: string,
  onFinished?: () => void,
  onProgress?: (positionMs: number, durationMs: number) => void,
): Promise<void> {
  if (!isInitialized) {
    throw new Error('Piper bridge not initialized — call initPiper() first');
  }

  if (!text.trim()) {
    throw new Error('TTS text cannot be empty');
  }

  const requests: TtsRequest[] = buildTtsRequests(text, `tts-${Date.now()}`);
  if (requests.length === 0) {
    throw new Error('TTS produced no synthesis requests');
  }

  // synthesis موازی تمام بخش‌ها
  const wavBuffers: ArrayBuffer[] = await Promise.all(
    requests.map(async (req) => {
      const base64Wav = await piperSynthesize(req.text, req.modelConfig.modelId);
      // تبدیل base64 به ArrayBuffer
      const binary = atob(base64Wav);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i);
      }
      return buffer;
    }),
  );

  // اتصال WAV های چندگانه به یک فایل
  const combined = concatenateWavBuffers(wavBuffers);

  // نوشتن فایل WAV موقت
  const outPath = `${FileSystem.cacheDirectory}tts_${Date.now()}.wav`;
  const base64Combined = arrayBufferToBase64(combined);
  await FileSystem.writeAsStringAsync(outPath, base64Combined, {
    encoding: FileSystem.EncodingType.Base64,
  });
  lastAudioPath = outPath;

  // پخش از طریق expo-av
  await playWavFile(outPath, onFinished, onProgress);
}

/** ذخیره خروجی صوتی آخرین synthesis به عنوان فایل قابل اشتراک‌گذاری */
export async function exportLastAudio(savePath: string): Promise<void> {
  if (!lastAudioPath) {
    throw new Error('No synthesized audio is available to export');
  }

  const sourceInfo = await FileSystem.getInfoAsync(lastAudioPath);
  if (!sourceInfo.exists) {
    lastAudioPath = null;
    throw new Error('The last synthesized audio file no longer exists');
  }

  if (lastAudioPath === savePath) {
    return;
  }

  await FileSystem.copyAsync({
    from: lastAudioPath,
    to: savePath,
  });
}

/**
 * تبدیل ArrayBuffer به Base64 بدون spread روی کل بافر.
 * Spread روی فایل‌های صوتی بزرگ می‌تواند به محدودیت تعداد آرگومان‌های
 * JavaScript برسد و باعث RangeError/stack overflow شود.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/** پخش فایل WAV از مسیر مشخص */
async function playWavFile(
  filePath: string,
  onFinished?: () => void,
  onProgress?: (positionMs: number, durationMs: number) => void,
): Promise<void> {
  // توقف پخش قبلی
  if (currentSound) {
    await currentSound.unloadAsync();
    currentSound = null;
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: filePath },
    { shouldPlay: true },
    (status) => {
      if (status.isLoaded) {
      onProgress?.(status.positionMillis, status.durationMillis ?? 0);
    }
    if (status.isLoaded && status.didJustFinish) {
        currentSound?.unloadAsync().catch(() => {});
        currentSound = null;
        onFinished?.();
      }
    },
  );

  currentSound = sound;
}

/** توقف پخش جاری */
export async function stopSpeaking(): Promise<void> {
  if (currentSound) {
    await currentSound.stopAsync();
    await currentSound.unloadAsync();
    currentSound = null;
  }
}

/** آزادسازی منابع Piper */
export async function destroyPiper(): Promise<void> {
  await stopSpeaking();
  await piperDestroy();
  isInitialized = false;
  lastAudioPath = null;
}
