'use strict';

const { defineConfig } = require('@playwright/test');

const webServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
  ? undefined
  : {
      command: 'node server.cjs',
      url: 'http://127.0.0.1:3099/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        PORT: '3099',
        SITE_DATA_FILE: require('path').join(__dirname, 'data', 'e2e-site-data.json'),
        ALLOW_DEMO_SEED: '1',
        JWT_SECRET: 'e2e-jwt-secret-minimo-16-chars'
      },
      gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 }
    };

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3099',
    headless: true
  },
  webServer: webServer
});
