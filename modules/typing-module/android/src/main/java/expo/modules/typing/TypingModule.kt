package expo.modules.typing

import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * رابط JavaScript برای تایپ متن تشخیص‌داده‌شده در فیلد فوکوس‌شده‌ی هر اپ دیگر،
 * از طریق TypingAccessibilityService.
 *
 * جریان استفاده در JS:
 *   ۱. isAccessibilityServiceEnabled() → بررسی فعال بودن سرویس
 *   ۲. اگر false بود: openAccessibilitySettings() → کاربر خودش از تنظیمات فعالش می‌کند
 *   ۳. typeText(text) → اضافه‌کردن متن به فیلد فوکوس‌شده‌ی فعلی
 */
class TypingModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("TypingModule")

        Function("isAccessibilityServiceEnabled") {
            isAccessibilityServiceEnabled()
        }

        Function("openAccessibilitySettings") {
            val activity = appContext.currentActivity ?: return@Function null
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
        }

        AsyncFunction("typeText") { text: String ->
            val service = TypingAccessibilityService.instance
                ?: throw Exception(
                    "سرویس دسترس‌پذیری STTS فعال نیست — ابتدا از تنظیمات اندروید آن را روشن کنید",
                )
            val success = service.appendText(text)
            if (!success) {
                throw Exception("فیلد متنی قابل‌ویرایشی برای تایپ پیدا نشد")
            }
        }
    }

    /** بررسی می‌کند آیا کاربر سرویس TypingAccessibilityService را از تنظیمات فعال کرده یا نه */
    private fun isAccessibilityServiceEnabled(): Boolean {
        val context = appContext.reactContext ?: return false
        val expectedServiceName = "${context.packageName}/expo.modules.typing.TypingAccessibilityService"

        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false

        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expectedServiceName, ignoreCase = true)) {
                return true
            }
        }
        return false
    }
}
