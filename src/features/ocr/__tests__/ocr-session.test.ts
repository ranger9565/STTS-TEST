import { createOcrSession, startScan, beginProcessing, isResultReliable, finishScan } from '../ocr-session';

test('جلسه جدید در idle شروع می‌شود', () => {
  expect(createOcrSession().state).toBe('idle');
});

test('startScan حالت را به scanning با mode درست تغییر می‌دهد', () => {
  const session = startScan(createOcrSession(), 'region_select');
  expect(session.state).toBe('scanning');
  expect(session.mode).toBe('region_select');
});

test('شروع اسکن دوباره روی جلسه فعال خطا می‌دهد', () => {
  const session = startScan(createOcrSession(), 'full_screen');
  expect(() => startScan(session, 'full_screen')).toThrow();
});

test('beginProcessing فقط از scanning مجاز است', () => {
  const idleSession = createOcrSession();
  expect(() => beginProcessing(idleSession)).toThrow();

  const scanning = startScan(createOcrSession(), 'full_screen');
  const processing = beginProcessing(scanning);
  expect(processing.state).toBe('processing');
});

test('نتیجه با اطمینان بالا و متن غیرخالی قابل‌اعتماد است', () => {
  expect(isResultReliable({ text: 'سلام', confidence: 0.8 })).toBe(true);
});

test('نتیجه با اطمینان پایین قابل‌اعتماد نیست', () => {
  expect(isResultReliable({ text: 'سلام', confidence: 0.3 })).toBe(false);
});

test('نتیجه با متن خالی حتی با اطمینان بالا قابل‌اعتماد نیست', () => {
  expect(isResultReliable({ text: '   ', confidence: 0.9 })).toBe(false);
});

test('finishScan جلسه را به idle برمی‌گرداند', () => {
  const scanning = startScan(createOcrSession(), 'full_screen');
  expect(finishScan(scanning).state).toBe('idle');
});
