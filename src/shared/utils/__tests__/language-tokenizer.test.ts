import { detectLanguage, splitIntoSegments } from '../language-tokenizer';

test('متن فارسی به‌درستی تشخیص داده می‌شود', () => {
  expect(detectLanguage('سلام دنیا')).toBe('fa');
});

test('متن انگلیسی به‌درستی تشخیص داده می‌شود', () => {
  expect(detectLanguage('hello world')).toBe('en');
});

test('متن آمیخته با غلبه فارسی، fa تشخیص داده می‌شود', () => {
  expect(detectLanguage('سلام hello سلام دوباره')).toBe('fa');
});

test('متن خالی از حروف، پیش‌فرض fa برمی‌گرداند', () => {
  expect(detectLanguage('12345')).toBe('fa');
});

test('تقسیم متن چندخطی به بخش‌های مجزا', () => {
  const result = splitIntoSegments('خط اول\n\nخط دوم\nخط سوم');
  expect(result).toEqual(['خط اول', 'خط دوم', 'خط سوم']);
});

test('متن ترکیبی فارسی و انگلیسی به بخش‌های زبانی جدا تقسیم می‌شود', () => {
  const result = splitIntoSegments('سلام Hossein خوبی Hello دوست من');
  expect(result).toEqual(['سلام', 'Hossein', 'خوبی', 'Hello', 'دوست من']);
});

test('عدد و علائم نگارشی بخش زبانی جدید ایجاد نمی‌کنند', () => {
  const result = splitIntoSegments('سلام 123! دنیا');
  expect(result).toEqual(['سلام 123! دنیا']);
});

test('یک جمله انگلیسی با چند واژه به یک بخش باقی می‌ماند', () => {
  const result = splitIntoSegments('Hello how are you');
  expect(result).toEqual(['Hello how are you']);
});
