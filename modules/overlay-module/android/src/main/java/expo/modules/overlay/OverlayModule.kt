package expo.modules.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * رابط JavaScript برای حباب شناور سیستمی (Overlay).
 *
 * برخلاف FloatingBubble.tsx (که فقط داخل خودِ اپ دیده می‌شود)، این ماژول یک
 * سرویس اندرویدی واقعی (OverlayService) را کنترل می‌کند که با WindowManager
 * یک View روی *همه‌ی برنامه‌ها* اضافه می‌کند — دقیقاً مثل حباب‌های چت مسنجر.
 *
 * جریان استفاده در JS:
 *   1. hasOverlayPermission()  → بررسی مجوز «نمایش روی برنامه‌های دیگر»
 *   2. requestOverlayPermission() → در صورت نبود مجوز، باز کردن صفحه تنظیمات
 *   3. startBubble(mode)       → نمایش حباب سیستمی (mode: 'stt' | 'tts' | 'ocr')
 *   4. stopBubble()            → حذف کامل حباب سیستمی
 *
 * وقتی کاربر روی حباب سیستمی تپ می‌کند، OverlayService خودِ اپ را به foreground
 * می‌آورد (چون UI پنل میکروفون هنوز در React Native ساخته شده، نه native).
 */
class OverlayModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("OverlayModule")

        Function("hasOverlayPermission") {
            hasOverlayPermission()
        }

        Function("requestOverlayPermission") {
            val activity = appContext.currentActivity ?: return@Function null
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${activity.packageName}"),
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            null
        }

        AsyncFunction("startBubble") { mode: String ->
            val context = appContext.reactContext
                ?: throw Exception("React context در دسترس نیست")
            if (!hasOverlayPermission()) {
                throw Exception(
                    "مجوز «نمایش روی برنامه‌های دیگر» داده نشده — ابتدا requestOverlayPermission را فراخوانی کنید",
                )
            }
            OverlayService.start(context, mode)
        }

        AsyncFunction("stopBubble") {
            val context = appContext.reactContext ?: return@AsyncFunction
            null
            OverlayService.stop(context)
        }
    }

    private fun hasOverlayPermission(): Boolean {
        val context = appContext.reactContext ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }
}
