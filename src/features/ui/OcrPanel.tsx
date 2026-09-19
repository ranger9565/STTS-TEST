import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraView as CameraViewType } from 'expo-camera';
import { useOcr } from '../ocr/useOcr';

interface OcrPanelProps {
  onClose?: () => void;
  onReadResult?: (text: string) => void;
}

export function OcrPanel({ onClose, onReadResult }: OcrPanelProps) {
  const cameraRef = useRef<CameraViewType | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const ocr = useOcr();

  const handleCapture = async () => {
    if (capturing || ocr.session.state !== 'idle' || !cameraRef.current) return;

    setCapturing(true);
    try {
      ocr.startScan('full_screen');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
      });

      if (!photo?.base64) {
        throw new Error('داده تصویر دوربین دریافت نشد');
      }

      await ocr.processImage(photo.base64);
    } catch (err) {
      // useOcr.error state نمایش خطا را مدیریت می‌کند.
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return <View style={styles.messageBox}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.messageBox}>
        <Text style={styles.title}>دسترسی دوربین لازم است</Text>
        <Text style={styles.message}>برای اسکن متن، اجازه دسترسی به دوربین را فعال کنید.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>فعال‌کردن دوربین</Text>
        </Pressable>
        {onClose && (
          <Pressable style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryText}>بستن</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="picture"
      />

      <View style={styles.overlay}>
        <View style={styles.resultBox}>
          {ocr.session.state === 'processing' || capturing ? (
            <View style={styles.processing}>
              <ActivityIndicator />
              <Text style={styles.resultText}>در حال تشخیص متن...</Text>
            </View>
          ) : ocr.lastResult ? (
            <>
              <Text style={styles.resultTitle}>
                {ocr.lastResult.isReliable ? 'متن تشخیص‌داده‌شده' : 'نتیجه با اطمینان پایین'}
              </Text>
              <Text style={styles.resultText}>{ocr.lastResult.text || 'متنی پیدا نشد.'}</Text>
              <Text style={styles.confidence}>
                اطمینان: {Math.round(ocr.lastResult.confidence * 100)}٪
              </Text>
              {!!ocr.lastResult.text.trim() && onReadResult && (
                <Pressable
                  style={styles.readButton}
                  onPress={() => onReadResult(ocr.lastResult!.text)}
                >
                  <Text style={styles.buttonText}>خواندن متن</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.hint}>متن را داخل کادر دوربین قرار دهید و دکمه اسکن را بزنید.</Text>
          )}

          {!!ocr.error && (
            <Text style={styles.errorText}>{ocr.error.message}</Text>
          )}
        </View>

        <View style={styles.controls}>
          {onClose && (
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.buttonText}>✕</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.captureButton, (capturing || ocr.session.state !== 'idle') && styles.disabled]}
            disabled={capturing || ocr.session.state !== 'idle'}
            onPress={handleCapture}
          >
            <Text style={styles.captureText}>اسکن</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300, overflow: 'hidden', borderRadius: 16 },
  camera: { flex: 1, minHeight: 300 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 12,
  },
  resultBox: {
    alignSelf: 'stretch',
    maxHeight: 190,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center', color: '#FFFFFF' },
  message: { marginTop: 8, fontSize: 13, lineHeight: 20, textAlign: 'center', color: '#D8E0E8' },
  resultTitle: { fontSize: 13, fontWeight: '600', textAlign: 'right', color: '#FFFFFF' },
  resultText: { marginTop: 6, fontSize: 14, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl', color: '#FFFFFF' },
  confidence: { marginTop: 6, fontSize: 11, textAlign: 'right', color: '#B8C5D3' },
  hint: { fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl', color: '#FFFFFF' },
  errorText: { marginTop: 8, fontSize: 11, textAlign: 'right', writingDirection: 'rtl', color: '#FF8A80' },
  processing: { alignItems: 'center', gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  captureButton: {
    minWidth: 92,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  primaryButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  readButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#2A6F97',
  },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 13, fontWeight: '600', color: '#0F1923' },
  secondaryText: { fontSize: 13, color: '#D8E0E8' },
  captureText: { fontSize: 14, fontWeight: '700', color: '#0F1923' },
  messageBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#18232E',
  },
});
