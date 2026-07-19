/**
 * اتصال چند بافر WAV خروجی Piper به یک فایل واحد.
 * Piper همیشه 22050Hz، 16-bit، مونو تولید می‌کند، پس اتصال PCM خام امن است.
 * Header فقط از بافر اول نگه داشته می‌شود؛ اندازه‌ها در آن بازنویسی می‌شوند.
 */

const WAV_HEADER_SIZE = 44;
const CHUNK_SIZE_OFFSET = 4; // بایت‌های 4-8: اندازه کل فایل - 8
const DATA_SIZE_OFFSET = 40; // بایت‌های 40-44: اندازه چانک داده PCM

export function concatenateWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) {
    throw new Error('حداقل یک بافر WAV برای اتصال لازم است');
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const firstHeader = buffers[0].slice(0, WAV_HEADER_SIZE);
  const firstPcm = buffers[0].slice(WAV_HEADER_SIZE);

  // حذف Header از بافرهای بعدی، فقط PCM خام نگه داشته می‌شود
  const restPcmBuffers = buffers.slice(1).map((buf) => buf.slice(WAV_HEADER_SIZE));

  const totalPcmLength =
    firstPcm.byteLength + restPcmBuffers.reduce((sum, b) => sum + b.byteLength, 0);

  const result = new Uint8Array(WAV_HEADER_SIZE + totalPcmLength);

  // کپی Header اول
  result.set(new Uint8Array(firstHeader), 0);

  // کپی PCM اول
  let offset = WAV_HEADER_SIZE;
  result.set(new Uint8Array(firstPcm), offset);
  offset += firstPcm.byteLength;

  // کپی PCM بقیه
  for (const pcm of restPcmBuffers) {
    result.set(new Uint8Array(pcm), offset);
    offset += pcm.byteLength;
  }

  // بازنویسی اندازه‌ها در Header ترکیبی
  const view = new DataView(result.buffer);
  const totalFileSize = WAV_HEADER_SIZE + totalPcmLength;
  view.setUint32(CHUNK_SIZE_OFFSET, totalFileSize - 8, true); // little-endian
  view.setUint32(DATA_SIZE_OFFSET, totalPcmLength, true);

  return result.buffer;
}
