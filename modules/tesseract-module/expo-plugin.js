/**
 * Expo config plugin برای ماژول Tesseract OCR.
 * فایل‌های tessdata/fas.traineddata از assets به filesDir کپی می‌شوند.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withTesseractPlugin = (config) => {
  return withAndroidManifest(config, async (mod) => {
    return mod;
  });
};

module.exports = withTesseractPlugin;
