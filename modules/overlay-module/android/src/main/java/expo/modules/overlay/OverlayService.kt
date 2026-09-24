package expo.modules.overlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.Manifest
import android.content.pm.PackageManager
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
import androidx.core.content.ContextCompat
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.roundToInt

/**
 * سرویس فورگراند حباب‌های شناور.
 *
 * هر mode مالک View و وضعیت تعامل خودش است؛ بنابراین STT و TTS/OCR می‌توانند
 * هم‌زمان وجود داشته باشند و حذف یکی، دیگری را متوقف نمی‌کند.
 */
class OverlayService : Service() {

    companion object {
        const val EXTRA_MODE = "mode"
        const val ACTION_STOP_MODE = "expo.modules.overlay.STOP_MODE"
        const val ACTION_SET_VISIBILITY = "expo.modules.overlay.SET_VISIBILITY"
        const val EXTRA_VISIBLE = "visible"
        const val ACTION_SET_ACTIVE = "expo.modules.overlay.SET_ACTIVE"
        const val EXTRA_ACTIVE = "active"
        private const val COLOR_IDLE = 0xFF1E2530.toInt()
        private const val COLOR_ACTIVE = 0xFFD32F2F.toInt()

        /**
         * اگر JS زنده باشد، تپ روی حباب را (بدون جلو آوردن اپ) به آن می‌دهد.
         * مقدار برگشتی true یعنی JS تپ را مدیریت کرد؛ در غیر این صورت
         * سرویس مثل قبل اپ را باز می‌کند. (توسط OverlayModule تنظیم می‌شود)
         */
        @Volatile
        var tapHandler: ((String) -> Boolean)? = null

        fun setActive(context: Context, mode: String, active: Boolean) {
            val intent = Intent(context, OverlayService::class.java).apply {
                action = ACTION_SET_ACTIVE
                putExtra(EXTRA_MODE, mode)
                putExtra(EXTRA_ACTIVE, active)
            }
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
        }
        private const val CHANNEL_ID = "stts_overlay_channel"
        private const val NOTIFICATION_ID = 4201
        private const val HOLD_DURATION_MS = 3000L
        private const val MOVE_THRESHOLD_PX = 24
        private const val CLOSE_TRIGGER_DISTANCE_PX = 160

        fun start(context: Context, mode: String, visible: Boolean) {
            val intent = Intent(context, OverlayService::class.java).apply {
                putExtra(EXTRA_MODE, mode)
                putExtra(EXTRA_VISIBLE, visible)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun setVisibility(context: Context, mode: String, visible: Boolean) {
            val intent = Intent(context, OverlayService::class.java).apply {
                action = ACTION_SET_VISIBILITY
                putExtra(EXTRA_MODE, mode)
                putExtra(EXTRA_VISIBLE, visible)
            }
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
        }

        fun stop(context: Context, mode: String) {
            val intent = Intent(context, OverlayService::class.java).apply {
                action = ACTION_STOP_MODE
                putExtra(EXTRA_MODE, mode)
            }
            // توقف یک mode نباید سرویس را دوباره از پس‌زمینه start کند.
            // Broadcast به receiver داخلی سرویس ارسال می‌شود؛ تا وقتی سرویس
            // حباب‌های دیگری دارد، همان instance باقی می‌ماند.
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
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
    private val activeModes = mutableSetOf<String>()
    private val handler = Handler(Looper.getMainLooper())
    private val stopModeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_STOP_MODE -> {
                    val mode = intent.getStringExtra(EXTRA_MODE) ?: return
                    normalizeMode(mode)?.let(::removeBubble)
                }
                ACTION_SET_VISIBILITY -> {
                    val mode = intent.getStringExtra(EXTRA_MODE) ?: return
                    val visible = intent.getBooleanExtra(EXTRA_VISIBLE, false)
                    normalizeMode(mode)?.let {
                        if (visible) showBubble(it) else hideBubble(it)
                    }
                }
                ACTION_SET_ACTIVE -> {
                    val mode = intent.getStringExtra(EXTRA_MODE) ?: return
                    val active = intent.getBooleanExtra(EXTRA_ACTIVE, false)
                    normalizeMode(mode)?.let { setBubbleActive(it, active) }
                }
                else -> return
            }
        }
    }

    private var bubbleSizePx = 0
    private var closeTargetSizePx = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        ContextCompat.registerReceiver(
            this,
            stopModeReceiver,
            IntentFilter().apply {
                addAction(ACTION_STOP_MODE)
                addAction(ACTION_SET_VISIBILITY)
                addAction(ACTION_SET_ACTIVE)
            },
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        bubbleSizePx = dpToPx(56)
        closeTargetSizePx = dpToPx(72)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_MODE) {
            val requestedMode = intent.getStringExtra(EXTRA_MODE) ?: return START_NOT_STICKY
            normalizeMode(requestedMode)?.let(::removeBubble)
            if (bubbles.isEmpty()) stopSelfResult(startId)
            return START_NOT_STICKY
        }

        val requestedMode = intent?.getStringExtra(EXTRA_MODE) ?: return START_NOT_STICKY
        val mode = normalizeMode(requestedMode) ?: return START_NOT_STICKY

        startForegroundWithNotification()
        if (intent.getBooleanExtra(EXTRA_VISIBLE, true)) {
            showBubble(mode)
        } else {
            hideBubble(mode)
        }
        return START_NOT_STICKY
    }

