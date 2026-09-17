package expo.modules.vosk

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.vosk.Model
import org.vosk.Recognizer
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

class VoskModule : Module() {

    private var model: Model? = null
    private var recognizer: Recognizer? = null
    private var recordThread: Thread? = null
    private var audioRecord: AudioRecord? = null
    private val isListening = AtomicBoolean(false)

    override fun definition() = ModuleDefinition {

        Name("VoskModule")

        // رویدادهایی که هنگام ضبط زنده به سمت JS ارسال می‌شوند
        Events("onPartialResult", "onFinalResult", "onError")

        /**
         * مقداردهی اولیه با مسیر پوشه مدل روی دستگاه.
         * مدل باید قبلاً از assets به filesDir کپی شده باشد.
         */
        AsyncFunction("init") { modelPath: String ->
            try {
                model?.close()
                model = Model(modelPath)
            } catch (e: IOException) {
                throw Exception("Vosk init failed: ${e.message}")
            }
        }

        /**
         * شروع ضبط زنده میکروفون (AudioRecord) و ارسال مستقیم PCM به Vosk.
         * تمام حلقه ضبط و تشخیص در ترد جداگانه native انجام می‌شود —
         * دیگر نیازی به رفت‌وبرگشت با JS برای هر بلوک صوتی نیست.
         */
        AsyncFunction("start") { sampleRate: Int ->
            val m = model ?: throw Exception("Vosk not initialized — call init() first")

            val context = appContext.reactContext
                ?: throw Exception("Context در دسترس نیست")

            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED
            ) {
                throw Exception("دسترسی میکروفون داده نشده — RECORD_AUDIO")
            }

            if (isListening.get()) {
                throw Exception("ضبط از قبل در حال انجام است")
            }

            recognizer?.close()
            recognizer = Recognizer(m, sampleRate.toFloat())

            val minBufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            val bufferSize = if (minBufferSize > 0) minBufferSize * 2 else sampleRate

            val record = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )

            if (record.state != AudioRecord.STATE_INITIALIZED) {
                record.release()
                throw Exception("راه‌اندازی میکروفون (AudioRecord) ناموفق بود")
            }

            audioRecord = record
            isListening.set(true)
            record.startRecording()

            val thread = Thread {
                val buffer = ShortArray(bufferSize / 2)
                try {
                    while (isListening.get()) {
                        val read = record.read(buffer, 0, buffer.size)
                        if (read > 0) {
                            val rec = recognizer ?: break
                            val accepted = rec.acceptWaveForm(buffer, read)
                            if (accepted) {
                                sendEvent("onFinalResult", mapOf("text" to extractText(rec.result)))
                            } else {
                                sendEvent("onPartialResult", mapOf("partial" to extractPartial(rec.partialResult)))
                            }
                        }
                    }
                } catch (e: Exception) {
                    sendEvent("onError", mapOf("error" to (e.message ?: "خطای ناشناخته در ضبط میکروفون")))
                } finally {
                    try {
                        record.stop()
                    } catch (_: Exception) {
                    }
                    record.release()
                }
            }
            recordThread = thread
            thread.start()
        }

        /**
         * ارسال دستی بلوک صوتی PCM 16-bit (برای مسیرهای غیر زنده مثل تبدیل فایل صوتی).
         * ورودی: base64-encoded bytes
         */
        AsyncFunction("feedAudio") { samplesBase64: String ->
            val rec = recognizer ?: throw Exception("Recognition not started — call start() first")
            val bytes = android.util.Base64.decode(samplesBase64, android.util.Base64.DEFAULT)
            rec.acceptWaveForm(bytes, bytes.size)
            mapOf("partial" to extractPartial(rec.partialResult))
        }

        /**
         * توقف ضبط زنده و دریافت نتیجه نهایی از Vosk.
         */
        AsyncFunction("stop") {
            isListening.set(false)
            recordThread?.join(1500)
            recordThread = null
            audioRecord = null

            val rec = recognizer ?: throw Exception("جلسه‌ای در حال اجرا نیست")
            val result = rec.finalResult
            rec.close()
            recognizer = null
            mapOf("text" to extractText(result))
        }

        /** آزادسازی کامل منابع Vosk و توقف اضطراری ضبط */
        AsyncFunction("destroy") {
            isListening.set(false)
            recordThread?.join(1000)
            recordThread = null
            audioRecord = null
            recognizer?.close()
            recognizer = null
            model?.close()
            model = null
        }

        OnDestroy {
            isListening.set(false)
            recordThread?.join(500)
            recognizer?.close()
            model?.close()
        }
    }

    /** استخراج مقدار "partial" از JSON خروجی Vosk */
    private fun extractPartial(json: String): String {
        return Regex(""""partial"\s*:\s*"([^"]*)"""")
            .find(json)?.groupValues?.getOrNull(1) ?: ""
    }

    /** استخراج مقدار "text" از JSON نهایی Vosk */
    private fun extractText(json: String): String {
        return Regex(""""text"\s*:\s*"([^"]*)"""")
            .find(json)?.groupValues?.getOrNull(1) ?: ""
    }

}
