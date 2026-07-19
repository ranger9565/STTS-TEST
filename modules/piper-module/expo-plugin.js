/**
 * Expo config plugin برای ماژول Piper TTS.
 * مدل‌های .onnx و espeak-ng-data از assets به filesDir کپی می‌شوند.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withPiperPlugin = (config) => {
  return withAndroidManifest(config, async (mod) => {
    return mod;
  });
};

module.exports = withPiperPlugin;