    private fun normalizeMode(mode: String?): String? {
        return when (mode) {
            "stt", "tts", "ocr" -> mode
            else -> null
        }
    }

    private fun startForegroundWithNotification(includeMicrophone: Boolean = activeModes.contains("stt")) {
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
            val specialUse = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            // ضبط میکروفون وقتی اپ پشت اپ دیگری است فقط با سرویس foreground از نوع
            // microphone مجاز است (Android 11+). نوع microphone فقط وقتی اضافه می‌شود
            // که RECORD_AUDIO داده شده باشد، وگرنه Android 14 خطای امنیتی می‌دهد.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && includeMicrophone && hasMicPermission()) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    specialUse or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
                )
                return
            }
            startForeground(NOTIFICATION_ID, notification, specialUse)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun hasMicPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    /** حباب فعال (مثلاً در حال ضبط) قرمز می‌شود تا کاربر بداند میکروفون روشن است. */
    private fun setBubbleActive(mode: String, active: Boolean) {
        if (active) activeModes.add(mode) else activeModes.remove(mode)
        // نوع microphone فقط هنگام فعال بودن STT به foreground service اضافه می‌شود.
        // حباب‌های TTS/OCR به تنهایی فقط specialUse هستند.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForegroundWithNotification(activeModes.contains("stt"))
        }
        bubbles[mode]?.let { state ->
            state.view.background =
                circleDrawable(if (active) COLOR_ACTIVE else COLOR_IDLE)
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
            background = circleDrawable(
                if (activeModes.contains(mode)) COLOR_ACTIVE else COLOR_IDLE,
            )
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

    private fun hideBubble(mode: String) {
        val state = bubbles[mode] ?: return
        cancelHoldTimer(state)
        hideCloseTarget(state)
        state.view.visibility = View.GONE
    }


    private fun updateCloseTargetHover(state: BubbleState) {
        val target = state.closeTargetView ?: return
        val over = isOverCloseTarget(state.params)
        target.background = circleDrawable(
            if (over) 0xFFE53935.toInt() else 0xFF33363C.toInt()
        )
    }

    private fun isOverCloseTarget(params: WindowManager.LayoutParams): Boolean {
        val (targetX, targetY) = closeTargetCenter()
        val bubbleCenterX = params.x + bubbleSizePx / 2
        val bubbleCenterY = params.y + bubbleSizePx / 2
        return hypot(
            (bubbleCenterX - targetX).toDouble(),
            (bubbleCenterY - targetY).toDouble(),
        ) <= CLOSE_TRIGGER_DISTANCE_PX
    }

    private fun hideCloseTarget(state: BubbleState) {
        cancelHoldTimer(state)
        state.closeTargetView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (_: IllegalArgumentException) {
                // Already removed by the window manager.
            }
        }
        state.closeTargetView = null
        state.closeTargetVisible = false
    }

    private fun removeBubble(mode: String) {
        val state = bubbles.remove(mode) ?: return
        cancelHoldTimer(state)
        hideCloseTarget(state)
        try {
            windowManager.removeView(state.view)
        } catch (_: IllegalArgumentException) {
            // View was already detached.
        }
        if (bubbles.isEmpty()) {
            stopSelf()
        }
    }

    private fun onBubbleTapped(mode: String) {
        // اگر JS تپ را بگیرد (مثلاً شروع/توقف ضبط)، اپ جلو نمی‌آید و
        // اپ مقصد فوکوس ورودی را نگه می‌دارد تا تایپ در آن انجام شود.
        if (tapHandler?.invoke(mode) == true) return

        val route = when (mode) {
            "stt" -> "openMic"
            "tts" -> "openTts"
            "ocr" -> "openOcr"
            else -> return
        }
        val intent = Intent(
            Intent.ACTION_VIEW,
            android.net.Uri.parse("stts://$route"),
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            setPackage(packageName)
        }
        try {
            startActivity(intent)
        } catch (_: Exception) {
            // The app activity may not currently be resolvable.
        }
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).roundToInt()
    }

    override fun onDestroy() {
        bubbles.values.toList().forEach { state ->
            cancelHoldTimer(state)
            hideCloseTarget(state)
            try {
                windowManager.removeView(state.view)
            } catch (_: IllegalArgumentException) {
                // View was already detached.
            }
        }
        bubbles.clear()
        handler.removeCallbacksAndMessages(null)
        try {
            unregisterReceiver(stopModeReceiver)
        } catch (_: IllegalArgumentException) {
            // Receiver was already unregistered.
        }
        super.onDestroy()
    }
}
