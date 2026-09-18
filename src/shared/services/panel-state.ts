/**
 * مدیریت وضعیت پنل اصلی اپ.
 *
 * نکته‌ی معماری مهم:
 * activeFeature فقط مشخص می‌کند کدام پنل/بخش در foreground فعال است؛
 * مالکیت حباب‌ها از آن جداست تا STT و TTS (یا OCR) بتوانند هم‌زمان فعال بمانند.
 */

export type ActiveFeature = 'tts' | 'stt' | 'ocr' | 'settings' | null;
export type BubbleMode = 'tts' | 'stt' | 'ocr';

export interface BubbleState {
  tts: boolean;
  stt: boolean;
  ocr: boolean;
}

export interface PanelState {
  activeFeature: ActiveFeature;
  bubbles: BubbleState;
  selectedHistoryItemId: string | null;
  /** پنل مستطیلی میکروفون (X/میکروفون/پرچم) با تپ روی حباب باز می‌شود */
  micPanelOpen: boolean;
}

export type PanelAction =
  | { type: 'SELECT_FEATURE'; feature: ActiveFeature }
  | { type: 'TOGGLE_BUBBLE'; mode: BubbleMode }
  | { type: 'HIDE_BUBBLE'; mode: BubbleMode }
  | { type: 'SELECT_HISTORY_ITEM'; itemId: string | null }
  | { type: 'OPEN_MIC_PANEL' }
  | { type: 'CLOSE_MIC_PANEL' }
  | { type: 'OPEN_MIC_PANEL_DIRECT' };

export const initialPanelState: PanelState = {
  activeFeature: null,
  bubbles: { tts: false, stt: false, ocr: false },
  selectedHistoryItemId: null,
  micPanelOpen: false,
};

export function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'SELECT_FEATURE':
      return {
        ...state,
        activeFeature: action.feature,
        // تغییر پنل نباید حباب‌های مستقل دیگر را خاموش کند.
        micPanelOpen: action.feature === 'stt' ? state.micPanelOpen : false,
      };

    case 'TOGGLE_BUBBLE':
      return {
        ...state,
        bubbles: {
          ...state.bubbles,
          [action.mode]: !state.bubbles[action.mode],
        },
      };

    case 'HIDE_BUBBLE':
      return {
        ...state,
        bubbles: { ...state.bubbles, [action.mode]: false },
        ...(action.mode === 'stt' ? { micPanelOpen: false } : {}),
      };

    case 'SELECT_HISTORY_ITEM':
      return { ...state, selectedHistoryItemId: action.itemId };

    case 'OPEN_MIC_PANEL':
      return { ...state, activeFeature: 'stt', micPanelOpen: true };

    case 'CLOSE_MIC_PANEL':
      return { ...state, micPanelOpen: false };

    case 'OPEN_MIC_PANEL_DIRECT':
      return {
        ...state,
        activeFeature: 'stt',
        bubbles: { ...state.bubbles, stt: true },
        micPanelOpen: true,
      };

    default:
      return state;
  }
}
