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
}

export type PanelAction =
  | { type: 'SELECT_FEATURE'; feature: ActiveFeature }
  | { type: 'TOGGLE_BUBBLE' }
  | { type: 'HIDE_BUBBLE' }
  | { type: 'SELECT_HISTORY_ITEM'; itemId: string | null };

export const initialPanelState: PanelState = {
  activeFeature: null,
  bubbleVisible: false,
  selectedHistoryItemId: null,
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
        bubbleVisible: shouldToggleBubble
          ? !(state.activeFeature === action.feature && state.bubbleVisible)
          : state.bubbleVisible,
      };
    }
    case 'TOGGLE_BUBBLE':
      return { ...state, bubbleVisible: !state.bubbleVisible };
    case 'HIDE_BUBBLE':
      return { ...state, bubbleVisible: false };
    case 'SELECT_HISTORY_ITEM':
      return { ...state, selectedHistoryItemId: action.itemId };
    default:
      return state;
  }
}
