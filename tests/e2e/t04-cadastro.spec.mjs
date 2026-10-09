import { test, expect, linhas, linha, totais, cadastrar } from './util.mjs';

test('Teste 04 — novo cenário persiste após F5 (CA06, REQ04)', async ({ app }) => {
  await cadastrar(app, { titulo: 'Resumir ata pública fictícia', dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'proposta', justificativa: 'Exercício do Teste 04.' });
  await expect(app.locator('#status-form')).toContainText('Cenário #9 cadastrado: Permitido (R5)');
  await expect(linhas(app)).toHaveCount(9);
  expect(await totais(app)).toEqual(['3', '4', '2']);
  await app.reload();
  await expect(linhas(app)).toHaveCount(9);
  await expect(linha(app, 9)).toContainText('Resumir ata pública fictícia');
  expect(await totais(app)).toEqual(['3', '4', '2']);
});

test('Teste 04 — formulário vazio mostra erros por campo e não cadastra', async ({ app }) => {
  await app.getByRole('button', { name: 'Cadastrar cenário' }).click();
  for (const id of ['titulo', 'dado', 'ambiente', 'autonomia', 'justificativa']) {
    await expect(app.locator(`#erro-${id}`)).not.toBeEmpty();
    await expect(app.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(app.locator('#titulo')).toBeFocused();
  await expect(linhas(app)).toHaveCount(8);
});

test('Teste 04 — credencial => não autorizado, sem pedir nem guardar segredo (CA02)', async ({ app }) => {
  await cadastrar(app, { titulo: 'Usar credencial fictícia', dado: 'credencial', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: 'Somente exercício.' });
  await expect(linha(app, 9)).toContainText('Não autorizado');
  await expect(linha(app, 9)).toContainText('[R1]');
  await expect(app.locator('input[type="password"]')).toHaveCount(0);
  await app.getByLabel('Finalidade', { exact: true }).fill('senha: abc12345');
  await app.getByLabel('Justificativa', { exact: true }).fill('x');
  await app.getByRole('button', { name: 'Cadastrar cenário' }).click();
  await expect(app.locator('#erro-titulo')).toContainText('segredo');
  await expect(linhas(app)).toHaveCount(9);
  const guardado = await app.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(guardado).not.toContain('abc12345');
});

test('Teste 04 — dado externo => condicionado com alerta de autoridade instrucional (CA05)', async ({ app }) => {
  await cadastrar(app, { titulo: 'Ler wiki externa fictícia', dado: 'externo', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: 'Exercício.' });
  await expect(linha(app, 9)).toContainText('Condicionado');
  await expect(linha(app, 9)).toContainText('autoridade instrucional');
});

test('Teste 04 — HTML digitado é exibido como texto, nunca interpretado', async ({ app }) => {
  await cadastrar(app, { titulo: '<img src=x onerror="window.__xss=1">', dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: '<b>negrito</b>' });
  await expect(linha(app, 9)).toContainText('<img src=x');
  await expect(app.locator('#linhas img')).toHaveCount(0);
  expect(await app.evaluate(() => window.__xss)).toBeUndefined();
});

test('Teste 04 — remover todos: estado vazio persiste após F5; restaurar volta aos 8 exemplos', async ({ app }) => {
  await app.getByRole('button', { name: 'Remover todos' }).click();
  await expect(linhas(app)).toHaveCount(0);
  await expect(app.locator('#vazio')).toContainText('Nenhum cenário cadastrado');
  expect(await totais(app)).toEqual(['0', '0', '0']);
  await app.reload();
  await expect(linhas(app)).toHaveCount(0);
  await expect(app.locator('#vazio')).toContainText('Nenhum cenário cadastrado');
  await app.getByRole('button', { name: 'Restaurar 8 exemplos' }).click();
  await expect(linhas(app)).toHaveCount(8);
  expect(await totais(app)).toEqual(['2', '4', '2']);
});

test('Teste 04 — armazenamento corrompido não quebra a página: volta aos exemplos', async ({ app }) => {
  await app.evaluate(() => localStorage.setItem('govsafe360.cenarios.v1', '{isto nao e json'));
  await app.reload();
  await expect(linhas(app)).toHaveCount(8);
});
