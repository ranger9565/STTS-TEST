import { PlaybackQueue } from '../playback-queue';

test('وقتی صف خالیه، آیتم جدید فوراً شروع می‌شود', () => {
  const q = new PlaybackQueue();
  const result = q.enqueue({ id: '1', text: 'سلام' });
  expect(result.startedImmediately).toBe(true);
  expect(q.getState()).toBe('playing');
  expect(q.getCurrentItem()?.id).toBe('1');
});

test('وقتی چیزی در حال پخشه، آیتم جدید به صف اضافه می‌شود نه فوری', () => {
  const q = new PlaybackQueue();
  q.enqueue({ id: '1', text: 'اول' });
  const result = q.enqueue({ id: '2', text: 'دوم' });
  expect(result.startedImmediately).toBe(false);
  expect(q.getQueueLength()).toBe(1);
  expect(q.getCurrentItem()?.id).toBe('1'); // هنوز همون اولی در حال پخش
});

test('بعد از پایان پخش، آیتم بعدی صف شروع می‌شود', () => {
  const q = new PlaybackQueue();
  q.enqueue({ id: '1', text: 'اول' });
  q.enqueue({ id: '2', text: 'دوم' });

  const next = q.onPlaybackFinished();
  expect(next?.id).toBe('2');
  expect(q.getState()).toBe('playing');
});

test('وقتی صف خالی می‌شود، حالت idle می‌شود', () => {
  const q = new PlaybackQueue();
  q.enqueue({ id: '1', text: 'تنها' });
  const next = q.onPlaybackFinished();
  expect(next).toBeNull();
  expect(q.getState()).toBe('idle');
});
