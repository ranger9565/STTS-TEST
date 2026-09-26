/**
 * آماده‌سازی اولیه کل اپ — فقط مدل‌ها و assets آفلاین را آماده می‌کند.
 * موتورهای native توسط hook همان قابلیت و فقط هنگام نیاز راه‌اندازی می‌شوند.
 * این تابع باید یک‌بار در نقطه ورودی اپ فراخوانی شود.
 */

import { ensureModelsReady } from './model-assets';

export type InitStatus =
  | { phase: 'idle' }
  | { phase: 'extracting_models' }
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

    // موتورهای native توسط hook همان قابلیت مقداردهی می‌شوند؛
    // اینجا فقط آماده‌بودن مدل‌ها و assets را تضمین می‌کنیم.
    report({ phase: 'ready' });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    report({ phase: 'error', error });
    throw error;
  }
}
