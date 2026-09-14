package expo.modules.overlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kotlin.math.abs
import kotlin.math.hypot

/**
 * سرویس فورگراند که حباب شناور را با WindowManager روی کل صفحه‌ی گوشی
 * (بیرون از اپ خودمان، حتی وقتی اپ‌های دیگر باز هستند) نگه می‌دارد.
 *
 * منطق تعامل، دقیقاً معادل native همان چیزی است که در FloatingBubble.tsx
 * برای حالت داخل‌اپ پیاده‌سازی شده:
 *   - تپ ساده روی حباب  → اپ به foreground می‌آید (پنل میکروفون در RN باز می‌شود)
 *   - نگه‌داشتن بی‌حرکت ۳ ثانیه → هدف ضربدر ظاهر می‌شود
 *   - درگ‌کردن حباب داخل هدف ضربدر و رهاکردن → سرویس متوقف می‌شود (حباب حذف کامل)
 *   - درگ عادی → فقط جابه‌جایی حباب روی صفحه
 */
class OverlayService : Service() {

    companion object {
        const val EXTRA_MODE = "mode"
        private const val CHANNEL_ID = "stts_overlay_channel"
        private const val NOTIFICATION_ID = 4201
        private const val HOLD_DURATION_MS = 3000L
        private const val MOVE_THRESHOLD_PX = 24
        private const val CLOSE_TRIGGER_DISTANCE_PX = 160

        fun start(context: Context, mode: String) {
            val intent = Intent(context, OverlayService::class.java).apply {
                putExtra(EXTRA_MODE, mode)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, OverlayService::class.java))
        }
    }

    private lateinit var windowManager: WindowManager
    private var bubbleView: View? = null
    private var closeTargetView: View? = null

    private val handler = Handler(Looper.getMainLooper())
    private var holdRunnable: Runnable? = null

    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var initialX = 0
    private var initialY = 0
    private var hasMoved = false
    private var closeTargetVisible = false
    private var bubbleSizePx = 0
    private var closeTargetSizePx = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        bubbleSizePx = dpToPx(56)
        closeTargetSizePx = dpToPx(72)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val mode = intent?.getStringExtra(EXTRA_MODE) ?: "stt"
        startForegroundWithNotification()
        showBubble(mode)
        return START_STICKY
    }

    private fun startForegroundWithNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "حباب شناور STTS",
                NotificationManager.IMPORTANCE_MIN,
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("free-mahyar STTS")
            .setContentText("حباب شناور فعال است")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun overlayWindowType(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
    }

    private fun circleDrawable(colorArgb: Int): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(colorArgb)
    }

    private fun showBubble(mode: String) {
        if (bubbleView != null) return

        val icon = when (mode) {
            "ocr" -> "📷"
            "tts" -> "🔊"
            else -> "🎙️"
        }

        val bubble = TextView(this).apply {
            text = icon
            textSize = 24f
            gravity = Gravity.CENTER
            background = circleDrawable(0xFF1E2530.toInt())
        }

        val params = WindowManager.LayoutParams(
            bubbleSizePx,
            bubbleSizePx,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        )
        params.gravity = Gravity.TOP or Gravity.START
        params.x = 16
        params.y = 400

        bubble.setOnTouchListener { _, event -> handleTouch(event, params); true }

        windowManager.addView(bubble, params)
        bubbleView = bubble
    }

    private fun handleTouch(event: MotionEvent, params: WindowManager.LayoutParams) {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                hasMoved = false
                initialX = params.x
                initialY = params.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                scheduleHoldTimer()
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - initialTouchX
                val dy = event.rawY - initialTouchY

                if (!hasMoved && (abs(dx) > MOVE_THRESHOLD_PX || abs(dy) > MOVE_THRESHOLD_PX)) {
                    hasMoved = true
                    cancelHoldTimer()
                }

                params.x = initialX + dx.toInt()
                params.y = initialY + dy.toInt()
                bubbleView?.let { windowManager.updateViewLayout(it, params) }

                if (closeTargetVisible) {
                    updateCloseTargetHover(params)
                }
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                cancelHoldTimer()
                if (closeTargetVisible) {
                    val shouldClose = isOverCloseTarget(params)
                    hideCloseTarget()
                    if (shouldClose) {
                        stopSelf()
                    }
                } else if (!hasMoved) {
                    onBubbleTapped()
                }
            }
        }
    }

    private fun scheduleHoldTimer() {
        cancelHoldTimer()
        val runnable = Runnable {
            if (!hasMoved) {
                showCloseTarget()
            }
        }
        holdRunnable = runnable
        handler.postDelayed(runnable, HOLD_DURATION_MS)
    }

    private fun cancelHoldTimer() {
        holdRunnable?.let { handler.removeCallbacks(it) }
        holdRunnable = null
    }

    private fun closeTargetCenter(): Pair<Int, Int> {
        val metrics = resources.displayMetrics
        val x = (metrics.widthPixels - closeTargetSizePx) / 2 + closeTargetSizePx / 2
        val y = metrics.heightPixels - closeTargetSizePx - dpToPx(80) + closeTargetSizePx / 2
        return Pair(x, y)
    }

    private fun showCloseTarget() {
        if (closeTargetView != null) return
        closeTargetVisible = true

        val target = TextView(this).apply {
            text = "✕"
            textSize = 22f
            setTextColor(0xFFFFFFFF.toInt())
            gravity = Gravity.CENTER
            background = circleDrawable(0xFF33363C.toInt())
        }

        val metrics = resources.displayMetrics
        val params = WindowManager.LayoutParams(
            closeTargetSizePx,
            closeTargetSizePx,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT,
        )
        params.gravity = Gravity.TOP or Gravity.START
        params.x = (metrics.widthPixels - closeTargetSizePx) / 2
        params.y = metrics.heightPixels - closeTargetSizePx - dpToPx(80)

        windowManager.addView(target, params)
        closeTargetView = target
    }

    private fun hideCloseTarget() {
        closeTargetView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (e: IllegalArgumentException) {
                // view از قبل حذف شده — نادیده می‌گیریم
            }
        }
        closeTargetView = null
        closeTargetVisible = false
    }

    private fun isOverCloseTarget(bubbleParams: WindowManager.LayoutParams): Boolean {
        if (closeTargetView == null) return false
        val (targetCenterX, targetCenterY) = closeTargetCenter()
        val bubbleCenterX = bubbleParams.x + bubbleSizePx / 2
        val bubbleCenterY = bubbleParams.y + bubbleSizePx / 2
        val dist = hypot(
            (bubbleCenterX - targetCenterX).toDouble(),
            (bubbleCenterY - targetCenterY).toDouble(),
        )
        return dist < CLOSE_TRIGGER_DISTANCE_PX
    }

    private fun updateCloseTargetHover(bubbleParams: WindowManager.LayoutParams) {
        val target = closeTargetView as? TextView ?: return
        val over = isOverCloseTarget(bubbleParams)
        target.background = circleDrawable(if (over) 0xFFD9453C.toInt() else 0xFF33363C.toInt())
    }

    /**
     * حباب لمس شد (تپ ساده، نه هولد/درگ) → اپ اصلی را به foreground می‌آوریم
     * تا پنل میکروفون (React Native) در همان‌جا باز شود.
     * توجه: خودِ حباب سیستمی همچنان فعال می‌ماند تا وقتی صراحتاً بسته شود؛
     * منطق نمایش/مخفی‌کردن آن هنگام foreground/background شدن اپ در JS
     * (useOverlayBubble.ts) مدیریت می‌شود.
     */
    private fun onBubbleTapped() {
        val uri = android.net.Uri.parse("stts://openMic")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        }
        startActivity(intent)
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    private fun removeBubble() {
        bubbleView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (e: IllegalArgumentException) {
                // view از قبل حذف شده — نادیده می‌گیریم
            }
        }
        bubbleView = null
        hideCloseTarget()
    }

    override fun onDestroy() {
        cancelHoldTimer()
        removeBubble()
        super.onDestroy()
    }
}
