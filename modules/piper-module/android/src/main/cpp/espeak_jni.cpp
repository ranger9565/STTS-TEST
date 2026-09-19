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

        // تبدیل متن به فونیم با API واقعی espeak-ng.
        // espeak_TextToPhonemes یک clause را در هر فراخوانی برمی‌گرداند
        // و text pointer را به بخش بعدی متن جلو می‌برد.
        const void* textPtr = text;
        while (textPtr != nullptr) {
            const char* phonemes = espeak_TextToPhonemes(
                &textPtr,
                espeakCHARS_UTF8,
                espeakPHONEMES_IPA
            );
            if (phonemes == nullptr) break;
            result += phonemes;
            if (textPtr == nullptr) break;
        }
    }

    env->ReleaseStringUTFChars(jText,     text);
    env->ReleaseStringUTFChars(jVoice,    voice);
    env->ReleaseStringUTFChars(jDataPath, dataPath);

    return env->NewStringUTF(result.c_str());
}
