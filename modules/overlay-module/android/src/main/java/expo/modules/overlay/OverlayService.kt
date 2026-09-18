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
 * سرویس فورگراند حباب‌های شناور.
 *
 * هر mode مالک View و وضعیت تعامل خودش است؛ بنابراین STT و TTS/OCR می‌توانند
 * هم‌زمان وجود داشته باشند و حذف یکی، دیگری را متوقف نمی‌کند.
 */
class OverlayService : Service() {

    companion object {
        const val EXTRA_MODE = "mode"
        private const val ACTION_STOP_MODE = "expo.modules.overlay.STOP_MODE"
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

        fun stop(context: Context, mode: String) {
            val intent = Intent(context, OverlayService::class.java).apply {
                action = ACTION_STOP_MODE
                putExtra(EXTRA_MODE, mode)
            }
            // این فرمان فقط حذف یک حباب موجود است؛ سرویس را از نو به‌صورت
            // foreground راه نمی‌اندازیم تا روی Android 8+ محدودیت شروع سرویس
            // پس‌زمینه ایجاد نشود.
            context.startService(intent)
        }
    }

    private data class BubbleState(
        val mode: String,
        val view: TextView,
        val params: WindowManager.LayoutParams,
        var closeTargetView: View? = null,
        var holdRunnable: Runnable? = null,
        var initialTouchX: Float = 0f,
        var initialTouchY: Float = 0f,
        var initialX: Int = 0,
        var initialY: Int = 0,
        var hasMoved: Boolean = false,
        var closeTargetVisible: Boolean = false,
    )

    private lateinit var windowManager: WindowManager
    private val bubbles = mutableMapOf<String, BubbleState>()
    private val handler = Handler(Looper.getMainLooper())

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
        val mode = normalizeMode(intent?.getStringExtra(EXTRA_MODE))

        if (intent?.action == ACTION_STOP_MODE) {
            removeBubble(mode)
            if (bubbles.isEmpty()) stopSelfResult(startId)
            return START_NOT_STICKY
        }

