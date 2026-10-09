import { test, expect, linha, totais, revisar } from './util.mjs';

test('Teste 05 — revisão exige justificativa e resultado (CA07, REQ05)', async ({ app }) => {
  await app.getByRole('button', { name: 'Registrar revisão simulada' }).click();
  await expect(app.locator('#erro-rev-cenario')).not.toBeEmpty();
  await revisar(app, { id: 3, resultado: 'aprovado', justificativa: '' });
  await expect(app.locator('#erro-rev-justificativa')).toContainText('obrigatória');
  await expect(linha(app, 3)).toContainText('Pendente');
  await expect(app.locator('#eventos tr')).toHaveCount(0);
});

test('Teste 05 — cenário condicionado pode ser aprovado; a decisão da política não muda', async ({ app }) => {
  await revisar(app, { id: 3, resultado: 'aprovado', justificativa: 'Revisão simulada concluída.' });
  await expect(app.locator('#status-rev')).toContainText('Revisão simulada registrada para o cenário #3');
  await expect(linha(app, 3)).toContainText('Aprovado (simulado)');
  await expect(linha(app, 3)).toContainText('Condicionado');
  expect(await totais(app)).toEqual(['2', '4', '2']);
  await expect(app.locator('#eventos tr').first()).toContainText('revisao_registrada');
  await app.reload();
  await expect(linha(app, 3)).toContainText('Aprovado (simulado)'); // persiste
});

test('Teste 05 — cenário NÃO AUTORIZADO não vira aprovado, mesmo forçando a opção (CA07)', async ({ app }) => {
  await app.getByLabel('Cenário', { exact: true }).selectOption('7');
  const aprovar = app.locator('#rev-resultado option[value="aprovado"]');
  await expect(aprovar).toBeDisabled();
  await expect(app.locator('#dica-rev')).toContainText('NÃO AUTORIZADO');
  // contorna a interface: reabilita a opção como um usuário mal-intencionado faria pelo DevTools
  await revisar(app, { id: 7, resultado: 'aprovado', justificativa: 'Tentando aprovar mesmo assim.', forcar: true });
  await expect(app.locator('#status-rev')).toContainText('Aprovação bloqueada');
  await expect(app.locator('#erro-rev-resultado')).toContainText('NÃO AUTORIZADO');
  await expect(linha(app, 7)).toContainText('Pendente');
  await expect(linha(app, 7)).toContainText('Não autorizado');
  await expect(app.locator('#eventos tr').first()).toContainText('revisao_bloqueada');
  expect(await totais(app)).toEqual(['2', '4', '2']);
});

test('Teste 05 — cenário não autorizado pode ser rejeitado', async ({ app }) => {
  await revisar(app, { id: 8, resultado: 'rejeitado', justificativa: 'Credencial não deve ser usada.' });
  await expect(linha(app, 8)).toContainText('Rejeitado (simulado)');
  await expect(linha(app, 8)).toContainText('Não autorizado');
});

test('Teste 05 — justificativa com segredo é recusada e não vai para o histórico', async ({ app }) => {
  await revisar(app, { id: 3, resultado: 'rejeitado', justificativa: 'token=ABCDEF123456' });
  await expect(app.locator('#erro-rev-justificativa')).toContainText('segredo');
  await expect(app.locator('#eventos tr')).toHaveCount(0);
  expect(await app.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain('ABCDEF123456');
});

test('Teste 05 — botão "Revisar" da linha seleciona o cenário e leva o foco ao formulário', async ({ app }) => {
  await app.getByRole('button', { name: 'Revisar cenário 5' }).click();
  await expect(app.getByLabel('Cenário', { exact: true })).toHaveValue('5');
  await expect(app.getByLabel('Resultado da revisão', { exact: true })).toBeFocused();
});
