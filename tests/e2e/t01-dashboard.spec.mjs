import { test, expect, linhas, totais } from './util.mjs';

test('Teste 01 — dashboard: 8 cenários iniciais, totais 2/4/2 e aviso de não homologado (REQ01, CA01, R10)', async ({ app }) => {
  await expect(app).toHaveTitle(/GOVSAFE 360/);
  await expect(linhas(app)).toHaveCount(8);
  expect(await totais(app)).toEqual(['2', '4', '2']);
  await expect(app.locator('#total-geral')).toHaveText('8');
  await expect(app.locator('.cartao').nth(0)).toContainText('Permitido');
  await expect(app.locator('.cartao').nth(1)).toContainText('Condicionado');
  await expect(app.locator('.cartao').nth(2)).toContainText('Não autorizado');
  // R10: aviso ostensivo, visível sem rolagem
  const aviso = app.locator('.aviso').first();
  await expect(aviso).toContainText('não é sistema institucional homologado');
  await expect(aviso).toBeInViewport();
});

test('Teste 01 — navegação por âncoras leva às seções', async ({ app }) => {
  for (const [link, secao] of [['Cadastrar', 'cadastro'], ['Cenários', 'cenarios'], ['Revisão', 'revisao'], ['Histórico', 'historico'], ['Sobre', 'sobre']]) {
    await app.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: link }).click();
    await expect(app).toHaveURL(new RegExp(`#${secao}$`));
    await expect(app.locator(`#${secao}`)).toBeInViewport();
  }
});

test('Teste 01 — cada decisão aparece com texto (não só cor) e a regra aplicada', async ({ app }) => {
  const linha7 = app.locator('#linhas tr').nth(6);
  await expect(linha7).toContainText('Não autorizado');
  await expect(linha7).toContainText('[R1]');
  await expect(app.locator('#linhas tr').nth(3)).toContainText('autoridade instrucional'); // cenário 4: conteúdo externo (CA05)
});
