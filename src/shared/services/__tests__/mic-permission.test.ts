import {
  ensureMicPermission,
  micPermissionErrorMessage,
  RECORD_AUDIO_PERMISSION,
  PermissionsApi,
} from '../mic-permission';

function fakeApi(checked: boolean, requestResult: string) {
  const request = jest.fn().mockResolvedValue(requestResult);
  const api: PermissionsApi = {
    check: jest.fn().mockResolvedValue(checked),
    request,
  };
  return { api, request };
}

test('اگر مجوز از قبل داده شده، درخواست جدید نمی‌دهد', async () => {
  const { api, request } = fakeApi(true, 'granted');
  expect(await ensureMicPermission(api)).toBe('granted');
  expect(request).not.toHaveBeenCalled();
});

test('اگر مجوز نیست، درخواست می‌دهد و در صورت قبول granted برمی‌گرداند', async () => {
  const { api, request } = fakeApi(false, 'granted');
  expect(await ensureMicPermission(api)).toBe('granted');
  expect(request).toHaveBeenCalledWith(
    RECORD_AUDIO_PERMISSION,
    expect.objectContaining({ title: expect.any(String) }),
  );
});

test('اگر کاربر رد کند، denied است', async () => {
  const { api } = fakeApi(false, 'denied');
  expect(await ensureMicPermission(api)).toBe('denied');
});

test('اگر «دیگر نپرس» انتخاب شده، blocked است', async () => {
  const { api } = fakeApi(false, 'never_ask_again');
  expect(await ensureMicPermission(api)).toBe('blocked');
});

test('پیام خطا برای blocked به تنظیمات اندروید اشاره می‌کند', () => {
  expect(micPermissionErrorMessage('blocked')).toContain('تنظیمات');
  expect(micPermissionErrorMessage('denied')).not.toContain('تنظیمات');
});
