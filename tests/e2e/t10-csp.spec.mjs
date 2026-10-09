import { test, expect, APP_URL, linhas } from './util.mjs';

// A CSP precisa estar ATIVA no navegador (não só escrita no HTML) e não pode quebrar o app.
test('Teste 10 — CSP ativa: bloqueia script inline, conexão externa e imagem externa; o app segue funcionando', async ({ page }) => {
  const violacoes = [];
  page.on('console', m => { if (/Content Security Policy/i.test(m.text())) violacoes.push(m.text()); });
  await page.goto(APP_URL);
  await expect(linhas(page)).toHaveCount(8); // app funciona com a CSP

  // 1) script inline injetado (como um XSS faria) não executa
  const executou = await page.evaluate(() => new Promise(resolve => {
    window.__inline = false;
    const s = document.createElement('script');
    s.textContent = 'window.__inline = true';
    document.head.append(s);
    setTimeout(() => resolve(window.__inline), 100);
  }));
  expect(executou).toBe(false);

  // 2) conexão externa é bloqueada por connect-src 'none'
  const conectou = await page.evaluate(() => fetch('https://exemplo.invalid/x').then(() => true, () => false));
  expect(conectou).toBe(false);

  // 3) imagem externa não carrega (img-src 'self' data:)
  const imagem = await page.evaluate(() => new Promise(resolve => {
    const i = new Image();
    i.onload = () => resolve('carregou');
    i.onerror = () => resolve('bloqueada');
    i.src = 'https://exemplo.invalid/i.png';
  }));
  expect(imagem).toBe('bloqueada');

  expect(violacoes.length).toBeGreaterThanOrEqual(2); // o navegador registrou as violações
});

test('Teste 10 — a página declara a CSP e não tem script ou estilo inline', async ({ page }) => {
  await page.goto(APP_URL);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'none'");
  expect(csp).toContain("connect-src 'none'");
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(await page.locator('script:not([src])').count()).toBe(0);
  expect(await page.locator('[style]').count()).toBe(0);
});
