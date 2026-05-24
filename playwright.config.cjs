'use strict';

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3099',
    headless: true
  },
  webServer: {
    command: 'node server.cjs',
    url: 'http://127.0.0.1:3099/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      PORT: '3099',
      SITE_DATA_FILE: require('path').join(__dirname, 'data', 'e2e-site-data.json')
    }
  }
});
