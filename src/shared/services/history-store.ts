/**
 * ذخیره‌سازی محلی و دائمی تاریخچه (SQLite) — نتایج نهایی STT (و بعداً TTS/OCR)
 * که کاربر می‌تواند از HistoryPanel ببیند و انتخاب کند.
 */
import * as SQLite from 'expo-sqlite';

export interface HistoryRecord {
  id: string;
  text: string;
  sourceLabel: string;
  createdAt: number;
}

const DB_NAME = 'stts-history.db';
let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
}

/** ساخت جدول تاریخچه در صورت نبود — باید یک‌بار در startup اپ صدا زده شود */
export function initHistoryDb(): void {
  getDb().execSync(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      sourceLabel TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
}

/** افزودن یک نتیجه‌ی جدید به تاریخچه (مثلاً هر جمله‌ی نهایی STT) */
export function addHistoryItem(text: string, sourceLabel: string): HistoryRecord {
  const record: HistoryRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    sourceLabel,
    createdAt: Date.now(),
  };
  getDb().runSync(
    'INSERT INTO history (id, text, sourceLabel, createdAt) VALUES (?, ?, ?, ?);',
    [record.id, record.text, record.sourceLabel, record.createdAt],
  );
  return record;
}

/** خواندن N موردِ اخیرِ تاریخچه (جدیدترین اول) */
export function getRecentHistory(limit: number = 50): HistoryRecord[] {
  return getDb().getAllSync<HistoryRecord>(
    'SELECT id, text, sourceLabel, createdAt FROM history ORDER BY createdAt DESC LIMIT ?;',
    [limit],
  );
}

/** حذف یک موردِ تاریخچه */
export function deleteHistoryItem(id: string): void {
  getDb().runSync('DELETE FROM history WHERE id = ?;', [id]);
}

/** پاک‌کردن کامل تاریخچه */
export function clearHistory(): void {
  getDb().execSync('DELETE FROM history;');
}
