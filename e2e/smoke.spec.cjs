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
