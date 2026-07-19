/**
 * صف پخش TTS.
 * قانون: اگر چیزی در حال خواندن نیست یا خواندن قبلی کامل شده -> پخش جدید فوراً شروع شود.
 * اگر متن قبلی هنوز نیمه‌کاره در حال خواندن است -> متن جدید به صف اضافه شود.
 */

export interface QueueItem {
  id: string;
  text: string;
}

export type PlaybackState = 'idle' | 'playing';

export class PlaybackQueue {
  private queue: QueueItem[] = [];
  private state: PlaybackState = 'idle';
  private currentItem: QueueItem | null = null;

  /** افزودن آیتم جدید طبق قانون صف */
  enqueue(item: QueueItem): { startedImmediately: boolean } {
    if (this.state === 'idle') {
      this.currentItem = item;
      this.state = 'playing';
      return { startedImmediately: true };
    }
    this.queue.push(item);
    return { startedImmediately: false };
  }

  /** فراخوانی وقتی پخش آیتم فعلی تمام شد */
  onPlaybackFinished(): QueueItem | null {
    if (this.queue.length > 0) {
      this.currentItem = this.queue.shift()!;
      this.state = 'playing';
      return this.currentItem;
    }
    this.currentItem = null;
    this.state = 'idle';
    return null;
  }

  getCurrentItem(): QueueItem | null {
    return this.currentItem;
  }

  getState(): PlaybackState {
    return this.state;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.currentItem = null;
    this.state = 'idle';
  }
}
