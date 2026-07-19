package expo.modules.piper

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.LongBuffer

/**
 * ماژول Piper TTS — فونیمیزیشن + سنتز ONNX در Kotlin.
 *
 * معماری Piper:
 *   متن → فونیم IDs (از طریق espeak-ng JNI) → OrtSession.run() → audio float array → WAV
 *
 * نیازمندی‌ها روی دستگاه (کپی از assets در app startup):
 *   - modelPath: مسیر فایل .onnx مدل Piper
 *   - configPath: مسیر فایل .json کانفیگ مدل (شامل phoneme_id_map)
 *   - espeakDataPath: مسیر پوشه espeak-ng-data
 */
class PiperModule : Module() {

    private val ortEnv = OrtEnvironment.getEnvironment()
    private val sessions = mutableMapOf<String, OrtSession>()     // modelId → OrtSession
    private val configs = mutableMapOf<String, JSONObject>()      // modelId → config JSON
    private var espeakDataDir: String? = null

    override fun definition() = ModuleDefinition {

        Name("PiperModule")

        /**
         * بارگذاری مدل و config.
         * چندین بار با modelId های متفاوت قابل فراخوانی است (fa و en).
         */
        AsyncFunction("init") { modelPath: String, configPath: String, espeakData: String ->
            espeakDataDir = espeakData

            val configJson = File(configPath).readText()
            val config = JSONObject(configJson)
            val modelId = config.optString("key", File(modelPath).nameWithoutExtension)

            val sessionOptions = OrtSession.SessionOptions().apply {
                setIntraOpNumThreads(2)
                addConfigEntry("session.load_model_format", "ORT")
            }

            sessions[modelId]?.close()
            sessions[modelId] = ortEnv.createSession(modelPath, sessionOptions)
            configs[modelId] = config
        }

        /**
         * تبدیل متن به WAV با مدل مشخص.
         * @return base64-encoded WAV (22050 Hz, 16-bit, mono)
         */
        AsyncFunction("synthesize") { text: String, modelId: String ->
            val session = sessions[modelId]
                ?: throw Exception("Model '$modelId' not loaded — call init() first")
            val config = configs[modelId]!!

            // ۱. فونیمیزیشن متن → شناسه‌های صوت با espeak-ng
            val phonemeIds = phonemizeWithEspeak(text, config)

            // ۲. آماده‌سازی tensor ورودی ONNX
            val inputShape = longArrayOf(1, phonemeIds.size.toLong())
            val inputTensor = OnnxTensor.createTensor(
                ortEnv,
                LongBuffer.wrap(phonemeIds),
                inputShape
            )
            val inputLengthsTensor = OnnxTensor.createTensor(
                ortEnv,
                LongBuffer.wrap(longArrayOf(phonemeIds.size.toLong())),
                longArrayOf(1)
            )
            // noise_scale, length_scale, noise_w از config یا مقادیر پیش‌فرض Piper
            val noiseScale = config.optJSONObject("inference")?.optDouble("noise_scale", 0.667) ?: 0.667
            val lengthScale = config.optJSONObject("inference")?.optDouble("length_scale", 1.0) ?: 1.0
            val noiseW = config.optJSONObject("inference")?.optDouble("noise_w", 0.8) ?: 0.8

            val scalesTensor = OnnxTensor.createTensor(
                ortEnv,
                FloatBuffer.wrap(floatArrayOf(noiseScale.toFloat(), lengthScale.toFloat(), noiseW.toFloat())),
                longArrayOf(3)
            )

            // ۳. اجرای مدل ONNX
            val inputs = mapOf(
                "input" to inputTensor,
                "input_lengths" to inputLengthsTensor,
                "scales" to scalesTensor
            )
            val outputs = session.run(inputs)
            val audioTensor = outputs[0].value as Array<*>
            val audioFloats = (audioTensor[0] as Array<*>)[0] as FloatArray

            // ۴. تبدیل Float32 [-1,1] → Int16 PCM
            val sampleRate = config.optJSONObject("audio")?.optInt("sample_rate", 22050) ?: 22050
            val pcm = floatToPcm16(audioFloats)

            // ۵. ساخت فایل WAV و encode به base64
            val wav = buildWav(pcm, sampleRate)
            Base64.encodeToString(wav, Base64.NO_WRAP)
        }

        AsyncFunction("destroy") {
            sessions.values.forEach { it.close() }
            sessions.clear()
            configs.clear()
        }
    }

    /**
     * فونیمیزیشن متن با espeak-ng از طریق JNI.
     * espeak-ng-data باید در espeakDataDir موجود باشد.
     * خروجی: آرایه شناسه‌های صوت (Long) برای ورودی ONNX.
     */
    private fun phonemizeWithEspeak(text: String, config: JSONObject): LongArray {
        val lang = config.optString("espeak", "fa")          // "fa" یا "en-us"
        val phonemeIdMap = config.optJSONObject("phoneme_id_map")

        // فراخوانی espeak-ng native از طریق JNI
        val phonemeStr = EspeakJni.textToPhonemes(text, lang, espeakDataDir ?: "")

        // تبدیل رشته فونیم‌ها به شناسه‌های عددی با phoneme_id_map
        val ids = mutableListOf<Long>()
        ids.add(phonemeIdMap?.optJSONArray("^")?.getLong(0) ?: 1L) // BOS token

        for (phoneme in phonemeStr) {
            val key = phoneme.toString()
            val arr = phonemeIdMap?.optJSONArray(key)
            if (arr != null) {
                for (i in 0 until arr.length()) ids.add(arr.getLong(i))
            }
        }

        ids.add(phonemeIdMap?.optJSONArray("$")?.getLong(0) ?: 2L) // EOS token
        return ids.toLongArray()
    }

    /** تبدیل نمونه‌های Float32 [-1.0, 1.0] به PCM Int16 Little-Endian */
    private fun floatToPcm16(floats: FloatArray): ByteArray {
        val buf = ByteBuffer.allocate(floats.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (f in floats) {
            val clamped = f.coerceIn(-1.0f, 1.0f)
            buf.putShort((clamped * Short.MAX_VALUE).toInt().toShort())
        }
        return buf.array()
    }

    /** ساخت header WAV (RIFF/PCM، 16-bit، mono) و الحاق داده PCM */
    private fun buildWav(pcm: ByteArray, sampleRate: Int): ByteArray {
        val bos = ByteArrayOutputStream()
        val buf = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        val dataSize = pcm.size
        val fileSize = dataSize + 36

        buf.put("RIFF".toByteArray())
        buf.putInt(fileSize)
        buf.put("WAVE".toByteArray())
        buf.put("fmt ".toByteArray())
        buf.putInt(16)            // chunk size
        buf.putShort(1)           // PCM
        buf.putShort(1)           // mono
        buf.putInt(sampleRate)
        buf.putInt(sampleRate * 2) // byte rate (16-bit mono)
        buf.putShort(2)           // block align
        buf.putShort(16)          // bits per sample
        buf.put("data".toByteArray())
        buf.putInt(dataSize)

        bos.write(buf.array())
        bos.write(pcm)
        return bos.toByteArray()
    }

    override fun onDestroy() {
        sessions.values.forEach { it.close() }
        ortEnv.close()
    }
}
