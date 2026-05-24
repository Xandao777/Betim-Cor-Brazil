'use strict';

const { test, expect } = require('@playwright/test');

test('página inicial carrega', async function ({ page }) {
  await page.goto('/');
  await expect(page).toHaveTitle(/Associação|Betim/i);
  await expect(page.locator('.header, [data-site-chrome="header"]')).toBeVisible();
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
