import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface MicPanelProps {
  /** آیا موتور Vosk الان در حال گوش‌دادن و تایپ صوتی است */
  isListening: boolean;
  /** برچسب زبان/نوشتار فعلی، مثلاً «فا» یا «EN» */
  languageLabel: string;
  /** لمس ضربدر — پنل بسته می‌شود و به حالت حباب برمی‌گردد */
  onClose: () => void;
  /** لمس دکمه میکروفون — شروع/توقف تایپ صوتی (toggle) */
  onToggleMic: () => void;
  /** لمس پرچم — باز شدن انتخاب زبان/نوشتار */
  onLanguagePress: () => void;
}

/**
 * پنل مستطیلی میکروفون: سه بخش — ضربدر (بستن) / میکروفون (شروع‌توقف تایپ صوتی) / پرچم (زبان).
 *
 * این کامپوننت فقط UI پنل را می‌سازد؛ اتصال Vosk و AccessibilityService
 * از طریق callbackهای واقعی والد انجام می‌شود.
 */
export function MicPanel({
  isListening,
  languageLabel,
  onClose,
  onToggleMic,
  onLanguagePress,
}: MicPanelProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      style={styles.container}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="بستن پنل میکروفون"
        onPress={onClose}
        style={styles.section}
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isListening ? 'توقف تایپ صوتی' : 'شروع تایپ صوتی'}
        onPress={onToggleMic}
        style={[styles.section, styles.micSection, isListening && styles.micSectionActive]}
      >
        <Text style={styles.micIcon}>{isListening ? '⏺️' : '🎙️'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="انتخاب زبان و نوشتار"
        onPress={onLanguagePress}
        style={styles.section}
      >
        <Text style={styles.flagText}>{languageLabel}</Text>
      </Pressable>
    </Animated.View>
  );
}

const PANEL_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 160,
    flexDirection: 'row',
    height: PANEL_HEIGHT,
    borderRadius: PANEL_HEIGHT / 2,
    backgroundColor: '#1E2530',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 1001,
  },
  section: {
    width: PANEL_HEIGHT,
    height: PANEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micSection: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#33363C',
  },
  micSectionActive: {
    backgroundColor: '#2A3A4A',
  },
  closeIcon: { fontSize: 20, color: '#CCCCCC' },
  micIcon: { fontSize: 26 },
  flagText: { fontSize: 16, color: '#CCCCCC' },
});
