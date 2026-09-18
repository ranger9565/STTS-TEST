import React, { useEffect, useReducer, useState } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { panelReducer, initialPanelState } from '../../shared/services/panel-state';
import { FloatingBubble } from './FloatingBubble';
import { MicPanel } from './MicPanel';
import { AudioBar } from './AudioBar';
import { HistoryPanel, HistoryItem } from './HistoryPanel';
import { useOverlayBubble } from './useOverlayBubble';
import { useStt } from '../stt/useStt';
import { useTts } from '../tts/useTts';
import { openAccessibilitySettings } from '../../../modules/typing-module/src';
import { initHistoryDb, getRecentHistory } from '../../shared/services/history-store';

I18nManager.forceRTL(true);

const FEATURE_LABELS: Record<'tts' | 'stt' | 'ocr' | 'settings', string> = {
  tts: 'متن به صوت',
  stt: 'صوت به متن',
  ocr: 'اسکنر',
  settings: 'تنظیمات',
};

export function MainPanel() {
  const [state, dispatch] = useReducer(panelReducer, initialPanelState);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const stt = useStt();
  const tts = useTts();
  const isListening = stt.session.state === 'listening';

  useEffect(() => {
    initHistoryDb();
    setHistoryItems(getRecentHistory());
  }, []);

  useEffect(() => {
    if (stt.session.accumulatedText) {
      setHistoryItems(getRecentHistory());
    }
  }, [stt.session.accumulatedText]);

  useOverlayBubble(state.bubbles.stt && !state.micPanelOpen);

  useEffect(() => {
    const openFeatureFromUrl = (url: string | null) => {
      if (!url) return;
      const { hostname, path } = Linking.parse(url);
      const route = hostname || path;

      if (route === 'openMic') {
        dispatch({ type: 'OPEN_MIC_PANEL_DIRECT' });
      } else if (route === 'openTts') {
        dispatch({ type: 'SELECT_FEATURE', feature: 'tts' });
      } else if (route === 'openOcr') {
        dispatch({ type: 'SELECT_FEATURE', feature: 'ocr' });
      }
    };

    Linking.getInitialURL().then(openFeatureFromUrl);
    const subscription = Linking.addEventListener('url', (event) => {
      openFeatureFromUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  const selectedHistoryItem = historyItems.find(
    (item) => item.id === state.selectedHistoryItemId,
  );

  const handleToggleMic = () => {
    if (isListening) {
      stt.stop().catch(() => {});
    } else {
      stt.start().catch(() => {});
    }
  };

  const handlePlaySelectedText = () => {
    if (!selectedHistoryItem?.text) return;
    tts.speak(selectedHistoryItem.text).catch(() => {});
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
          items={historyItems}
          selectedItemId={state.selectedHistoryItemId}
          onSelectItem={(id) => dispatch({ type: 'SELECT_HISTORY_ITEM', itemId: id })}
        />

        <View style={styles.buttonColumn}>
          {(['tts', 'stt', 'ocr', 'settings'] as const).map((feature) => (
            <Pressable
              key={feature}
              accessibilityRole="button"
              accessibilityLabel={FEATURE_LABELS[feature]}
              onPress={() => {
                dispatch({ type: 'SELECT_FEATURE', feature });
                if (feature !== 'settings') {
                  dispatch({ type: 'TOGGLE_BUBBLE', mode: feature });
                }
              }}
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

      {state.activeFeature === 'stt' && state.micPanelOpen && !stt.isTypingEnabled && (
        <Pressable style={styles.enableTypingBanner} onPress={openAccessibilitySettings}>
          <Text style={styles.enableTypingText}>
            برای تایپ خودکار در همه‌ی اپ‌ها، سرویس دسترس‌پذیری STTS را فعال کنید ← لمس کنید
          </Text>
        </Pressable>
      )}

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

      <AudioBar
        selectedHistoryItemId={state.selectedHistoryItemId}
        status={tts.status}
        onPlay={handlePlaySelectedText}
        onStop={() => tts.stop().catch(() => {})}
      />

      {(Object.keys(state.bubbles) as Array<'tts' | 'stt' | 'ocr'>).map((mode) =>
        state.bubbles[mode] && !(mode === 'stt' && state.micPanelOpen) ? (
          <FloatingBubble
            key={mode}
            mode={mode}
            initialX={16 + (mode === 'tts' ? 64 : mode === 'ocr' ? 128 : 0)}
            onTap={() => {
              dispatch({ type: 'SELECT_FEATURE', feature: mode });
              if (mode === 'stt') {
                dispatch({ type: 'OPEN_MIC_PANEL' });
              }
            }}
            onClose={() => dispatch({ type: 'HIDE_BUBBLE', mode })}
          />
        ) : null,
      )}

      {state.micPanelOpen && state.activeFeature === 'stt' && (
        <MicPanel
          isListening={isListening}
          languageLabel="فا"
          onClose={() => {
            if (isListening) {
              stt.stop().catch(() => {});
            }
            dispatch({ type: 'CLOSE_MIC_PANEL' });
          }}
          onToggleMic={handleToggleMic}
          onLanguagePress={() => {}}
        />
      )}

      {tts.error && state.activeFeature === 'tts' && (
        <View style={styles.partialTextBox}>
          <Text style={styles.errorTextValue}>{tts.error.message}</Text>
        </View>
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
  enableTypingBanner: {
    marginHorizontal: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#2A3A4A',
  },
  enableTypingText: {
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: '#CCE0FF',
  },
});
