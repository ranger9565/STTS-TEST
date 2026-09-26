import React, { useEffect, useReducer, useState } from 'react';
import { Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { panelReducer, initialPanelState } from '../../shared/services/panel-state';
import { MicPanel } from './MicPanel';
import { AudioBar } from './AudioBar';
import { HistoryPanel, HistoryItem } from './HistoryPanel';
import { useOverlayBubble } from './useOverlayBubble';
import { useSttBubbleTap } from './useSttBubbleTap';
import { useStt } from '../stt/useStt';
import { VOSK_EN_MODEL_PATH, VOSK_FA_MODEL_PATH } from '../stt/vosk-bridge';
import { useTts } from '../tts/useTts';
import { exportLastAudio } from '../tts/piper-bridge';
import { openAccessibilitySettings } from '../../../modules/typing-module/src';
import { initHistoryDb, getRecentHistory } from '../../shared/services/history-store';

const FEATURE_LABELS: Record<'tts' | 'stt', string> = {
  tts: 'متن به صوت',
  stt: 'صوت به متن',
};

export function MainPanel() {
  const [state, dispatch] = useReducer(panelReducer, initialPanelState);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [externalTtsText, setExternalTtsText] = useState<string | null>(null);
  const [sttLanguage, setSttLanguage] = useState<'fa' | 'en'>('fa');
  const stt = useStt(sttLanguage === 'fa' ? VOSK_FA_MODEL_PATH : VOSK_EN_MODEL_PATH);
  const tts = useTts();
  const isListening = stt.session.state === 'listening';
  useSttBubbleTap(stt);

  useEffect(() => {
    initHistoryDb();
    setHistoryItems(getRecentHistory());
  }, []);

  useEffect(() => {
    if (stt.session.accumulatedText) setHistoryItems(getRecentHistory());
  }, [stt.session.accumulatedText]);

  useOverlayBubble({
    ...state.bubbles,
    stt: state.bubbles.stt && !state.micPanelOpen,
  });

  useEffect(() => {
    const openFeatureFromUrl = (url: string | null) => {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      const route = hostname || path;

      if (route === 'openMic') {
        dispatch({ type: 'OPEN_MIC_PANEL_DIRECT' });
        return;
      }
      if (route === 'openTts') {
        dispatch({ type: 'SELECT_FEATURE', feature: 'tts' });
        return;
      }
      if (route === 'openOcr') {
        dispatch({ type: 'SELECT_FEATURE', feature: 'ocr' });
        return;
      }
      if (route === 'read') {
        const text = typeof queryParams?.text === 'string' ? queryParams.text : null;
        if (!text?.trim()) return;
        setExternalTtsText(text);
        dispatch({ type: 'SELECT_FEATURE', feature: 'tts' });
        tts.speak(text).catch(() => {});
      }
    };

    Linking.getInitialURL().then(openFeatureFromUrl);
    const subscription = Linking.addEventListener('url', (event) => openFeatureFromUrl(event.url));
    return () => subscription.remove();
  }, [tts.speak]);

  const selectedHistoryItem = historyItems.find(
    (item) => item.id === state.selectedHistoryItemId,
  );
  const selectedText = externalTtsText || selectedHistoryItem?.text || null;

  const handleToggleMic = () => {
    if (isListening) stt.stop().catch(() => {});
    else stt.start().catch(() => {});
  };

  const handlePlaySelectedText = () => {
    if (selectedText?.trim()) tts.speak(selectedText).catch(() => {});
  };

  const handleSaveAudio = async () => {
    try {
      if (!selectedText?.trim()) return;
      const target = `${FileSystem.documentDirectory}STTS-${Date.now()}.wav`;
      await exportLastAudio(target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(target, { mimeType: 'audio/wav', dialogTitle: 'ذخیره یا اشتراک فایل صوتی STTS' });
      }
    } catch (err) {
      Alert.alert('ذخیره صدا', err instanceof Error ? err.message : 'ذخیره فایل صوتی ناموفق بود.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>STTS</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="بستن پنل"
          onPress={() => {
            if (isListening) stt.stop().catch(() => {});
            dispatch({ type: 'SELECT_FEATURE', feature: null });
          }}
        ><Text style={styles.topIcon}>✕</Text></Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تنظیمات و گزینه‌ها"
          onPress={() => dispatch({ type: 'SELECT_FEATURE', feature: 'settings' })}
        ><Text style={styles.topIcon}>☰</Text></Pressable>
      </View>

      {state.activeFeature === 'settings' && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsTitle}>تنظیمات STTS</Text>
          <Text style={styles.settingsHint}>گزینه‌های اصلی که هنوز به سرویس واقعی متصل نشده‌اند اینجا نمایش داده نمی‌شوند؛ STTS فقط کنترل‌های عملیاتی فعال را نشان می‌دهد.</Text>
          <Pressable style={styles.settingsButton} onPress={openAccessibilitySettings}>
            <Text style={styles.settingsButtonText}>تنظیم سرویس دسترس‌پذیری تایپ</Text>
          </Pressable>
          <Pressable
            style={styles.settingsButton}
            onPress={() => {
              (['stt', 'tts', 'ocr'] as const).forEach((mode) => {
                if (state.bubbles[mode]) dispatch({ type: 'HIDE_BUBBLE', mode });
              });
            }}
          >
            <Text style={styles.settingsButtonText}>بستن همه حباب‌ها</Text>
          </Pressable>
          <Pressable style={styles.settingsButton} onPress={() => dispatch({ type: 'SELECT_FEATURE', feature: null })}>
            <Text style={styles.settingsButtonText}>بستن تنظیمات</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.mainRow}>
        <HistoryPanel
          items={historyItems}
          selectedItemId={state.selectedHistoryItemId}
          onSelectItem={(id) => {
            setExternalTtsText(null);
            dispatch({ type: 'SELECT_HISTORY_ITEM', itemId: id });
          }}
        />
        <View style={styles.buttonColumn}>
          {(['tts', 'stt'] as const).map((feature) => (
            <Pressable
              key={feature}
              accessibilityRole="button"
              accessibilityLabel={FEATURE_LABELS[feature]}
              onPress={() => {
                dispatch({ type: 'SELECT_FEATURE', feature });
                dispatch({ type: 'TOGGLE_BUBBLE', mode: feature });
              }}
              style={[styles.featureButton, state.activeFeature === feature && styles.featureButtonActive]}
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
        <View style={styles.partialTextBox}><Text style={styles.partialTextValue}>{stt.partialText}</Text></View>
      )}
      {state.activeFeature === 'stt' && !!stt.error && (
        <View style={styles.partialTextBox}><Text style={styles.errorTextValue}>{stt.error.message}</Text></View>
      )}

      <AudioBar
        text={selectedText}
        status={tts.status}
        onPlay={handlePlaySelectedText}
        onStop={() => tts.stop().catch(() => {})}
        onSave={handleSaveAudio}
      />



      {state.micPanelOpen && state.activeFeature === 'stt' && (
        <MicPanel
          isListening={isListening}
          languageLabel={sttLanguage === "fa" ? "فا" : "EN"}
          onClose={() => {
            if (isListening) stt.stop().catch(() => {});
            dispatch({ type: 'CLOSE_MIC_PANEL' });
          }}
          onToggleMic={handleToggleMic}
          onLanguagePress={() => {
            if (isListening) {
              stt.stop().catch(() => {});
            }
            setSttLanguage((language) => (language === 'fa' ? 'en' : 'fa'));
          }}
        />
      )}

      {tts.error && state.activeFeature === 'tts' && (
        <View style={styles.partialTextBox}><Text style={styles.errorTextValue}>{tts.error.message}</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, writingDirection: 'rtl' },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 8 },
  appTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  topIcon: { fontSize: 20, minWidth: 28, textAlign: 'center' },
  mainRow: { flex: 1, flexDirection: 'row-reverse', paddingHorizontal: 8, gap: 8 },
  buttonColumn: { width: 72, gap: 8 },
  featureButton: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureButtonActive: { opacity: 0.7 },
  featureLabel: { fontSize: 11, textAlign: 'center' },
  settingsPanel: { marginHorizontal: 8, marginBottom: 8, padding: 10, borderRadius: 12, backgroundColor: '#1E2530', gap: 8 },
  settingsTitle: { fontSize: 15, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  settingsHint: { fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', opacity: 0.8 },
  settingsButton: { padding: 10, borderRadius: 9, backgroundColor: '#2A3A4A' },
  settingsButtonText: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  partialTextBox: { marginHorizontal: 8, marginBottom: 4, padding: 8, borderRadius: 10 },
  partialTextValue: { fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  errorTextValue: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl', color: '#FF6666' },
  enableTypingBanner: { marginHorizontal: 8, marginBottom: 4, padding: 10, borderRadius: 10, backgroundColor: '#2A3A4A' },
  enableTypingText: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl', color: '#CCE0FF' },
});
