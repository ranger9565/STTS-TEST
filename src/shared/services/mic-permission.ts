/**
 * درخواست مجوز میکروفون (RECORD_AUDIO) در زمان اجرا.
 *
 * منطق خالص است و به react-native وابسته نیست؛ API مجوزها از بیرون تزریق
 * می‌شود تا بدون دستگاه قابل تست باشد. (اتصال واقعی در vosk-bridge.ts)
 */

export type MicPermissionStatus = 'granted' | 'denied' | 'blocked';

export interface PermissionsApi {
  check(permission: string): Promise<boolean>;
  request(
    permission: string,
    rationale: {
      title: string;
      message: string;
      buttonPositive: string;
      buttonNegative: string;
    },
  ): Promise<string>;
}

export const RECORD_AUDIO_PERMISSION = 'android.permission.RECORD_AUDIO';

const RESULT_GRANTED = 'granted';
const RESULT_NEVER_ASK_AGAIN = 'never_ask_again';

export async function ensureMicPermission(
  api: PermissionsApi,
): Promise<MicPermissionStatus> {
  if (await api.check(RECORD_AUDIO_PERMISSION)) return 'granted';

  const result = await api.request(RECORD_AUDIO_PERMISSION, {
    title: 'دسترسی میکروفون',
    message: 'برای تبدیل صدای شما به متن، STTS به میکروفون نیاز دارد.',
    buttonPositive: 'اجازه می‌دهم',
    buttonNegative: 'الان نه',
  });

  if (result === RESULT_GRANTED) return 'granted';
  if (result === RESULT_NEVER_ASK_AGAIN) return 'blocked';
  return 'denied';
}

export function micPermissionErrorMessage(
  status: Exclude<MicPermissionStatus, 'granted'>,
): string {
  return status === 'blocked'
    ? 'دسترسی میکروفون مسدود است. از تنظیمات اندروید ← برنامه‌ها ← STTS ← مجوزها، میکروفون را روشن کنید.'
    : 'دسترسی میکروفون داده نشد؛ بدون آن تبدیل صوت به متن ممکن نیست.';
}
