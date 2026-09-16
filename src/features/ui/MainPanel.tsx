import React, { useEffect, useReducer } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { panelReducer, initialPanelState } from '../../shared/services/panel-state';
import { FloatingBubble } from './FloatingBubble';
import { MicPanel } from './MicPanel';
import { AudioBar } from './AudioBar';
import { HistoryPanel } from './HistoryPanel';
import { useOverlayBubble } from './useOverlayBubble';
import { useStt } from '../stt/useStt';

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

  // اتصال واقعی به موتور Vosk (شروع/توقف ضبط زنده میکروفون)
  const stt = useStt();
  const isListening = stt.session.state === 'listening';

  // وقتی حباب میکروفون باید فعال باشه و پنلش بسته‌ست، با بک‌گراند رفتن اپ
  // همون حباب به‌صورت حباب سیستمی (روی همه‌ی برنامه‌ها) ظاهر می‌شه.
  useOverlayBubble(
    state.bubbleVisible && state.activeFeature === 'stt' && !state.micPanelOpen,
  );

  // تپ روی حباب سیستمی، اپ رو با دیپ‌لینک stts://openMic باز می‌کنه؛
  // اینجا همون رویداد رو می‌گیریم و مستقیم پنل میکروفون رو باز می‌کنیم.
  useEffect(() => {
    const openMicPanelFromUrl = (url: string | null) => {
      if (!url) return;
      const { hostname, path } = Linking.parse(url);
      if (hostname === 'openMic' || path === 'openMic') {
        dispatch({ type: 'OPEN_MIC_PANEL_DIRECT' });
      }
    };

    Linking.getInitialURL().then(openMicPanelFromUrl);
    const subscription = Linking.addEventListener('url', (event) => {
      openMicPanelFromUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  // با بسته‌شدن پنل میکروفون، اگه ضبط در حال انجامه متوقفش کن
  // (مثلاً کاربر با تپ روی ضربدر پنل رو بست بدون اینکه خودش میکروفون رو خاموش کنه)
  useEffect(() => {
    if (!state.micPanelOpen && isListening) {
      stt.stop().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.micPanelOpen]);

  const handleToggleMic = () => {
    if (isListening) {
      stt.stop().catch(() => {});
    } else {
      stt.start().catch(() => {});
    }
  };

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

      {state.activeFeature === 'stt' && !!stt.partialText && (
        <View style={styles.partialTextBox}>
          <Text style={styles.partialTextValue}>{stt.partialText}</Text>
        </View>
      )}

      {state.activeFeature === 'stt' && !!stt.error && (
        <View style={styles.partialTextBox}>
          <Text style={styles.errorTextValue}>{stt.error.message}</Text>
        </View>
      )}

      <AudioBar selectedHistoryItemId={state.selectedHistoryItemId} />

      {state.bubbleVisible && state.activeFeature && !state.micPanelOpen && (
        <FloatingBubble
          mode={state.activeFeature === 'ocr' ? 'ocr' : 'stt'}
          onTap={() => {
            // TODO(فاز بعد): پنل اسکن گوگل‌لنزی برای mode==='ocr'
            if (state.activeFeature === 'stt') {
              dispatch({ type: 'OPEN_MIC_PANEL' });
            }
          }}
          onClose={() => dispatch({ type: 'HIDE_BUBBLE' })}
        />
      )}

      {state.micPanelOpen && state.activeFeature === 'stt' && (
        <MicPanel
          isListening={isListening}
          languageLabel="فا"
          onClose={() => dispatch({ type: 'CLOSE_MIC_PANEL' })}
          onToggleMic={handleToggleMic}
          onLanguagePress={() => {
            /* باز شدن انتخاب‌گر زبان در فاز بعد */
          }}
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
  partialTextBox: { marginHorizontal: 8, marginBottom: 4, padding: 8, borderRadius: 10 },
  partialTextValue: { fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  errorTextValue: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl', color: '#FF6666' },
});
