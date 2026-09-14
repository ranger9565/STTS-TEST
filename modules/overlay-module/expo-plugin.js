/**
 * Expo config plugin برای ماژول Overlay.
 * مجوز SYSTEM_ALERT_WINDOW قبلاً در AndroidManifest دستی اضافه شده؛
 * این پلاگین فعلاً فقط جای نگه‌دارنده است تا در صورت نیاز به تنظیمات بیشتر
 * (مثلاً افزودن سرویس از طریق config-plugins به‌جای ویرایش دستی مانیفست) استفاده شود.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withOverlayPlugin = (config) => {
  return withAndroidManifest(config, async (mod) => {
    return mod;
  });
};

module.exports = withOverlayPlugin;
