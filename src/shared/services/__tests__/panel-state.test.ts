import { panelReducer, initialPanelState } from '../panel-state';

test('انتخاب فیچر صوت‌به‌متن، حباب را نمایش می‌دهد', () => {
  const state = panelReducer(initialPanelState, { type: 'SELECT_FEATURE', feature: 'stt' });
  expect(state.activeFeature).toBe('stt');
  expect(state.bubbleVisible).toBe(true);
});

test('انتخاب دوباره همان فیچر حباب‌محور، حباب را مخفی می‌کند (toggle)', () => {
  let state = panelReducer(initialPanelState, { type: 'SELECT_FEATURE', feature: 'stt' });
  state = panelReducer(state, { type: 'SELECT_FEATURE', feature: 'stt' });
  expect(state.bubbleVisible).toBe(false);
});

test('انتخاب متن‌به‌صوت حباب را تغییر نمی‌دهد (بدون حباب طبق مشخصات)', () => {
  const state = panelReducer(initialPanelState, { type: 'SELECT_FEATURE', feature: 'tts' });
  expect(state.activeFeature).toBe('tts');
  expect(state.bubbleVisible).toBe(false);
});

test('انتخاب تنظیمات حباب را تغییر نمی‌دهد', () => {
  const state = panelReducer(
    { ...initialPanelState, bubbleVisible: true },
    { type: 'SELECT_FEATURE', feature: 'settings' },
  );
  expect(state.bubbleVisible).toBe(true); // بدون تغییر
});

test('HIDE_BUBBLE همیشه حباب را مخفی می‌کند', () => {
  const state = panelReducer(
    { ...initialPanelState, bubbleVisible: true },
    { type: 'HIDE_BUBBLE' },
  );
  expect(state.bubbleVisible).toBe(false);
});

test('SELECT_HISTORY_ITEM آیتم انتخاب‌شده را تنظیم می‌کند', () => {
  const state = panelReducer(initialPanelState, { type: 'SELECT_HISTORY_ITEM', itemId: 'abc' });
  expect(state.selectedHistoryItemId).toBe('abc');
});
