'use strict';

const { test, expect } = require('@playwright/test');

test('página inicial carrega', async function ({ page }) {
  await page.goto('/');
  await expect(page).toHaveTitle(/Associação|Betim/i);
  await expect(page.locator('.header, [data-site-chrome="header"]')).toBeVisible();
});

test('identidade visual é responsiva e não causa rolagem horizontal', async function ({ page }) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.hero-kicker')).toBeVisible();
  await expect(page.locator('.hero-symbol')).toBeVisible();
  expect(await page.evaluate(function () {
    return globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth;
  })).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.hero-symbol')).toBeHidden();
  expect(await page.evaluate(function () {
    return globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth;
  })).toBe(true);
});

test('API health responde ok', async function ({ request }) {
  var res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  var body = await res.json();
  expect(body.ok).toBe(true);
});

test('partials do cabeçalho são servidos', async function ({ request }) {
  var res = await request.get('/partials/site-header.html');
  expect(res.ok()).toBeTruthy();
  var text = await res.text();
  expect(text).toMatch(/Betim Cor Brazil/);
});

test('detalhe de evento traz SEO antes do JavaScript', async function ({ request }) {
  var stateResponse = await request.get('/api/public');
  var state = await stateResponse.json();
  var event = state.events[0];
  expect(event).toBeTruthy();
  var response = await request.get('/evento.html?id=' + encodeURIComponent(event.id));
  var html = await response.text();
  expect(html).toContain(event.titulo + ' | Associação Betim Cor Brazil');
  expect(html).toContain('application/ld+json');
});

test('navegação por teclado alcança o conteúdo principal', async function ({ page }) {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});
