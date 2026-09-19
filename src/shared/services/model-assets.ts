/**
 * کپی واقعی مدل‌های AI از bundled Android assets به filesDir/documentDirectory اپ.
 *
 * Android assets در build داخل android/app/src/main/assets/ قرار می‌گیرند.
 * FileSystem.bundleDirectory به همین bundle دسترسی read-only می‌دهد و
 * FileSystem.copyAsync می‌تواند فایل/پوشه bundled را به فضای writable اپ کپی کند.
 */

import * as FileSystem from 'expo-file-system/legacy';

const MODEL_VERSION = '2.0.0';
const VERSION_FILE = `${FileSystem.documentDirectory}.model_version`;

const ASSET_ROOT = {
  vosk: 'vosk/vosk-model-small-fa-0.42',
  piper: 'piper',
  espeak: 'espeak-ng-data',
  tessdata: 'tessdata',
} as const;

export interface ModelPaths {
  voskModelPath: string;
  piperModelsDir: string;
  espeakDataDir: string;
  tessDataPath: string;
}

export async function ensureModelsReady(): Promise<ModelPaths> {
  const documentDirectory = FileSystem.documentDirectory;
  const bundleDirectory = FileSystem.bundleDirectory;

  if (!documentDirectory) {
    throw new Error('STTS model storage is unavailable: documentDirectory is null.');
  }
  if (!bundleDirectory) {
    throw new Error('STTS model assets are unavailable: bundleDirectory is null.');
  }

  const paths: ModelPaths = {
    voskModelPath: `${documentDirectory}vosk-model-small-fa-0.42`,
    piperModelsDir: `${documentDirectory}piper-models`,
    espeakDataDir: `${documentDirectory}espeak-ng-data`,
    tessDataPath: documentDirectory,
  };

  const requiredDestinations = [
    paths.voskModelPath,
    `${paths.piperModelsDir}/fa_IR-gyro-medium.onnx`,
    `${paths.piperModelsDir}/fa_IR-gyro-medium.onnx.json`,
    `${paths.piperModelsDir}/en_US-lessac-medium.onnx`,
    `${paths.piperModelsDir}/en_US-lessac-medium.onnx.json`,
    `${paths.espeakDataDir}/phsource`,
    `${paths.tessDataPath}tessdata/fas.traineddata`,
  ];

  const currentVersion = await readVersionFile();
  const complete = currentVersion === MODEL_VERSION && await allExist(requiredDestinations);

  if (complete) {
    return paths;
  }

  await ensureDir(paths.piperModelsDir);
  await ensureDir(paths.espeakDataDir);
  await ensureDir(`${paths.tessDataPath}tessdata`);

  // اگر نسخه قبلی ناقص/قدیمی است، مقصدهای مدل را پاک می‌کنیم تا
  // فایل‌های قدیمی با مدل جدید مخلوط نشوند.
  await removeIfExists(paths.voskModelPath);
  await removeIfExists(paths.piperModelsDir);
  await removeIfExists(paths.espeakDataDir);
  await removeIfExists(`${paths.tessDataPath}tessdata`);

  await copyBundledDirectory(
    bundleDirectory,
    ASSET_ROOT.vosk,
    paths.voskModelPath,
  );
  await copyBundledDirectory(
    bundleDirectory,
    ASSET_ROOT.piper,
    paths.piperModelsDir,
  );
  await copyBundledDirectory(
    bundleDirectory,
    ASSET_ROOT.espeak,
    paths.espeakDataDir,
  );
  await copyBundledDirectory(
    bundleDirectory,
    ASSET_ROOT.tessdata,
    `${paths.tessDataPath}tessdata`,
  );

  const copied = await allExist(requiredDestinations);
  if (!copied) {
    throw new Error(
      'STTS model extraction finished without all required model files. ' +
        'Check android/app/src/main/assets contents.',
    );
  }

  await writeVersionFile(MODEL_VERSION);
  return paths;
}

async function copyBundledDirectory(
  bundleRoot: string,
  relativeSource: string,
  destination: string,
): Promise<void> {
  const source = joinUri(bundleRoot, relativeSource);
  const sourceInfo = await FileSystem.getInfoAsync(source);

  if (!sourceInfo.exists || !sourceInfo.isDirectory) {
    throw new Error(`Missing bundled STTS asset directory: ${relativeSource}`);
  }

  await ensureDir(parentDirectory(destination));
  await FileSystem.copyAsync({
    from: source,
    to: destination,
  });
}

async function allExist(paths: string[]): Promise<boolean> {
  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        return (await FileSystem.getInfoAsync(path)).exists;
      } catch {
        return false;
      }
    }),
  );
  return results.every(Boolean);
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function removeIfExists(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

async function readVersionFile(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(VERSION_FILE);
    if (!info.exists) return null;
    return (await FileSystem.readAsStringAsync(VERSION_FILE)).trim();
  } catch {
    return null;
  }
}

async function writeVersionFile(version: string): Promise<void> {
  await FileSystem.writeAsStringAsync(VERSION_FILE, version, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

function joinUri(root: string, relativePath: string): string {
  return `${root.replace(/\\?\/$/, '')}/${relativePath}`;
}

function parentDirectory(path: string): string {
  const index = path.lastIndexOf('/');
  return index >= 0 ? path.slice(0, index + 1) : path;
}
