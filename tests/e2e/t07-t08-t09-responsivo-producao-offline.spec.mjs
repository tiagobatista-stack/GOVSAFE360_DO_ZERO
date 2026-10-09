import { test, expect, APP_URL, linhas, linha, cadastrar } from './util.mjs';

test('Teste 07 — 390px: sem rolagem horizontal global; a tabela rola dentro de .table-wrap (CA10, REQ07)', async ({ app }) => {
  await app.setViewportSize({ width: 390, height: 844 });
  await app.reload();
  const m = await app.evaluate(() => ({
    pagina: document.documentElement.scrollWidth, janela: window.innerWidth,
    tabela: [...document.querySelectorAll('.table-wrap')].map(w => [w.scrollWidth, w.clientWidth])
  }));
  expect(m.pagina).toBeLessThanOrEqual(m.janela + 2);
  for (const [rolavel, visivel] of m.tabela) expect(rolavel).toBeGreaterThan(visivel);
  await expect(app.locator('.aviso').first()).toBeInViewport();
});

test('Teste 07 — 390px: dá para cadastrar e revisar usando só o celular', async ({ app }) => {
  await app.setViewportSize({ width: 390, height: 844 });
  await cadastrar(app, { titulo: 'Cenário no celular', dado: 'interno', ambiente: 'homologacao', autonomia: 'proposta', justificativa: 'Teste móvel.' });
  await expect(app.locator('#status-form')).toContainText('Cenário #9 cadastrado: Condicionado (R4)');
  const m = await app.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(m[0]).toBeLessThanOrEqual(m[1] + 2);
});

test('Teste 07 — 1280px: cartões em 3 colunas; 390px: em 1 coluna', async ({ app }) => {
  const colunas = () => app.evaluate(() => getComputedStyle(document.querySelector('.cartoes')).gridTemplateColumns.split(' ').length);
  expect(await colunas()).toBe(3);
  await app.setViewportSize({ width: 390, height: 844 });
  expect(await colunas()).toBe(1);
});

test('Teste 08 — produção: edição/execução não autorizadas; leitura/proposta condicionadas (REQ08, CA03, CA04)', async ({ app }) => {
  const casos = [['edicao', 'Não autorizado', 'R2'], ['execucao', 'Não autorizado', 'R2'], ['leitura', 'Condicionado', 'R3'], ['proposta', 'Condicionado', 'R3'], ['critica', 'Não autorizado', 'R1']];
  let id = 9;
  for (const [autonomia, decisao, regra] of casos) {
    await cadastrar(app, { titulo: `Produção ${autonomia}`, dado: 'interno', ambiente: 'producao', autonomia, justificativa: 'Exercício.' });
    await expect(linha(app, id)).toContainText(decisao);
    await expect(linha(app, id)).toContainText(`[${regra}]`);
    id++;
  }
  // nenhuma ação em produção pode ser aprovada: a execução fica bloqueada mesmo com "revisão humana"
  await expect(app.locator('#linhas tr .selo.d-permitido').filter({ hasText: 'Permitido' })).toHaveCount(2); // só os 2 exemplos públicos
});

test('Teste 09 — offline: funciona sem rede e sem requisições externas (R08, CA09)', async ({ app, context }) => {
  await context.setOffline(true);
  await app.reload();
  await expect(linhas(app)).toHaveCount(8);
  await cadastrar(app, { titulo: 'Cadastro sem internet', dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: 'Offline.' });
  await expect(linhas(app)).toHaveCount(9);
  const recursos = await app.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
  for (const r of recursos) expect(r).toMatch(/^file:/);
});

test('Teste 09 — acessibilidade: rótulos, foco visível, link de salto e anúncios', async ({ app }) => {
  // todo campo de formulário tem rótulo associado
  const semRotulo = await app.locator('form input, form select, form textarea, .filtros input, .filtros select').evaluateAll(
    els => els.filter(e => !e.labels || e.labels.length === 0).map(e => e.id));
  expect(semRotulo).toEqual([]);
  // primeiro Tab cai no link de salto
  await app.keyboard.press('Tab');
  await expect(app.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  // foco visível em link e botão
  for (const alvo of [app.getByRole('link', { name: 'Painel' }), app.getByRole('button', { name: 'Cadastrar cenário' })]) {
    await alvo.focus();
    const largura = await alvo.evaluate(e => parseFloat(getComputedStyle(e).outlineWidth));
    expect(largura).toBeGreaterThanOrEqual(2);
  }
  // regiões roláveis são focáveis por teclado e mensagens dinâmicas são anunciadas
  await expect(app.locator('.table-wrap').first()).toHaveAttribute('tabindex', '0');
  for (const id of ['#status-form', '#status-rev', '#contagem']) await expect(app.locator(id)).toHaveAttribute('role', 'status');
  await expect(app.locator('html')).toHaveAttribute('lang', 'pt-BR');
});

test('Teste 09 — a página não faz requisições de rede nem na carga inicial', async ({ page }) => {
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  await page.goto(APP_URL);
  await expect(linhas(page)).toHaveCount(8);
  expect(reqs.filter(u => !u.startsWith('file:'))).toEqual([]);
});