        startForegroundWithNotification()
        showBubble(mode)
        return START_STICKY
    }

    private fun normalizeMode(mode: String?): String {
        return when (mode) {
            "tts", "ocr" -> mode
            else -> "stt"
        }
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
        if (bubbles.containsKey(mode)) return

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
        val index = bubbles.size
        params.x = clampX(16 + index * dpToPx(68))
        params.y = clampY(400 + index * dpToPx(8))

        val state = BubbleState(mode, bubble, params)
        bubble.setOnTouchListener { _, event ->
            handleTouch(state, event)
            true
        }

        windowManager.addView(bubble, params)
        bubbles[mode] = state
    }

    private fun handleTouch(state: BubbleState, event: MotionEvent) {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                state.hasMoved = false
                state.initialX = state.params.x
                state.initialY = state.params.y
                state.initialTouchX = event.rawX
                state.initialTouchY = event.rawY
                scheduleHoldTimer(state)
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - state.initialTouchX
                val dy = event.rawY - state.initialTouchY

                if (!state.hasMoved &&
                    (abs(dx) > MOVE_THRESHOLD_PX || abs(dy) > MOVE_THRESHOLD_PX)
                ) {
                    state.hasMoved = true
                    cancelHoldTimer(state)
                }

                state.params.x = clampX(state.initialX + dx.toInt())
                state.params.y = clampY(state.initialY + dy.toInt())
                try {
                    windowManager.updateViewLayout(state.view, state.params)
                } catch (_: IllegalArgumentException) {
                    return
                }

                if (state.closeTargetVisible) {
                    updateCloseTargetHover(state)
                }
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                cancelHoldTimer(state)

                if (state.closeTargetVisible) {
                    val shouldClose = isOverCloseTarget(state.params)
                    hideCloseTarget(state)
                    if (shouldClose) {
                        removeBubble(state.mode)
                    }
                } else if (!state.hasMoved) {
                    onBubbleTapped(state.mode)
                }
            }
        }
    }

    private fun scheduleHoldTimer(state: BubbleState) {
        cancelHoldTimer(state)
        val runnable = Runnable {
            if (!state.hasMoved && bubbles[state.mode] === state) {
                showCloseTarget(state)
            }
        }
        state.holdRunnable = runnable
        handler.postDelayed(runnable, HOLD_DURATION_MS)
    }

    private fun cancelHoldTimer(state: BubbleState) {
        state.holdRunnable?.let { handler.removeCallbacks(it) }
        state.holdRunnable = null
    }

    private fun clampX(x: Int): Int {
        val width = resources.displayMetrics.widthPixels
        return x.coerceIn(0, (width - bubbleSizePx).coerceAtLeast(0))
    }

    private fun clampY(y: Int): Int {
        val height = resources.displayMetrics.heightPixels
        return y.coerceIn(0, (height - bubbleSizePx).coerceAtLeast(0))
    }

    private fun closeTargetCenter(): Pair<Int, Int> {
        val metrics = resources.displayMetrics
        val x = (metrics.widthPixels - closeTargetSizePx) / 2 + closeTargetSizePx / 2
        val y = metrics.heightPixels - closeTargetSizePx - dpToPx(80) + closeTargetSizePx / 2
        return Pair(x, y)
    }

    private fun showCloseTarget(state: BubbleState) {
        if (state.closeTargetView != null) return
        state.closeTargetVisible = true

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
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT,
        )
        params.gravity = Gravity.TOP or Gravity.START
        params.x = (metrics.widthPixels - closeTargetSizePx) / 2
        params.y = metrics.heightPixels - closeTargetSizePx - dpToPx(80)

        windowManager.addView(target, params)
        state.closeTargetView = target
    }

    private fun hideCloseTarget(state: BubbleState) {
        state.closeTargetView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (_: IllegalArgumentException) {
                // view از قبل حذف شده است.
            }
        }
        state.closeTargetView = null
        state.closeTargetVisible = false
    }

    private fun isOverCloseTarget(bubbleParams: WindowManager.LayoutParams): Boolean {
        val (targetCenterX, targetCenterY) = closeTargetCenter()
        val bubbleCenterX = bubbleParams.x + bubbleSizePx / 2
        val bubbleCenterY = bubbleParams.y + bubbleSizePx / 2
        val dist = hypot(
            (bubbleCenterX - targetCenterX).toDouble(),
            (bubbleCenterY - targetCenterY).toDouble(),
        )
        return dist < CLOSE_TRIGGER_DISTANCE_PX
    }

    private fun updateCloseTargetHover(state: BubbleState) {
        val target = state.closeTargetView as? TextView ?: return
        val over = isOverCloseTarget(state.params)
        target.background = circleDrawable(
            if (over) 0xFFD9453C.toInt() else 0xFF33363C.toInt(),
        )
    }

    private fun onBubbleTapped(mode: String) {
        val path = when (mode) {
            "tts" -> "openTts"
            "ocr" -> "openOcr"
            else -> "openMic"
        }
        val uri = android.net.Uri.parse("stts://$path")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        }
        startActivity(intent)
    }

    private fun removeBubble(mode: String) {
        val state = bubbles.remove(mode) ?: return
        cancelHoldTimer(state)
        hideCloseTarget(state)

        try {
            windowManager.removeView(state.view)
        } catch (_: IllegalArgumentException) {
            // view از قبل حذف شده است.
        }

        if (bubbles.isEmpty()) {
            stopSelf()
        }
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    override fun onDestroy() {
        bubbles.values.toList().forEach { state ->
            cancelHoldTimer(state)
            hideCloseTarget(state)
            try {
                windowManager.removeView(state.view)
            } catch (_: IllegalArgumentException) {
                // view از قبل حذف شده است.
            }
        }
        bubbles.clear()
        super.onDestroy()
    }
}
