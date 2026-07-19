/**
 * حذف سکوت انتهای بافر صوتی PCM، با نگه‌داشتن مقدار مشخصی Padding بعد از آخرین صدای واقعی.
 * طبق سند تایید‌شده: 350ms padding بعد از رفع سکوت.
 */

export interface TrimSilenceOptions {
  sampleRate: number; // مثلاً 16000 برای Vosk
  paddingMs: number; // مثلاً 350
  silenceThreshold: number; // دامنه مطلق زیر این مقدار سکوت محسوب می‌شود (0 تا 32767 برای Int16)
}

/**
 * آخرین اندیس نمونه‌ای که دامنه‌اش بالاتر از آستانه سکوت است را پیدا می‌کند.
 * اگر کل بافر سکوت باشد، -1 برمی‌گرداند.
 */
function findLastNonSilentIndex(samples: Int16Array, threshold: number): number {
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]) > threshold) {
      return i;
    }
  }
  return -1;
}

export function trimTrailingSilence(samples: Int16Array, options: TrimSilenceOptions): Int16Array {
  const { sampleRate, paddingMs, silenceThreshold } = options;

  const lastVoiceIndex = findLastNonSilentIndex(samples, silenceThreshold);

  if (lastVoiceIndex === -1) {
    // کل بافر سکوت است؛ چیزی برای نگه‌داشتن نیست
    return new Int16Array(0);
  }

  const paddingSamples = Math.round((paddingMs / 1000) * sampleRate);
  const endIndex = Math.min(lastVoiceIndex + paddingSamples + 1, samples.length);

  return samples.slice(0, endIndex);
}
