import React, { useReducer } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { panelReducer, initialPanelState } from '../../shared/services/panel-state';
import { FloatingBubble } from './FloatingBubble';
import { AudioBar } from './AudioBar';
import { HistoryPanel } from './HistoryPanel';

// کل اپ باید راست‌چین باشد؛ این تنظیم یک‌بار در ورودی اپ (App.tsx) هم باید فعال شود
I18nManager.forceRTL(true);

const FEATURE_LABELS: Record<'tts' | 'stt' | 'ocr' | 'settings', string> = {
  tts: 'متن به صوت',
  stt: 'صوت به متن',
  ocr: 'اسکنر',
  settings: 'تنظیمات',
};

export function MainPanel() {
  const [state, dispatch] = useReducer(panelReducer, initialPanelState);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="بستن">
          <Text style={styles.topIcon}>✕</Text>
        </Pressable>
        <Pressable accessibilityLabel="اعلان‌ها">
          <Text style={styles.topIcon}>🔔</Text>
        </Pressable>
        <Pressable accessibilityLabel="گزینه‌ها">
          <Text style={styles.topIcon}>⋮</Text>
        </Pressable>
      </View>

      <View style={styles.mainRow}>
        <HistoryPanel
          selectedItemId={state.selectedHistoryItemId}
          onSelectItem={(id) => dispatch({ type: 'SELECT_HISTORY_ITEM', itemId: id })}
        />

        <View style={styles.buttonColumn}>
          {(['tts', 'stt', 'ocr', 'settings'] as const).map((feature) => (
            <Pressable
              key={feature}
              accessibilityRole="button"
              accessibilityLabel={FEATURE_LABELS[feature]}
              onPress={() => dispatch({ type: 'SELECT_FEATURE', feature })}
              style={[
                styles.featureButton,
                state.activeFeature === feature && styles.featureButtonActive,
              ]}
            >
              <Text style={styles.featureLabel}>{FEATURE_LABELS[feature]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <AudioBar selectedHistoryItemId={state.selectedHistoryItemId} />

      {state.bubbleVisible && state.activeFeature && (
        <FloatingBubble
          mode={state.activeFeature === 'ocr' ? 'ocr' : 'stt'}
          onLongPress3s={() => dispatch({ type: 'HIDE_BUBBLE' })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, writingDirection: 'rtl' },
  topBar: { flexDirection: 'row-reverse', justifyContent: 'flex-end', gap: 12, padding: 8 },
  topIcon: { fontSize: 18 },
  mainRow: { flex: 1, flexDirection: 'row-reverse', paddingHorizontal: 8, gap: 8 },
  buttonColumn: { width: 72, gap: 8 },
  featureButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureButtonActive: { opacity: 0.7 },
  featureLabel: { fontSize: 11, textAlign: 'center' },
});
