import { getRetentionDecision } from '../retention-rule';

test('ضبط مستقیم STT: صدا و متن هر دو نگه داشته می‌شوند', () => {
  expect(getRetentionDecision('stt_recording')).toEqual({ keepAudio: true, keepText: true });
});

test('خروجی TTS: صدا و متن هر دو نگه داشته می‌شوند', () => {
  expect(getRetentionDecision('tts_output')).toEqual({ keepAudio: true, keepText: true });
});

test('فایل آپلودی: فقط متن نگه داشته می‌شود، صدا نه', () => {
  expect(getRetentionDecision('uploaded_file')).toEqual({ keepAudio: false, keepText: true });
});
