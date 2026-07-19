import { trimTrailingSilence } from '../silence-trimmer';

const SAMPLE_RATE = 16000;
const THRESHOLD = 500;

function makeSamples(loudCount: number, silentCount: number): Int16Array {
  const arr = new Int16Array(loudCount + silentCount);
  for (let i = 0; i < loudCount; i++) arr[i] = 1000; // صدای بلند
  for (let i = loudCount; i < arr.length; i++) arr[i] = 0; // سکوت
  return arr;
}

test('سکوت انتهایی بیشتر از padding حذف می‌شود', () => {
  const loudCount = 1000;
  const silentCount = 16000; // ۱ ثانیه سکوت اضافه
  const samples = makeSamples(loudCount, silentCount);

  const result = trimTrailingSilence(samples, {
    sampleRate: SAMPLE_RATE,
    paddingMs: 350,
    silenceThreshold: THRESHOLD,
  });

  const expectedPaddingSamples = Math.round((350 / 1000) * SAMPLE_RATE); // 5600
  expect(result.length).toBe(loudCount + expectedPaddingSamples);
});

test('اگر سکوت کمتر از padding باشد، کل بافر نگه داشته می‌شود', () => {
  const loudCount = 1000;
  const silentCount = 100; // خیلی کمتر از 350ms
  const samples = makeSamples(loudCount, silentCount);

  const result = trimTrailingSilence(samples, {
    sampleRate: SAMPLE_RATE,
    paddingMs: 350,
    silenceThreshold: THRESHOLD,
  });

  expect(result.length).toBe(samples.length);
});

test('بافر کاملاً ساکت، آرایه خالی برمی‌گرداند', () => {
  const samples = new Int16Array(5000); // همه صفر
  const result = trimTrailingSilence(samples, {
    sampleRate: SAMPLE_RATE,
    paddingMs: 350,
    silenceThreshold: THRESHOLD,
  });
  expect(result.length).toBe(0);
});
