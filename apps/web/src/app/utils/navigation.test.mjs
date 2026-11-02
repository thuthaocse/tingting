import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internalRoute } from './navigation.mjs';
const base = 'http://localhost:3000/';
const click = { button: 0 };
test('internal group/home links use client navigation while preserving route state', () => {
  assert.equal(
    internalRoute('/g/abc-123?view=all#expenses', base, click),
    '/g/abc-123?view=all#expenses',
  );
  assert.equal(internalRoute('/', base, click), '/');
});
test('OAuth, external links, downloads and modified clicks keep native navigation', () => {
  for (const href of ['/auth/google/start', 'https://example.com/g/abc', '/image.png'])
    assert.equal(internalRoute(href, base, click), null);
  for (const event of [
    { button: 1 },
    { button: 0, ctrlKey: true },
    { button: 0, metaKey: true },
    { button: 0, defaultPrevented: true },
  ])
    assert.equal(internalRoute('/g/abc', base, event), null);
  assert.equal(internalRoute('/g/abc', base, click, '_blank'), null);
  assert.equal(internalRoute('/g/abc', base, click, '', true), null);
});
