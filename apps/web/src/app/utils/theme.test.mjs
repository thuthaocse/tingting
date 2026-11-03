import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTheme, readTheme, THEME_KEY } from './theme.mjs';

test('theme defaults to light, saves the selected mode and restores it', () => {
  const values = new Map();
  const browser = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } };
  const root = { dataset: {} };
  assert.equal(readTheme(browser), 'light');
  applyTheme('dark', root, browser);
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(values.get(THEME_KEY), 'dark');
  assert.equal(readTheme(browser), 'dark');
  applyTheme('light', root, browser);
  assert.equal(readTheme(browser), 'light');
});

test('theme works for the current page if browser storage is unavailable', () => {
  const browser = { get localStorage() { throw new Error('Unavailable'); } };
  const root = { dataset: {} };
  assert.equal(readTheme(browser), 'light');
  assert.doesNotThrow(() => applyTheme('dark', root, browser));
  assert.equal(root.dataset.theme, 'dark');
});
