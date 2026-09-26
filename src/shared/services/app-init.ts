/**
 * مقداردهی اولیه کل اپ — هر سه موتور AI را باهم راه‌اندازی می‌کند.
 *
 * باید یک بار در نقطه ورودی اپ (app/_layout.tsx یا App.tsx) فراخوانی شود.
 * از hooks جداگانه useStt/useTts/useOcr نیاز نیست همزمان init کنند.
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
