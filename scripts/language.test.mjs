import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../apps/web', import.meta.url));

test('language catalogs have the same keys and saved language selects its own catalog', async () => {
  const vi = JSON.parse(await readFile(`${root}/src/app/i18n/vi.json`, 'utf8'));
  const en = JSON.parse(await readFile(`${root}/src/app/i18n/en.json`, 'utf8'));
  assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort());

  const saved = new Map([['tingting-language', 'en']]);
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  globalThis.document = { documentElement: { lang: '' } };
  const server = await createServer({
    root,
    configFile: `${root}/vite.config.ts`,
    server: { middlewareMode: true, hmr: false, watch: null },
    logLevel: 'silent',
  });
  try {
    const { t, setLanguage } = await server.ssrLoadModule('/src/app/i18n/language.ts');
    assert.equal(t('Đăng nhập'), 'Sign in');
    assert.equal(document.documentElement.lang, 'en');
    setLanguage('vi');
    assert.equal(t('Đăng nhập'), 'Đăng nhập');
    assert.equal(document.documentElement.lang, 'vi');
    assert.equal(saved.get('tingting-language'), 'vi');
    assert.equal(t('unknown key'), 'unknown key');
  } finally {
    await server.close();
    delete globalThis.localStorage;
    delete globalThis.document;
  }
});
