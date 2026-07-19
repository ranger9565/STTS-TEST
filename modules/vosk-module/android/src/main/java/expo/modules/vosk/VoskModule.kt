package expo.modules.vosk

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.vosk.Model
import org.vosk.Recognizer
import java.io.IOException

class VoskModule : Module() {

    private var model: Model? = null
    private var recognizer: Recognizer? = null

    override fun definition() = ModuleDefinition {

        Name("VoskModule")

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
         * شروع جلسه تشخیص با نرخ نمونه مشخص (معمولاً ۱۶۰۰۰ Hz برای Vosk فارسی).
         */
        AsyncFunction("start") { sampleRate: Int ->
            val m = model ?: throw Exception("Vosk not initialized — call init() first")
            recognizer?.close()
            recognizer = Recognizer(m, sampleRate.toFloat())
        }

        /**
         * ارسال بلوک صوتی PCM 16-bit Little-Endian به موتور.
         * ورودی: base64-encoded bytes
         * خروجی: {"partial":"..."} یا null
         */
        AsyncFunction("feedAudio") { samplesBase64: String ->
            val rec = recognizer ?: throw Exception("Recognition not started — call start() first")
            val bytes = Base64.decode(samplesBase64, Base64.DEFAULT)
            val accepted = rec.acceptWaveForm(bytes, bytes.size)
            if (accepted) {
                // نتیجه جزئی کامل شد — برگردان partial
                mapOf("partial" to extractPartial(rec.partialResult))
            } else {
                mapOf("partial" to extractPartial(rec.partialResult))
            }
        }

        /**
         * توقف ضبط و دریافت نتیجه نهایی.
         * خروجی: {"text":"..."}
         */
        AsyncFunction("stop") {
            val rec = recognizer ?: throw Exception("Recognition not started")
            val result = rec.finalResult
            recognizer?.close()
            recognizer = null
            mapOf("text" to extractText(result))
        }

        /** آزادسازی کامل منابع Vosk */
        AsyncFunction("destroy") {
            recognizer?.close()
            recognizer = null
            model?.close()
            model = null
        }
    }

    /** استخراج مقدار "partial" از JSON خروجی Vosk */
    private fun extractPartial(json: String): String {
        // خروجی Vosk: {"partial" : "متن جزئی"}
        return Regex(""""partial"\s*:\s*"([^"]*)"""")
            .find(json)?.groupValues?.getOrNull(1) ?: ""
    }

    /** استخراج مقدار "text" از JSON نهایی Vosk */
    private fun extractText(json: String): String {
        // خروجی Vosk: {"text" : "متن نهایی"}
        return Regex(""""text"\s*:\s*"([^"]*)"""")
            .find(json)?.groupValues?.getOrNull(1) ?: ""
    }

    override fun onDestroy() {
        recognizer?.close()
        model?.close()
    }
}
