import { defineConfig } from '@playwright/test';

// Local: usa o Chrome do sistema (sem baixar navegador). CI: usa o Chromium instalado pelo workflow.
// Para forçar outro canal: PW_CHANNEL=msedge npm run test:e2e
const channel = process.env.PW_CHANNEL || (process.env.CI ? undefined : 'chrome');

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'evidencias/playwright-resultados',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'evidencias/relatorio-html' }]]
    : [['list']],
  use: {
    channel,
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
