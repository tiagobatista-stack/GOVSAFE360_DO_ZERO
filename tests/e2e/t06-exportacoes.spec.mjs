import { test, expect, revisar, lerArquivo } from './util.mjs';

test('Teste 06 — CSV da matriz: cabeçalhos, 8 linhas, revisão refletida (CA08, REQ06)', async ({ app }) => {
  await revisar(app, { id: 3, resultado: 'aprovado', justificativa: 'Revisão simulada concluída.' });
  await revisar(app, { id: 7, resultado: 'rejeitado', justificativa: 'Ação crítica não deve ser delegada.' });
  const [download] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Exportar matriz (CSV)' }).click()]);
  expect(download.suggestedFilename()).toBe('govsafe360-matriz.csv');
  const bytes = await lerArquivo(download);
  expect([...bytes.subarray(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]); // BOM UTF-8 para o Excel
  const linhas = bytes.toString('utf8').replace(/^﻿/, '').trim().split('\r\n');
  expect(linhas).toHaveLength(9);
  expect(linhas[0]).toBe('"id","finalidade","tipo_dado","ambiente","autonomia","decisao","regra","motivo","alertas","justificativa","revisao_humana","revisao_justificativa","revisao_data"');
  expect(linhas[3]).toMatch(/^"3",.*"condicionado","R4".*"aprovado","Revisão simulada concluída\.",/);
  expect(linhas[7]).toMatch(/^"7",.*"nao_autorizado","R1".*"rejeitado",/);
  expect(linhas[8]).toMatch(/^"8",.*"nao_autorizado","R1".*"pendente","",""$/);
  await expect(app.locator('#status-export')).toContainText('CSV gerado com 8 cenário(s)');
});

test('Teste 06 — JSON de auditoria: eventos com data, aviso e total (CA08)', async ({ app }) => {
  await revisar(app, { id: 3, resultado: 'aprovado', justificativa: 'Revisão simulada concluída.' });
  await revisar(app, { id: 7, resultado: 'aprovado', justificativa: 'Tentativa indevida.', forcar: true });
  const [download] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Exportar auditoria (JSON)' }).click()]);
  expect(download.suggestedFilename()).toBe('govsafe360-auditoria.json');
  const obj = JSON.parse((await lerArquivo(download)).toString('utf8'));
  expect(obj.versao_esquema).toBe(1);
  expect(obj.aviso).toMatch(/fictícios/);
  expect(obj.sistema).toMatch(/não homologado/);
  expect(obj.total_eventos).toBe(obj.eventos.length);
  expect(obj.eventos.map(e => e.tipo)).toEqual(['revisao_registrada', 'revisao_bloqueada', 'exportacao_json']);
  expect(obj.eventos.map(e => e.seq)).toEqual([1, 2, 3]);
  for (const e of obj.eventos) expect(Number.isNaN(Date.parse(e.data))).toBe(false);
});

test('Teste 06 — exportar sem cenários gera CSV só com cabeçalho; histórico vazio gera JSON válido', async ({ app }) => {
  await app.getByRole('button', { name: 'Remover todos' }).click();
  const [csv] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Exportar matriz (CSV)' }).click()]);
  expect((await lerArquivo(csv)).toString('utf8').replace(/^﻿/, '').trim().split('\r\n')).toHaveLength(1);
  const [json] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Exportar auditoria (JSON)' }).click()]);
  const obj = JSON.parse((await lerArquivo(json)).toString('utf8'));
  expect(obj.eventos.map(e => e.tipo)).toEqual(['cenarios_removidos', 'exportacao_csv', 'exportacao_json']);
});

test('Teste 06 — CSV neutraliza fórmulas (injeção em planilha)', async ({ app }) => {
  await app.getByLabel('Finalidade', { exact: true }).fill('=HYPERLINK("http://exemplo.invalido")');
  await app.getByLabel('Tipo de dado', { exact: true }).selectOption('publico');
  await app.getByLabel('Ambiente', { exact: true }).selectOption('desenvolvimento');
  await app.getByLabel('Autonomia', { exact: true }).selectOption('leitura');
  await app.getByLabel('Justificativa', { exact: true }).fill('Exercício.');
  await app.getByRole('button', { name: 'Cadastrar cenário' }).click();
  const [download] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Exportar matriz (CSV)' }).click()]);
  const texto = (await lerArquivo(download)).toString('utf8');
  expect(texto).toContain('"\'=HYPERLINK(');
  expect(texto).not.toMatch(/,"=HYPERLINK/);
});
