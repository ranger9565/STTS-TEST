import { createSttSession, startListening, applyPartialResult, stopListening } from '../stt-session';

test('جلسه جدید در حالت idle شروع می‌شود', () => {
  const session = createSttSession();
  expect(session.state).toBe('idle');
});

test('startListening حالت را به listening تغییر می‌دهد', () => {
  const session = startListening(createSttSession());
  expect(session.state).toBe('listening');
});

test('شروع دوباره روی جلسه فعال خطا می‌دهد', () => {
  const session = startListening(createSttSession());
  expect(() => startListening(session)).toThrow();
});

test('نتیجه نهایی متن را انباشته و حالت را processing می‌کند', () => {
  let session = startListening(createSttSession());
  session = applyPartialResult(session, { text: 'سلام دنیا', isFinal: true });
  expect(session.state).toBe('processing');
  expect(session.accumulatedText).toBe('سلام دنیا');
});

test('نتیجه جزئی (غیرنهایی) متن انباشته را تغییر نمی‌دهد', () => {
  let session = startListening(createSttSession());
  session = applyPartialResult(session, { text: 'در حال گفتن...', isFinal: false });
  expect(session.state).toBe('listening');
  expect(session.accumulatedText).toBe('');
});

test('توقف دستی، جلسه را به idle برمی‌گرداند و متن را نگه می‌دارد', () => {
  let session = startListening(createSttSession());
  session = applyPartialResult(session, { text: 'تست', isFinal: true });
  session = stopListening(session);
  expect(session.state).toBe('idle');
  expect(session.accumulatedText).toBe('تست');
});
