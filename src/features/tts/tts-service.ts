/**
 * سرویس TTS: انتخاب مدل مناسب بر اساس زبان تشخیص‌داده‌شده و مدیریت درخواست تولید صدا.
 * لایه پایین (اجرای واقعی ONNX Runtime + Piper) در ماژول native انجام می‌شود؛
 * این فایل فقط منطق انتخاب و هماهنگی است - کاملاً تست‌پذیر بدون دستگاه واقعی.
 */

import { detectLanguage, splitIntoSegments, DetectedLanguage } from '../../shared/utils/language-tokenizer';

export interface TtsModelConfig {
  modelId: string;
  sampleRate: number;
}

const MODEL_MAP: Record<DetectedLanguage, TtsModelConfig> = {
  fa: { modelId: 'fa_IR-gyro-medium', sampleRate: 22050 },
  en: { modelId: 'en_US-lessac-medium', sampleRate: 22050 },
};

export interface TtsRequest {
  id: string;
  text: string;
  modelConfig: TtsModelConfig;
}

/** ساخت درخواست‌های TTS برای هر بخش متن، با انتخاب خودکار مدل مناسب هر بخش */
export function buildTtsRequests(text: string, idPrefix: string): TtsRequest[] {
  const segments = splitIntoSegments(text);

  return segments.map((segment, index) => {
    const lang = detectLanguage(segment);
    return {
      id: `${idPrefix}-${index}`,
      text: segment,
      modelConfig: MODEL_MAP[lang],
    };
  });
}

export function getModelForLanguage(lang: DetectedLanguage): TtsModelConfig {
  return MODEL_MAP[lang];
}
