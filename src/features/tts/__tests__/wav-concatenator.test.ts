import { concatenateWavBuffers } from '../wav-concatenator';

function makeWav(pcmBytes: number[]): ArrayBuffer {
  const header = new Uint8Array(44).fill(0);
  const pcm = new Uint8Array(pcmBytes);
  const buf = new Uint8Array(44 + pcm.length);
  buf.set(header, 0);
  buf.set(pcm, 44);
  return buf.buffer;
}

test('اتصال دو فایل WAV، اندازه‌های Header را درست بازنویسی می‌کند', () => {
  const wav1 = makeWav([1, 2, 3]);
  const wav2 = makeWav([4, 5]);

  const result = concatenateWavBuffers([wav1, wav2]);
  const view = new DataView(result);

  expect(result.byteLength).toBe(44 + 5); // header + 5 بایت PCM ترکیبی
  expect(view.getUint32(4, true)).toBe(44 + 5 - 8); // ChunkSize
  expect(view.getUint32(40, true)).toBe(5); // Subchunk2Size

  const pcmResult = new Uint8Array(result, 44);
  expect(Array.from(pcmResult)).toEqual([1, 2, 3, 4, 5]);
});

test('یک بافر تنها بدون تغییر برگردانده می‌شود', () => {
  const wav = makeWav([9, 9]);
  const result = concatenateWavBuffers([wav]);
  expect(result).toBe(wav);
});

test('آرایه خالی خطا می‌دهد', () => {
  expect(() => concatenateWavBuffers([])).toThrow();
});
