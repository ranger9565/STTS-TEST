import { useEffect, useRef } from 'react';
import { PermissionsAndroid } from 'react-native';
import * as Linking from 'expo-linking';
import {
  addBubbleTapListener,
  setOverlayBubbleActive,
} from '../../../modules/overlay-module/src';
import { isAccessibilityServiceEnabled } from '../../../modules/typing-module/src';
import { decideBubbleTapAction } from '../../shared/services/bubble-tap';
import type { UseSttResult } from '../stt/useStt';

/**
 * تپ روی حباب STT را مدیریت می‌کند:
 *  - اگر مجوز میکروفون و سرویس دسترس‌پذیری آماده باشند، ضبط را (بدون جلو آوردن اپ)
 *    شروع/متوقف می‌کند تا متن در فیلد اپ دیگر تایپ شود؛
 *  - وگرنه اپ را روی پنل میکروفون باز می‌کند تا کاربر آن‌ها را فعال کند.
 * همچنین حباب را هنگام ضبط قرمز می‌کند.
 */
export function useSttBubbleTap(stt: UseSttResult): void {
  const sttRef = useRef(stt);
  sttRef.current = stt;

  const isListening = stt.session.state === 'listening';

  useEffect(() => {
    const subscription = addBubbleTapListener(async ({ mode }) => {
      if (mode !== 'stt') return;

      const current = sttRef.current;
      let micGranted = false;
      try {
        micGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      } catch {
        micGranted = false;
      }

      const action = decideBubbleTapAction({
        isListening: current.session.state === 'listening',
        micGranted,
        typingEnabled: isAccessibilityServiceEnabled(),
      });

      if (action === 'stop') {
        current.stop().catch(() => {});
      } else if (action === 'start') {
        current.start().catch(() => {});
      } else {
        Linking.openURL('stts://openMic').catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setOverlayBubbleActive('stt', isListening).catch(() => {});
  }, [isListening]);
}
