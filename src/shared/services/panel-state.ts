/**
 * مدیریت وضعیت پنل اصلی اپ: کدام فیچر فعاله، حباب شناور نمایش داده می‌شه یا نه،
 * و کدوم آیتم تاریخچه الان انتخاب/درحال‌پخش هست.
 * این منطق از UI جدا نگه داشته می‌شود تا بدون رندر واقعی React Native قابل تست باشد.
 */

export type ActiveFeature = 'tts' | 'stt' | 'ocr' | 'settings' | null;

export interface PanelState {
  activeFeature: ActiveFeature;
  bubbleVisible: boolean;
  selectedHistoryItemId: string | null;
  /** پنل مستطیلی میکروفون (X/میکروفون/پرچم) با تپ روی حباب باز می‌شود */
  micPanelOpen: boolean;
}

export type PanelAction =
  | { type: 'SELECT_FEATURE'; feature: ActiveFeature }
  | { type: 'TOGGLE_BUBBLE' }
  | { type: 'HIDE_BUBBLE' }
  | { type: 'SELECT_HISTORY_ITEM'; itemId: string | null }
  | { type: 'OPEN_MIC_PANEL' }
  | { type: 'CLOSE_MIC_PANEL' }
  | { type: 'OPEN_MIC_PANEL_DIRECT' };

export const initialPanelState: PanelState = {
  activeFeature: null,
  bubbleVisible: false,
  selectedHistoryItemId: null,
  micPanelOpen: false,
};

/**
 * انتخاب فیچر صوت‌به‌متن یا اسکنر، حباب شناور را toggle می‌کند (چون هر دو حباب‌محورند).
 * انتخاب متن‌به‌صوت یا تنظیمات، حباب را نمایش نمی‌دهد (بدون حباب طبق مشخصات).
 */
export function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'SELECT_FEATURE': {
      const bubbleFeatures: ActiveFeature[] = ['stt', 'ocr'];
      const shouldToggleBubble = bubbleFeatures.includes(action.feature);

      return {
        ...state,
        activeFeature: action.feature,
        // وقتی از STT/OCR به TTS یا Settings می‌رویم، حباب قبلی نباید
        // با mode اشتباه روی صفحه باقی بماند.
        bubbleVisible: shouldToggleBubble
          ? !(state.activeFeature === action.feature && state.bubbleVisible)
          : false,
        micPanelOpen: action.feature === 'stt' ? state.micPanelOpen : false,
      };
    }
    case 'TOGGLE_BUBBLE':
      return { ...state, bubbleVisible: !state.bubbleVisible };
    case 'HIDE_BUBBLE':
      return { ...state, bubbleVisible: false, micPanelOpen: false };
    case 'SELECT_HISTORY_ITEM':
      return { ...state, selectedHistoryItemId: action.itemId };
    case 'OPEN_MIC_PANEL':
      return { ...state, micPanelOpen: true };
    case 'CLOSE_MIC_PANEL':
      return { ...state, micPanelOpen: false };
    case 'OPEN_MIC_PANEL_DIRECT':
      // برای زمانی که کاربر از طریق حباب سیستمی (خارج از اپ) دیپ‌لینک می‌زنه؛
      // یک اکشن اتمیک تا با منطق toggle موجود در SELECT_FEATURE تداخل نکنه.
      return { ...state, activeFeature: 'stt', bubbleVisible: true, micPanelOpen: true };
    default:
      return state;
  }
}
