/**
 * ذخیره‌سازی محلی و دائمی تاریخچه (SQLite) — نتایج نهایی STT (و بعداً TTS/OCR)
 * که کاربر می‌تواند از HistoryPanel ببیند و انتخاب کند.
 */
import * as SQLite from 'expo-sqlite';

export interface StoredAppSettings {
  language: 'fa' | 'en';
  voiceGender: 'female' | 'male';
  playbackSpeed: number;
}

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
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

export function loadAppSettings(defaults: StoredAppSettings): StoredAppSettings {
  initHistoryDb();
  const rows = getDb().getAllSync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings;',
  );
  const result = { ...defaults };
  for (const row of rows) {
    if (row.key === 'language' && (row.value === 'fa' || row.value === 'en')) result.language = row.value;
    if (row.key === 'voiceGender' && (row.value === 'female' || row.value === 'male')) result.voiceGender = row.value;
    if (row.key === 'playbackSpeed') {
      const speed = Number(row.value);
      if (Number.isFinite(speed)) result.playbackSpeed = speed;
    }
  }
  return result;
}

export function saveAppSettings(settings: StoredAppSettings): void {
  initHistoryDb();
  const database = getDb();
  database.withTransactionSync(() => {
    for (const [key, value] of Object.entries(settings)) {
      database.runSync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
        [key, String(value)],
      );
    }
  });
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
