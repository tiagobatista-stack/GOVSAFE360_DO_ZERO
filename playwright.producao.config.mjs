import { defineConfig } from '@playwright/test';

// Conferência da URL publicada (somente leitura + um cadastro fictício no navegador de teste).
// Separada da suíte e2e (que abre a fonte por file://) e fora do CI, porque depende da rede e da produção.
// Uso: npm run test:producao            (padrão: https://govsafe360dozero.vercel.app)
//      PROD_URL=https://<outra-url> npm run test:producao
const channel = process.env.PW_CHANNEL || (process.env.CI ? undefined : 'chrome');

export default defineConfig({
  testDir: 'tests/producao',
  outputDir: 'evidencias/playwright-resultados/producao',
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    channel,
    baseURL: process.env.PROD_URL || 'https://govsafe360dozero.vercel.app',
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR'
  }
});
