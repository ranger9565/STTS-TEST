import { panelReducer, initialPanelState } from '../panel-state';

test('انتخاب STT فقط حباب STT را فعال می‌کند', () => {
  let state = panelReducer(initialPanelState, { type: 'SELECT_FEATURE', feature: 'stt' });
  state = panelReducer(state, { type: 'TOGGLE_BUBBLE', mode: 'stt' });
  expect(state.activeFeature).toBe('stt');
  expect(state.bubbles.stt).toBe(true);
  expect(state.bubbles.tts).toBe(false);
  expect(state.bubbles.ocr).toBe(false);
});

test('حباب STT و TTS می‌توانند هم‌زمان فعال باشند', () => {
  let state = panelReducer(initialPanelState, { type: 'TOGGLE_BUBBLE', mode: 'stt' });
  state = panelReducer(state, { type: 'TOGGLE_BUBBLE', mode: 'tts' });

  expect(state.bubbles.stt).toBe(true);
  expect(state.bubbles.tts).toBe(true);
});

test('خاموش‌کردن TTS حباب STT را دست‌نخورده نگه می‌دارد', () => {
  let state = {
    ...initialPanelState,
    bubbles: { tts: true, stt: true, ocr: false },
  };
  state = panelReducer(state, { type: 'HIDE_BUBBLE', mode: 'tts' });

  expect(state.bubbles.tts).toBe(false);
  expect(state.bubbles.stt).toBe(true);
});

test('انتخاب تنظیمات هیچ حباب مستقلی را خاموش نمی‌کند', () => {
  const state = panelReducer(
    {
      ...initialPanelState,
      bubbles: { tts: true, stt: true, ocr: false },
    },
    { type: 'SELECT_FEATURE', feature: 'settings' },
  );

  expect(state.activeFeature).toBe('settings');
  expect(state.bubbles.tts).toBe(true);
  expect(state.bubbles.stt).toBe(true);
});

test('SELECT_HISTORY_ITEM آیتم انتخاب‌شده را تنظیم می‌کند', () => {
  const state = panelReducer(initialPanelState, {
    type: 'SELECT_HISTORY_ITEM',
    itemId: 'abc',
  });
  expect(state.selectedHistoryItemId).toBe('abc');
});

test('OPEN_MIC_PANEL_DIRECT حباب STT و پنل میکروفون را فعال می‌کند', () => {
  const state = panelReducer(initialPanelState, { type: 'OPEN_MIC_PANEL_DIRECT' });

  expect(state.activeFeature).toBe('stt');
  expect(state.bubbles.stt).toBe(true);
  expect(state.micPanelOpen).toBe(true);
});

test('HIDE_BUBBLE برای STT فقط STT را می‌بندد و پنل میکروفون را می‌بندد', () => {
  const state = panelReducer(
    {
      ...initialPanelState,
      bubbles: { tts: true, stt: true, ocr: false },
      micPanelOpen: true,
    },
    { type: 'HIDE_BUBBLE', mode: 'stt' },
  );

  expect(state.bubbles.stt).toBe(false);
  expect(state.bubbles.tts).toBe(true);
  expect(state.micPanelOpen).toBe(false);
});
