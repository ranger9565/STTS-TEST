/**
 * تنظیمات کاربر: زبان، صدا (زن/مرد)، سرعت پخش.
 * منطق خالص - ذخیره‌سازی واقعی در SQLite در لایه بالاتر انجام می‌شود.
 */

export type AppLanguage = 'fa' | 'en';
export type VoiceGender = 'female' | 'male';

export interface AppSettings {
  language: AppLanguage;
  voiceGender: VoiceGender;
  playbackSpeed: number; // 0.5 تا 2.0
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'fa',
  voiceGender: 'female',
  playbackSpeed: 1.0,
};

const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;

/** اعتبارسنجی و کلمپ‌کردن سرعت پخش در بازه مجاز */
export function clampPlaybackSpeed(speed: number): number {
  return Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED);
}

export function updateSettings(
  current: AppSettings,
  changes: Partial<AppSettings>,
): AppSettings {
  const merged = { ...current, ...changes };
  return {
    ...merged,
    playbackSpeed: clampPlaybackSpeed(merged.playbackSpeed),
  };
}
