import { buildTtsRequests, getModelForLanguage } from '../tts-service';

test('مدل فارسی برای زبان fa درست است', () => {
  expect(getModelForLanguage('fa').modelId).toBe('fa_IR-gyro-medium');
});

test('مدل انگلیسی برای زبان en درست است', () => {
  expect(getModelForLanguage('en').modelId).toBe('en_US-lessac-medium');
});

test('متن چندخطی و دوزبانه به درخواست‌های جدا با مدل درست تبدیل می‌شود', () => {
  const requests = buildTtsRequests('سلام دنیا\nhello world', 'test');
  expect(requests).toHaveLength(2);
  expect(requests[0].modelConfig.modelId).toBe('fa_IR-gyro-medium');
  expect(requests[1].modelConfig.modelId).toBe('en_US-lessac-medium');
  expect(requests[0].id).toBe('test-0');
  expect(requests[1].id).toBe('test-1');
});
