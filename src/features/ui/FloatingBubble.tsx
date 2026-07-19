import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface FloatingBubbleProps {
  mode: 'stt' | 'ocr';
  onLongPress3s: () => void;
}

/**
 * حباب شناور روی کل صفحه. تپ = شروع/توقف عملیات (مدیریت واقعی در ماژول Native/Overlay).
 * نگه‌داشتن ۳ ثانیه = خاموش‌کردن حباب.
 */
export function FloatingBubble({ mode, onLongPress3s }: FloatingBubbleProps) {
  const icon = mode === 'ocr' ? '📷' : '🎙️';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mode === 'ocr' ? 'حباب اسکنر' : 'حباب صوت به متن'}
      onLongPress={onLongPress3s}
      delayLongPress={3000}
      style={styles.bubble}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    left: 16,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24 },
});
