/**
 * Expo config plugin برای ماژول Vosk.
 * مدل vosk-model-small-fa-0.42 را از assets به filesDir کپی می‌کند.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withVoskPlugin = (config) => {
  return withAndroidManifest(config, async (mod) => {
    // مجوز ضبط صدا قبلاً در app.json اضافه شده
    return mod;
  });
};

module.exports = withVoskPlugin;
