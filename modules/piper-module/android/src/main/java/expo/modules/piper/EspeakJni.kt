package expo.modules.piper

/**
 * رابط JNI برای espeak-ng.
 * کد C++ در src/main/cpp/espeak_jni.cpp قرار دارد.
 * espeak-ng به صورت static library کامپایل می‌شود و از طریق CMake لینک می‌شود.
 */
object EspeakJni {

    init {
        System.loadLibrary("espeak_jni")
    }

    /**
     * تبدیل متن به رشته فونیم‌های IPA.
     * @param text متن ورودی
     * @param voice زبان espeak-ng (مثلاً "fa" برای فارسی، "en-us" برای انگلیسی)
     * @param dataPath مسیر کامل پوشه espeak-ng-data روی دستگاه
     * @return رشته فونیم‌های IPA (مثلاً "sɑːˈlɑːm")
     */
    @JvmStatic
    external fun textToPhonemes(text: String, voice: String, dataPath: String): String
}
