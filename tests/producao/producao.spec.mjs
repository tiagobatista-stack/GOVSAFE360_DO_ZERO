import { test, expect } from '@playwright/test';

// P1–P5: checklist de docs/DEPLOY.md contra a URL publicada (baseURL em playwright.producao.config.mjs).

test('P1 painel: 8 cenários, totais 2/4/2, aviso não homologado, subtítulo Marco 7, versão 0.7.0', async ({ page }) => {
  const resp = await page.goto('/');
  expect(resp.status()).toBe(200);
  await expect(page).toHaveTitle(/GOVSAFE 360/);
  await expect(page.locator('#linhas tr')).toHaveCount(8);
  await expect(page.locator('#total-geral')).toHaveText('8');
  expect(await page.locator('.cartao .num').allTextContents()).toEqual(['2', '4', '2']);
  await expect(page.locator('.aviso').first()).toContainText('não é sistema institucional homologado');
  await expect(page.locator('p.marco')).toContainText('Marco 7');
  await expect(page.locator('#versao')).toHaveText('0.7.0');
});

test('P2 cabeçalhos de segurança no documento', async ({ page }) => {
  const h = (await page.goto('/')).headers();
  for (const k of ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']) expect(h[k], k).toBeTruthy();
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('no-referrer');
});

test('P3 console sem erros, sem violação de CSP e sem requisições a outros domínios', async ({ page, baseURL }) => {
  const host = new URL(baseURL).host;
  const erros = [], externos = [];
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('pageerror', e => erros.push(String(e)));
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && u.host !== host) externos.push(r.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(erros).toEqual([]);
  expect(externos).toEqual([]);
});

test('P4 cadastro fictício persiste após recarregar e a decisão vem da política', async ({ page }) => {
  await page.goto('/');
  await page.fill('#titulo', 'Teste fictício de produção');
  await page.selectOption('#dado', 'publico');
  await page.selectOption('#ambiente', 'desenvolvimento');
  await page.selectOption('#autonomia', 'leitura');
  await page.fill('#justificativa', 'Cenário fictício para conferir a publicação.');
  await page.click('#form-cenario button[type=submit]');
  await expect(page.locator('#linhas tr')).toHaveCount(9);
  await page.reload();
  await expect(page.locator('#linhas tr')).toHaveCount(9);
  await expect(page.locator('#linhas tr', { hasText: 'Teste fictício de produção' })).toContainText('Permitido');
});

test('P5 arquivos internos não são publicados (404)', async ({ request }) => {
  for (const p of ['/CLAUDE.md', '/docs/REQUISITOS.md', '/tools/govsafe-mcp.mjs', '/tests/politica.test.mjs', '/package.json', '/README.md', '/vercel.json', '/scripts/build.mjs'])
    expect((await request.get(p)).status(), p).toBe(404);
});
