/**
 * مقداردهی اولیه کل اپ — هر سه موتور AI را باهم راه‌اندازی می‌کند.
 *
 * باید یک بار در نقطه ورودی اپ (app/_layout.tsx یا App.tsx) فراخوانی شود.
 * از hooks جداگانه useStt/useTts/useOcr نیاز نیست همزمان init کنند.
 */

import { ensureModelsReady } from './model-assets';
import { initVosk } from '../../features/stt/vosk-bridge';
import { initPiper } from '../../features/tts/piper-bridge';
import { initTesseract } from '../../features/ocr/tesseract-bridge';

export type InitStatus =
  | { phase: 'idle' }
  | { phase: 'extracting_models' }
  | { phase: 'loading_vosk' }
  | { phase: 'loading_piper' }
  | { phase: 'loading_tesseract' }
  | { phase: 'ready' }
  | { phase: 'error'; error: Error };

/**
 * مقداردهی ترتیبی موتورها با گزارش پیشرفت.
 * @param onStatusChange callback برای به‌روزرسانی UI loading
 */
export async function initializeApp(
  onStatusChange?: (status: InitStatus) => void,
): Promise<void> {
  const report = (status: InitStatus) => onStatusChange?.(status);

  try {
    // ۱. اطمینان از وجود مدل‌ها روی دستگاه
    report({ phase: 'extracting_models' });
    const paths = await ensureModelsReady();

    // ۲. Vosk STT
    report({ phase: 'loading_vosk' });
    await initVosk({ modelPath: paths.voskModelPath });

    // ۳. Piper TTS (هر دو مدل fa و en)
    report({ phase: 'loading_piper' });
    await initPiper({
      modelsDir: paths.piperModelsDir,
      espeakDataDir: paths.espeakDataDir,
    });

    // ۴. Tesseract OCR
    report({ phase: 'loading_tesseract' });
    await initTesseract({
      tessDataPath: paths.tessDataPath,
      language: 'fas',
    });

    report({ phase: 'ready' });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    report({ phase: 'error', error });
    throw error;
  }
}
