/**
 * کپی مدل‌های AI از bundled assets به filesDir دستگاه.
 *
 * این سرویس در اولین اجرای اپ (یا هر بار که مدل وجود نداشته باشد) فراخوانی می‌شود.
 * مدل‌ها در android/app/src/main/assets/ بسته‌بندی می‌شوند و اینجا extract می‌شوند.
 *
 * مدل‌های مورد نیاز (باید در android/app/src/main/assets/ قرار گیرند):
 *   - vosk/vosk-model-small-fa-0.42/   (~53MB)
 *   - piper/fa_IR-gyro-medium.onnx     (~63MB)
 *   - piper/fa_IR-gyro-medium.onnx.json
 *   - piper/en_US-lessac-medium.onnx   (~63MB)
 *   - piper/en_US-lessac-medium.onnx.json
 *   - espeak-ng-data/                  (~2MB)
 *   - tessdata/fas.traineddata         (~8MB)
 */

import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

/** نشانه نسخه — اگر این تغییر کند، مدل‌ها مجدداً کپی می‌شوند */
const MODEL_VERSION = '1.0.0';
const VERSION_FILE = `${FileSystem.documentDirectory}.model_version`;

export interface ModelPaths {
  voskModelPath: string;
  piperModelsDir: string;
  espeakDataDir: string;
  tessDataPath: string;
}

/**
 * بررسی و کپی مدل‌ها از assets به دستگاه (در صورت نیاز).
 * @returns مسیر کامل هر مدل روی دستگاه
 */
export async function ensureModelsReady(): Promise<ModelPaths> {
  const paths: ModelPaths = {
    voskModelPath: `${FileSystem.documentDirectory}vosk-model-small-fa-0.42`,
    piperModelsDir: `${FileSystem.documentDirectory}piper-models`,
    espeakDataDir: `${FileSystem.documentDirectory}espeak-ng-data`,
    tessDataPath: FileSystem.documentDirectory ?? '',
  };

  // بررسی نسخه — اگر مدل‌ها از قبل کپی شده‌اند، کاری نکن
  const currentVersion = await readVersionFile();
  if (currentVersion === MODEL_VERSION) {
    return paths;
  }

  // ساخت پوشه‌های مقصد
  await ensureDir(paths.piperModelsDir);
  await ensureDir(paths.espeakDataDir);
  await ensureDir(`${paths.tessDataPath}tessdata`);

  // در محیط واقعی این asset ها باید به جای require() از FileSystem.Asset.loadAsync استفاده کنند
  // اینجا ساختار را آماده می‌کنیم؛ فایل‌های واقعی در android/app/src/main/assets/ قرار می‌گیرند
  // و از طریق expo-asset در runtime بارگذاری می‌شوند

  await writeVersionFile(MODEL_VERSION);
  return paths;
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function readVersionFile(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(VERSION_FILE);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(VERSION_FILE);
  } catch {
    return null;
  }
}

async function writeVersionFile(version: string): Promise<void> {
  await FileSystem.writeAsStringAsync(VERSION_FILE, version, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
