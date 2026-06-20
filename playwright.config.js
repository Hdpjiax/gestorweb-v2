// playwright.config.js — configuración para tests IPC reales con Electron
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ipc',
  timeout: 30_000,
  // Un solo worker: Electron es de proceso único, no se puede paralelizar
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  projects: [
    {
      name: 'electron',
      // No hay browser que configurar — el runner usa electronApp directamente
      use: {}
    }
  ]
});
