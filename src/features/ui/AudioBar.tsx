import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface AudioBarProps {
  text: string | null;
  status: 'idle' | 'synthesizing' | 'playing' | 'error';
  onPlay: () => void;
  onStop: () => void;
  onSave?: () => void;
}

export function AudioBar({ text, status, onPlay, onStop }: AudioBarProps) {
  const canPlay = Boolean(text?.trim()) && status !== 'synthesizing';

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityLabel="پخش یا توقف"
        disabled={!canPlay}
        onPress={status === 'playing' ? onStop : onPlay}
        style={!canPlay && styles.disabled}
      >
        <Text style={styles.playIcon}>
          {status === 'playing' ? '⏸' : status === 'synthesizing' ? '…' : '▶'}
        </Text>
      </Pressable>
      <View style={styles.timeline}>
        <View style={[styles.timelineFill, status === 'playing' && styles.timelinePlaying]} />
      </View>
      <Text style={styles.timeText}>
        {text
          ? status === 'synthesizing'
            ? 'در حال ساخت صدا…'
            : status === 'playing'
              ? 'در حال پخش'
              : 'آماده پخش'
          : 'متنی انتخاب نشده'}
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
  playIcon: { fontSize: 20 },
  timeline: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  timelineFill: { height: 4, width: '0%', borderRadius: 2 },
  timelinePlaying: { width: '35%' },
  timeText: { minWidth: 72, fontSize: 11, textAlign: 'right' },
  disabled: { opacity: 0.45 },
});
