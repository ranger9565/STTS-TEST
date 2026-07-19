/**
 * نقطه ورودی expo-router.
 * موتورهای AI را مقداردهی می‌کند و صفحه loading نمایش می‌دهد.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeApp, InitStatus } from '../src/shared/services/app-init';

// اجبار راست‌چین برای کل اپ
I18nManager.forceRTL(true);

const PHASE_LABELS: Record<InitStatus['phase'], string> = {
  idle: '',
  extracting_models: 'آماده‌سازی مدل‌های هوش مصنوعی...',
  loading_vosk: 'بارگذاری موتور صوت‌به‌متن (Vosk)...',
  loading_piper: 'بارگذاری موتور متن‌به‌صوت (Piper)...',
  loading_tesseract: 'بارگذاری موتور اسکنر (Tesseract)...',
  ready: 'آماده',
  error: 'خطا در راه‌اندازی',
};

export default function RootLayout() {
  const [status, setStatus] = useState<InitStatus>({ phase: 'idle' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeApp((s) => {
      setStatus(s);
      if (s.phase === 'ready') setReady(true);
    }).catch(() => {
      // خطا از طریق status.phase === 'error' گزارش می‌شود
    });
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Text style={styles.appName}>STTS</Text>
        <Text style={styles.appSubtitle}>صوت و متن فارسی</Text>
        <ActivityIndicator size="large" color="#4A90D9" style={styles.spinner} />
        <Text style={styles.phaseLabel}>
          {PHASE_LABELS[status.phase]}
        </Text>
        {status.phase === 'error' && (
          <Text style={styles.errorText}>
            {'error' in status ? status.error.message : ''}
          </Text>
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1923',
    gap: 12,
  },
  appName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#8899AA',
    writingDirection: 'rtl',
  },
  spinner: {
    marginTop: 24,
  },
  phaseLabel: {
    fontSize: 14,
    color: '#6688AA',
    writingDirection: 'rtl',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6666',
    textAlign: 'center',
    paddingHorizontal: 24,
    writingDirection: 'rtl',
  },
});
