/**
 * رابط JNI برای espeak-ng phonemization مورد نیاز Piper TTS.
 *
 * نحوه ساخت:
 *   - espeak-ng به عنوان submodule در third_party/espeak-ng قرار می‌گیرد
 *   - CMakeLists.txt آن را به عنوان static library کامپایل می‌کند
 *   - این فایل آن را wrap می‌کند و از طریق JNI در دسترس Kotlin قرار می‌دهد
 */
#include <jni.h>
#include <string>
#include <espeak-ng/speak_lib.h>

static bool g_initialized = false;

/**
 * مقداردهی اولیه espeak-ng (یک بار کافی است).
 */
static bool ensureInit(const char* dataPath) {
    if (g_initialized) return true;
    int result = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, dataPath, 0);
    g_initialized = (result != EE_INTERNAL_ERROR);
    return g_initialized;
}

extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_piper_EspeakJni_textToPhonemes(
        JNIEnv* env,
        jobject /* obj */,
        jstring jText,
        jstring jVoice,
        jstring jDataPath) {

    const char* text     = env->GetStringUTFChars(jText,     nullptr);
    const char* voice    = env->GetStringUTFChars(jVoice,    nullptr);
    const char* dataPath = env->GetStringUTFChars(jDataPath, nullptr);

    std::string result;

    if (ensureInit(dataPath)) {
        espeak_SetVoiceByName(voice);

        // تبدیل متن به فونیم با فلگ IPA
        unsigned int flags = espeakPHONEMES | espeakPHONEMES_IPA;
        const char* phonemes = nullptr;

        // espeak_TextToPhonemes برای text کوتاه‌تر از ۵۰۰ کاراکتر
        unsigned int* ident = nullptr;
        espeak_SetParameter(espeakPITCH, 50, 0);

        // استفاده از espeak_ng_TextToPhonemes برای دریافت خروجی مستقیم
        char buf[4096] = {};
        int pos = 0;
        espeak_ng_TEXT_TO_PHONEMES(text, espeakCHARS_UTF8, flags, buf, sizeof(buf) - 1, &pos);
        result = buf;
    }

    env->ReleaseStringUTFChars(jText,     text);
    env->ReleaseStringUTFChars(jVoice,    voice);
    env->ReleaseStringUTFChars(jDataPath, dataPath);

    return env->NewStringUTF(result.c_str());
}
