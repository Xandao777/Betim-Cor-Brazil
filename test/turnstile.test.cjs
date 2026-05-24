'use strict';

const turnstile = require('../server/turnstile.cjs');

describe('turnstile', function () {
  const origSecret = process.env.TURNSTILE_SECRET_KEY;
  const origSite = process.env.TURNSTILE_SITE_KEY;

  afterEach(function () {
    if (origSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = origSecret;
    if (origSite === undefined) delete process.env.TURNSTILE_SITE_KEY;
    else process.env.TURNSTILE_SITE_KEY = origSite;
  });

  test('isEnabled false sem secret', function () {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(turnstile.isEnabled()).toBe(false);
  });

  test('verifyToken passa quando desativado', async function () {
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(turnstile.verifyToken('', null)).resolves.toBe(true);
  });

  test('siteKey lê variável', function () {
    process.env.TURNSTILE_SITE_KEY = 'test-site-key';
    expect(turnstile.siteKey()).toBe('test-site-key');
  });
});
