package expo.modules.typing

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * سرویس دسترس‌پذیری (Accessibility) که متن تشخیص‌داده‌شده توسط Vosk را
 * مستقیماً داخل فیلد متنیِ فوکوس‌شده‌ی *هر اپلیکیشنی* تایپ می‌کند.
 *
 * برخلاف IME (کیبورد سفارشی)، این روش نیازی به تعویض کیبورد کاربر ندارد؛
 * فقط لازم است کاربر یک‌بار از تنظیمات اندروید این سرویس را فعال کند.
 *
 * جریان:
 *   ۱. کاربر از صفحه تنظیمات دسترس‌پذیری، «STTS» را روشن می‌کند.
 *   ۲. هر وقت TypingModule.typeText(text) صدا زده شود، این سرویس گره‌ی
 *      دارای فوکوس ورودی را در پنجره‌ی فعال فعلی پیدا کرده و متن را
 *      به انتهای متن موجود اضافه می‌کند.
 */
class TypingAccessibilityService : AccessibilityService() {

    companion object {
        /** نمونه‌ی زنده‌ی سرویس، وقتی کاربر آن را فعال کرده باشد؛ در غیر این صورت null */
        var instance: TypingAccessibilityService? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance === this) instance = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // نیازی به واکنش به رویدادها نداریم؛ تایپ فقط با فراخوانی صریح appendText انجام می‌شود.
    }

    override fun onInterrupt() {
        // نیازی به کاری نیست.
    }

    /**
     * متن داده‌شده را به انتهای فیلد ورودیِ دارای فوکوس در پنجره‌ی فعال فعلی اضافه می‌کند.
     * @return true در صورت موفقیت، false اگر هیچ فیلد ورودی قابل‌ویرایشی فوکوس نداشته باشد.
     */
    fun appendText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val focusedNode = findFocusedEditableNode(root) ?: return false

        val existingText = focusedNode.text?.toString() ?: ""
        val separator = if (existingText.isEmpty() || existingText.endsWith(" ")) "" else " "
        val newText = existingText + separator + text

        val arguments = Bundle()
        arguments.putCharSequence(
            AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
            newText,
        )
        return focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    /** ابتدا فوکوس ورودی مستقیم را امتحان می‌کند؛ اگر پیدا نشد، در درخت گره‌ها جستجو می‌کند */
    private fun findFocusedEditableNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val direct = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        if (direct != null && direct.isEditable) return direct
        return findEditableInTree(root)
    }

    private fun findEditableInTree(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isEditable && node.isFocused) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = findEditableInTree(child)
            if (result != null) return result
        }
        return null
    }
}
