const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 30000,
  use: {
    headless: true,
  },
});
