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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { piperInit, piperSynthesize, piperDestroy } from '../../../modules/piper-module/src';
import { buildTtsRequests, TtsRequest } from './tts-service';
import { PlaybackQueue } from './playback-queue';
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
const playbackQueue = new PlaybackQueue();
let currentSound: Audio.Sound | null = null;

/**
 * مقداردهی اولیه Piper با هر دو مدل (fa و en).
 * باید یک بار در startup اپ فراخوانی شود.
 */
export async function initPiper(config: PiperBridgeConfig): Promise<void> {
  if (isInitialized) return;

  for (const [, files] of Object.entries(MODEL_FILES)) {
    const modelPath = `${config.modelsDir}/${files.model}`;
    const configPath = `${config.modelsDir}/${files.config}`;
    await piperInit(modelPath, configPath, config.espeakDataDir);
  }

  isInitialized = true;
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
): Promise<void> {
  if (!isInitialized) {
    throw new Error('Piper bridge not initialized — call initPiper() first');
  }

  const requests: TtsRequest[] = buildTtsRequests(text, `tts-${Date.now()}`);

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
  const base64Combined = btoa(
    String.fromCharCode(...new Uint8Array(combined)),
  );
  await FileSystem.writeAsStringAsync(outPath, base64Combined, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // پخش از طریق expo-av
  await playWavFile(outPath, onFinished);
}

/** ذخیره خروجی صوتی آخرین synthesis به عنوان فایل قابل اشتراک‌گذاری */
export async function exportLastAudio(savePath: string): Promise<void> {
  // TODO: ذخیره فایل WAV آخرین synthesis به savePath
  // (در پیاده‌سازی کامل، مسیر آخرین فایل temporary نگه داشته می‌شود)
}

/** پخش فایل WAV از مسیر مشخص */
async function playWavFile(
  filePath: string,
  onFinished?: () => void,
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
}
