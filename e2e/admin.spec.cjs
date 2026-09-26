'use strict';

const { test, expect } = require('@playwright/test');

test('admin login e painel carregam', async function ({ page }) {
  await page.goto('/admin/index.html');
  await page.fill('#admin-usuario', 'admin');
  await page.fill('#admin-senha', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/painel\.html/);
  await expect(page.locator('#secao-dashboard')).toBeVisible({ timeout: 15000 });
  await page.click('a[data-secao="formularios"]');
  await expect(page.locator('#btn-limpar-lidos-antigos')).toBeVisible();
  await expect(page.locator('#retencao-formularios-dias')).toHaveValue('90');
});

test('institucional expõe banner no site público', async function ({ page, playwright }) {
  var api = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3099' });
  var login = await api.post('/api/auth/admin', { data: { usuario: 'admin', senha: 'admin123' } });
  expect(login.ok()).toBeTruthy();
  var full = await api.get('/api/full');
  var body = await full.json();
  var inst = body.institutional || {};
  var etag = body._keyEtags && body._keyEtags.institutional;
  inst.homepage = Object.assign({}, inst.homepage, {
    titulo: 'Título E2E Automático',
    subtitulo: 'Subtítulo de teste Playwright'
  });
  var headers = { Origin: 'http://127.0.0.1:3099' };
  if (etag) headers['If-Match'] = etag;
  var put = await api.put('/api/state/institutional', { data: inst, headers: headers });
  expect(put.ok()).toBeTruthy();
  await page.goto('/');
  await expect(page.locator('#hero-titulo')).toContainText('Título E2E Automático', { timeout: 15000 });
  await api.dispose();
});
