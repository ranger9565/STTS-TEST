import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface AudioBarProps {
  selectedHistoryItemId: string | null;
}

/**
 * نوار پخش ثابت پایین: افزودن فایل، پخش/توقف (تک دکمه)، قبلی/بعدی، تایم‌لاین.
 * منطق واقعی پخش/آپلود/STT همزمان در سرویس‌های جداگانه پیاده می‌شود؛
 * این کامپوننت فقط نمایش و اتصال رویداد است.
 */
export function AudioBar({ selectedHistoryItemId }: AudioBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityLabel="افزودن فایل">
        <Text style={styles.icon}>＋</Text>
      </Pressable>
      <Pressable accessibilityLabel="قبلی">
        <Text style={styles.icon}>⏮</Text>
      </Pressable>
      <Pressable accessibilityLabel="پخش یا توقف">
        <Text style={styles.playIcon}>▶</Text>
      </Pressable>
      <Pressable accessibilityLabel="بعدی">
        <Text style={styles.icon}>⏭</Text>
      </Pressable>
      <View style={styles.timeline}>
        <View style={styles.timelineFill} />
      </View>
      <Text style={styles.timeText}>
        {selectedHistoryItemId ? `#${selectedHistoryItemId}` : '۰:۰۰'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    margin: 8,
  },
  icon: { fontSize: 16 },
  playIcon: { fontSize: 20 },
  timeline: { flex: 1, height: 4, borderRadius: 2 },
  timelineFill: { height: 4, width: '35%', borderRadius: 2 },
  timeText: { fontSize: 11 },
});
