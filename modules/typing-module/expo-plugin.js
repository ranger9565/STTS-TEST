/**
 * Expo config plugin برای ماژول Typing (AccessibilityService).
 * سرویس و مجوزهای لازم مستقیماً در android/app/src/main/AndroidManifest.xml
 * و res/xml/accessibility_service_config.xml اضافه شده‌اند؛
 * این پلاگین فعلاً فقط جای نگه‌دارنده است.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withTypingPlugin = (config) => {
  return withAndroidManifest(config, async (mod) => {
    return mod;
  });
};

module.exports = withTypingPlugin;
