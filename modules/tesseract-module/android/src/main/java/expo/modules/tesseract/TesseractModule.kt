package expo.modules.tesseract

import android.graphics.BitmapFactory
import com.googlecode.tesseract.android.TessBaseAPI
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class TesseractModule : Module() {

    private var tess: TessBaseAPI? = null
    private var currentLanguage: String = "fas"

    override fun definition() = ModuleDefinition {

        Name("TesseractModule")

        /**
         * مقداردهی اولیه Tesseract با مسیر tessdata و کد زبان.
         * tessdata باید از assets به filesDir کپی شده باشد.
         *
         * @param tessDataPath مسیر پوشه‌ای که tessdata/ درون آن است
         * @param language کد زبان ("fas" برای فارسی، "eng" برای انگلیسی)
         */
        AsyncFunction("init") { tessDataPath: String, language: String ->
            tess?.recycle()
            val api = TessBaseAPI()
            val success = api.init(tessDataPath, language)
            if (!success) {
                throw Exception("Tesseract init failed — tessdata not found at: $tessDataPath/tessdata/")
            }
            // بهینه‌سازی برای متن چندزبانه فارسی/انگلیسی
            api.setVariable(TessBaseAPI.VAR_CHAR_WHITELIST, "")
            api.pageSegMode = TessBaseAPI.PageSegMode.PSM_AUTO_OSD
            tess = api
            currentLanguage = language
        }

        /**
         * تشخیص متن از فایل تصویر.
         * @param imagePath مسیر مطلق فایل تصویر (JPEG یا PNG)
         * @return {text: String, confidence: Double (0-1)}
         */
        AsyncFunction("recognize") { imagePath: String ->
            val api = tess ?: throw Exception("Tesseract not initialized — call init() first")
            val file = File(imagePath)
            if (!file.exists()) throw Exception("Image not found: $imagePath")

            val bitmap = BitmapFactory.decodeFile(imagePath)
                ?: throw Exception("Cannot decode image: $imagePath")

            api.setImage(bitmap)
            val text = api.utF8Text ?: ""
            val confidence = api.meanConfidence() / 100.0  // تبدیل 0-100 به 0-1

            bitmap.recycle()
            api.clear()

            mapOf(
                "text" to text.trim(),
                "confidence" to confidence
            )
        }

        AsyncFunction("destroy") {
            tess?.recycle()
            tess = null
        }
    }

    override fun onDestroy() {
        tess?.recycle()
    }
}
