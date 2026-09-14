import React, { useCallback, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export type BubbleMode = 'stt' | 'tts' | 'ocr';

interface FloatingBubbleProps {
  mode: BubbleMode;
  /** موقعیت اولیه‌ی حباب روی صفحه (px) */
  initialX?: number;
  initialY?: number;
  /** لمس کوتاه (تپ) روی حباب — باید پنل مربوطه را باز کند */
  onTap: () => void;
  /** حباب با موفقیت داخل هدف ضربدر رها شد — باید کاملاً غیرفعال شود */
  onClose: () => void;
}

const BUBBLE_SIZE = 56;
const CLOSE_TARGET_SIZE = 72;
const CLOSE_TRIGGER_DISTANCE = CLOSE_TARGET_SIZE * 0.75;
const HOLD_DURATION_MS = 3000;
const MOVE_THRESHOLD = 8;

const ICONS: Record<BubbleMode, string> = {
  stt: '🎙️',
  tts: '🔊',
  ocr: '📷',
};

const LABELS: Record<BubbleMode, string> = {
  stt: 'حباب صوت‌به‌متن',
  tts: 'حباب متن‌به‌صوت',
  ocr: 'حباب اسکنر',
};

/**
 * حباب شناور قابل جابه‌جایی (میکروفون / TTS / اسکنر).
 *
 * رفتار طبق مشخصات:
 *  ۱. لمس کوتاه (تپ ساده، بدون حرکت معنادار) → onTap() : باز شدن پنل مربوطه.
 *  ۲. نگه‌داشتن انگشت روی حباب بدون حرکت به مدت ۳ ثانیه → یک هدف ضربدر
 *     نزدیک حباب ظاهر می‌شود.
 *  ۳. با همان لمس، درگ‌کردن حباب داخل محدوده‌ی هدف ضربدر و رهاکردن →
 *     onClose() : حباب کاملاً غیرفعال می‌شود.
 *  ۴. درگ عادی (جابه‌جایی روی صفحه بدون رسیدن به ۳ ثانیه‌ی ساکن) →
 *     فقط موقعیت حباب تغییر می‌کند، هیچ پنلی باز/بسته نمی‌شود.
 *
 * نکته‌ی معماری (مهم):
 * این کامپوننت فعلاً یک overlay *داخل خودِ اپ* است (position: absolute روی
 * صفحه‌ی فعلی React Native) — یعنی فقط وقتی اپ در foreground باشد دیده می‌شود.
 * برای رفتار نهایی موردنظر (حباب روی *همه‌ی برنامه‌ها*، حتی وقتی اپ به بک‌گراند
 * می‌رود) باید در فاز بعد همین UI داخل یک Android Service با
 * WindowManager + TYPE_APPLICATION_OVERLAY میزبانی شود (ماژول native جدا).
 * این فایل، منطق تعامل/انیمیشن حباب را آماده می‌کند تا در آن فاز فقط میزبانی‌اش
 * عوض شود، نه منطق داخلی‌اش.
 */
export function FloatingBubble({
  mode,
  initialX = 16,
  initialY,
  onTap,
  onClose,
}: FloatingBubbleProps) {
  const { width: screenW, height: screenH } = useMemo(() => Dimensions.get('window'), []);
  const startY = initialY ?? screenH - 220;

  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(startY);
  const scale = useSharedValue(1);
  const closeTargetVisible = useSharedValue(0);
  const isOverTarget = useSharedValue(false);

  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const hasMoved = useSharedValue(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetCenterX = screenW / 2;
  const targetCenterY = screenH - 100;

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const startHoldTimer = useCallback(() => {
    clearHoldTimer();
    holdTimer.current = setTimeout(() => {
      // اگر تا این لحظه حرکت معناداری ثبت نشده، هدف ضربدر را نشان بده
      if (!hasMoved.value) {
        closeTargetVisible.value = withSpring(1);
      }
    }, HOLD_DURATION_MS);
  }, [clearHoldTimer, closeTargetVisible, hasMoved]);

  const handleTap = useCallback(() => onTap(), [onTap]);
  const handleClose = useCallback(() => onClose(), [onClose]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      hasMoved.value = false;
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
      scale.value = withSpring(1.08);
      runOnJS(startHoldTimer)();
    })
    .onUpdate((e) => {
      const nextX = dragStartX.value + e.translationX;
      const nextY = dragStartY.value + e.translationY;
      translateX.value = Math.max(0, Math.min(screenW - BUBBLE_SIZE, nextX));
      translateY.value = Math.max(0, Math.min(screenH - BUBBLE_SIZE, nextY));

      if (
        !hasMoved.value &&
        (Math.abs(e.translationX) > MOVE_THRESHOLD || Math.abs(e.translationY) > MOVE_THRESHOLD)
      ) {
        hasMoved.value = true;
        runOnJS(clearHoldTimer)();
      }

      const bubbleCenterX = translateX.value + BUBBLE_SIZE / 2;
      const bubbleCenterY = translateY.value + BUBBLE_SIZE / 2;
      const dist = Math.hypot(bubbleCenterX - targetCenterX, bubbleCenterY - targetCenterY);
      isOverTarget.value = closeTargetVisible.value > 0.5 && dist < CLOSE_TRIGGER_DISTANCE;
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
      runOnJS(clearHoldTimer)();

      if (closeTargetVisible.value > 0.5) {
        if (isOverTarget.value) {
          runOnJS(handleClose)();
        }
        closeTargetVisible.value = withSpring(0);
      } else if (!hasMoved.value) {
        // نه هولد سه‌ثانیه‌ای بود، نه درگ معنادار → این یک تپ ساده است
        runOnJS(handleTap)();
      }
    });

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const targetStyle = useAnimatedStyle(() => ({
    opacity: closeTargetVisible.value,
    transform: [{ scale: 0.8 + closeTargetVisible.value * 0.2 }],
    backgroundColor: isOverTarget.value ? '#D9453C' : '#33363C',
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.closeTarget,
          {
            left: targetCenterX - CLOSE_TARGET_SIZE / 2,
            top: targetCenterY - CLOSE_TARGET_SIZE / 2,
          },
          targetStyle,
        ]}
      >
        <Text style={styles.closeTargetIcon}>✕</Text>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityRole="button"
          accessibilityLabel={LABELS[mode]}
          style={[styles.bubble, bubbleStyle]}
        >
          <Text style={styles.icon}>{ICONS[mode]}</Text>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2530',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 1000,
  },
  icon: { fontSize: 26 },
  closeTarget: {
    position: 'absolute',
    width: CLOSE_TARGET_SIZE,
    height: CLOSE_TARGET_SIZE,
    borderRadius: CLOSE_TARGET_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  closeTargetIcon: { fontSize: 28, color: '#FFFFFF' },
});
