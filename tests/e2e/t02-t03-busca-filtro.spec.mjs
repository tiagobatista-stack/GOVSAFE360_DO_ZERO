import { test, expect, linhas } from './util.mjs';

test('Teste 02 — busca por texto, sem diferenciar acento ou caixa (REQ02)', async ({ app }) => {
  const busca = app.getByLabel('Buscar (finalidade ou justificativa)');
  await busca.fill('NORMA publica');
  await expect(linhas(app)).toHaveCount(1);
  await expect(linhas(app).first()).toContainText('Resumir norma pública');
  await busca.fill('configuracao');
  await expect(linhas(app)).toHaveCount(1);
  await expect(app.locator('#contagem')).toHaveText('Exibindo 1 de 8 cenário(s).');
});

test('Teste 02 — busca sem resultado mostra mensagem e "Limpar filtros" restaura', async ({ app }) => {
  await app.getByLabel('Buscar (finalidade ou justificativa)').fill('zzzz-inexistente');
  await expect(linhas(app)).toHaveCount(0);
  await expect(app.locator('#vazio')).toBeVisible();
  await expect(app.locator('#vazio')).toContainText('Nenhum cenário corresponde');
  await app.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(linhas(app)).toHaveCount(8);
  await expect(app.locator('#vazio')).toBeHidden();
});

test('Teste 03 — filtro por decisão (REQ03)', async ({ app }) => {
  const filtro = app.getByLabel('Decisão', { exact: true });
  for (const [valor, qtd, texto] of [['permitido', 2, 'Permitido'], ['condicionado', 4, 'Condicionado'], ['nao_autorizado', 2, 'Não autorizado']]) {
    await filtro.selectOption(valor);
    await expect(linhas(app)).toHaveCount(qtd);
    for (const l of await linhas(app).all()) await expect(l.locator('.selo').first()).toContainText(texto);
    await expect(app.locator('#contagem')).toHaveText(`Exibindo ${qtd} de 8 cenário(s).`);
  }
  await filtro.selectOption('');
  await expect(linhas(app)).toHaveCount(8);
});

test('Teste 03 — busca e filtro combinados; o painel mantém os totais gerais', async ({ app }) => {
  await app.getByLabel('Decisão', { exact: true }).selectOption('nao_autorizado');
  await app.getByLabel('Buscar (finalidade ou justificativa)').fill('token');
  await expect(linhas(app)).toHaveCount(1);
  await expect(linhas(app).first()).toContainText('Automação com token de API');
  await expect(app.locator('.cartao .num')).toHaveText(['2', '4', '2']);
});
