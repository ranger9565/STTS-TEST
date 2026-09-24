package expo.modules.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * رابط JavaScript برای حباب‌های شناور سیستمی.
 *
 * startBubble(mode) سرویس را در foreground نگه می‌دارد و visibility
 * حباب را جداگانه کنترل می‌کند؛ بنابراین ورود/خروج اپ از foreground
 * باعث start شدن سرویس از پس‌زمینه نمی‌شود.
 */
class OverlayModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("OverlayModule")

        // تپ روی حباب STT بدون جلو آوردن اپ به JS داده می‌شود
        Events("onBubbleTap")

        OnCreate {
            OverlayService.tapHandler = { mode ->
                if (mode == "stt") {
                    sendEvent("onBubbleTap", mapOf("mode" to mode))
                    true
                } else {
                    false
                }
            }
        }

        OnDestroy {
            OverlayService.tapHandler = null
        }

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

        AsyncFunction("startBubble") { mode: String, visible: Boolean ->
            val context = appContext.reactContext
                ?: throw Exception("React context در دسترس نیست")

            if (!hasOverlayPermission()) {
                throw Exception(
                    "مجوز «نمایش روی برنامه‌های دیگر» داده نشده — ابتدا requestOverlayPermission را فراخوانی کنید",
                )
            }

            OverlayService.start(context, mode, visible)
        }

        AsyncFunction("setBubbleVisibility") { mode: String, visible: Boolean ->
            val context = appContext.reactContext ?: return@AsyncFunction null
            OverlayService.setVisibility(context, mode, visible)
            null
        }

        AsyncFunction("setBubbleActive") { mode: String, active: Boolean ->
            val context = appContext.reactContext ?: return@AsyncFunction null
            OverlayService.setActive(context, mode, active)
            null
        }

        AsyncFunction("stopBubble") { mode: String ->
            val context = appContext.reactContext ?: return@AsyncFunction null
            OverlayService.stop(context, mode)
            null
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
