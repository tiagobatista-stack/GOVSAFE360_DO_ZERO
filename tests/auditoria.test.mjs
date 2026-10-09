import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../js/politica.js';
import '../js/armazenamento.js';
import '../js/auditoria.js';

const { GovStore, GovAuditoria: A, GovPolitica } = globalThis;
const sementes = GovStore.semear(vm.runInNewContext(`${readFileSync(new URL('../js/dados.js', import.meta.url), 'utf8')}\n;({ CENARIOS })`).CENARIOS);
const porId = id => sementes.find(c => c.id === id);
const AGORA = '2026-10-09T12:00:00.000Z';
const rev = (id, resultado, justificativa, revisoes = {}, eventos = []) =>
  A.revisar({ item: porId(id), revisoes, eventos, resultado, justificativa, agora: AGORA });
const storageFalso = (inicial = {}) => {
  const m = new Map(Object.entries(inicial));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m };
};
// Lê um CSV em que todos os campos vêm entre aspas, respeitando "" e quebras de linha dentro de aspas.
function lerCsv(texto) {
  const t = texto.replace(/^﻿/, '');
  const linhas = [];
  let linha = [], cel = '', aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { cel += '"'; i++; } else if (ch === '"') aspas = false; else cel += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') { linha.push(cel); cel = ''; }
    else if (ch === '\r' && t[i + 1] === '\n') { linha.push(cel); linhas.push(linha); linha = []; cel = ''; i++; }
    else cel += ch;
  }
  return linhas;
}

test('revisão exige justificativa e resultado válido', () => {
  for (const j of ['', '   ', undefined, null]) {
    const r = rev(1, 'aprovado', j);
    assert.equal(r.ok, false);
    assert.ok(r.erros.justificativa);
    assert.deepEqual(r.revisoes, {});
    assert.equal(r.eventos.length, 0);
  }
  assert.ok(rev(1, '', 'ok').erros.resultado);
  assert.ok(rev(1, 'talvez', 'ok').erros.resultado);
  assert.ok(rev(1, 'aprovado', 'x'.repeat(301)).erros.justificativa);
});

test('CA07: cenário NÃO AUTORIZADO não pode ser aprovado, mesmo com justificativa; a tentativa é auditada', () => {
  for (const id of [7, 8]) {
    assert.equal(GovPolitica.classificar(porId(id)).decisao, 'nao_autorizado');
    const r = rev(id, 'aprovado', 'Justificativa completa e válida.');
    assert.equal(r.ok, false);
    assert.equal(r.bloqueado, true);
    assert.deepEqual(r.revisoes, {});
    assert.equal(r.eventos.length, 1);
    assert.equal(r.eventos[0].tipo, 'revisao_bloqueada');
    assert.equal(r.eventos[0].cenario_id, id);
    assert.doesNotMatch(r.eventos[0].resumo, /Justificativa completa/);
  }
});

test('NÃO AUTORIZADO pode ser rejeitado; condicionado e permitido podem ser aprovados', () => {
  const rejeitado = rev(8, 'rejeitado', 'Credencial não deve ser usada.');
  assert.equal(rejeitado.ok, true);
  assert.equal(A.estado(porId(8), rejeitado.revisoes), 'rejeitado');
  assert.equal(rev(3, 'aprovado', 'Revisão simulada concluída.').ok, true);
  assert.equal(rev(1, 'aprovado', 'Ok para exercício.').ok, true);
});

test('a revisão não altera a decisão da política e o registro é auditado com data', () => {
  const antes = GovPolitica.classificar(porId(3));
  const r = rev(3, 'aprovado', 'Revisão simulada concluída.');
  assert.deepEqual(GovPolitica.classificar(porId(3)), antes);
  assert.equal(r.revisoes[3].data, AGORA);
  assert.equal(r.eventos[0].tipo, 'revisao_registrada');
  assert.equal(r.eventos[0].data, AGORA);
  assert.match(r.eventos[0].resumo, /inalterada: Condicionado \(R4\)/);
});

test('entradas não são mutadas; nova revisão substitui a anterior e ambas ficam no histórico', () => {
  const rv = Object.freeze({});
  const ev = Object.freeze([]);
  const a = A.revisar({ item: porId(3), revisoes: rv, eventos: ev, resultado: 'rejeitado', justificativa: 'Primeiro parecer.', agora: AGORA });
  const b = A.revisar({ item: porId(3), revisoes: a.revisoes, eventos: a.eventos, resultado: 'aprovado', justificativa: 'Segundo parecer.', agora: AGORA });
  assert.equal(A.estado(porId(3), b.revisoes), 'aprovado');
  assert.deepEqual(b.eventos.map(e => e.seq), [1, 2]);
  assert.equal(rv[3], undefined);
});

test('storage adulterado: "aprovado" para cenário não autorizado é ignorado', () => {
  const forjado = { 7: { resultado: 'aprovado', justificativa: 'forjado', data: AGORA } };
  assert.equal(A.estado(porId(7), forjado), 'pendente');
  const linha = lerCsv(A.csvMatriz([porId(7)], forjado))[1];
  assert.equal(linha[A.COLUNAS.indexOf('revisao_humana')], 'pendente');
  assert.equal(linha[A.COLUNAS.indexOf('revisao_justificativa')], '');
});

test('texto com segredo ou CPF é recusado (cadastro e revisão) e não é ecoado', () => {
  const ruins = ['senha: abc123', 'token=xyz', 'Authorization Bearer abcdefghijkl123', 'sk-abcdefghijklmnop1234', 'CPF 123.456.789-09',
    'cpf 12345678909', '-----BEGIN RSA PRIVATE KEY-----', 'a'.repeat(45), 'api_key: 99'];
  for (const t of ruins) {
    assert.equal(GovStore.contemSegredo(t), true, t);
    const r = rev(3, 'rejeitado', t);
    assert.equal(r.ok, false, t);
    assert.ok(!JSON.stringify(r.eventos).includes(t));
    assert.ok(GovStore.validarEntrada({ titulo: t, dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: 'ok' }).erros.titulo, t);
  }
  for (const c of sementes) assert.equal(GovStore.contemSegredo(`${c.titulo} ${c.justificativa}`), false, c.titulo);
  assert.equal(GovStore.contemSegredo('Revisão simulada: a chave de acesso não foi usada.'), false);
});

test('eventos: seq incremental, data informada, persistência e recuperação de storage corrompido', () => {
  let ev = A.registrar([], 'cenario_cadastrado', 'um', AGORA, 9);
  ev = A.registrar(ev, 'cenarios_removidos', 'dois', AGORA);
  assert.deepEqual(ev.map(e => e.seq), [1, 2]);
  assert.equal(ev[0].cenario_id, 9);
  const st = storageFalso();
  assert.equal(A.salvarEventos(st, ev), true);
  assert.deepEqual(A.carregarEventos(st), ev);
  assert.deepEqual(A.carregarEventos(storageFalso({ [A.CH_AUDITORIA]: '{ruim' })), []);
  assert.deepEqual(A.carregarEventos(storageFalso({ [A.CH_AUDITORIA]: '[{"seq":"1"}]' })), []);
  assert.deepEqual(A.carregarRevisoes(storageFalso({ [A.CH_REVISOES]: '[1]' })), {});
  assert.deepEqual(A.carregarRevisoes(storageFalso({ [A.CH_REVISOES]: '{"1":{"resultado":"ok"}}' })), {});
  const r = rev(3, 'aprovado', 'Persistir revisão.');
  A.salvarRevisoes(st, r.revisoes);
  assert.deepEqual(A.carregarRevisoes(st), r.revisoes);
  const quebrado = { getItem() { throw new Error('x'); }, setItem() { throw new Error('y'); } };
  assert.equal(A.salvarEventos(quebrado, ev), false);
  assert.deepEqual(A.carregarEventos(quebrado), []);
});

test('CA08 CSV: cabeçalho, uma linha por cenário, BOM, CRLF e colunas corretas', () => {
  const r = rev(3, 'aprovado', 'Revisão simulada concluída.');
  const csv = A.csvMatriz(sementes, r.revisoes);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.endsWith('\r\n'));
  const linhas = lerCsv(csv);
  assert.equal(linhas.length, 9);
  assert.deepEqual(linhas[0], A.COLUNAS);
  assert.ok(linhas.every(l => l.length === A.COLUNAS.length));
  const col = n => A.COLUNAS.indexOf(n);
  const l7 = linhas.find(l => l[0] === '7');
  assert.equal(l7[col('decisao')], 'nao_autorizado');
  assert.equal(l7[col('regra')], 'R1');
  assert.equal(l7[col('revisao_humana')], 'pendente');
  const l3 = linhas.find(l => l[0] === '3');
  assert.equal(l3[col('revisao_humana')], 'aprovado');
  assert.equal(l3[col('revisao_justificativa')], 'Revisão simulada concluída.');
  assert.equal(l3[col('revisao_data')], AGORA);
  assert.equal(linhas.find(l => l[0] === '4')[col('alertas')].includes('autoridade instrucional'), true);
});

test('CSV: escapa aspas, vírgulas e quebras de linha e neutraliza fórmulas', () => {
  const itens = [
    { id: 1, titulo: 'Com "aspas", vírgula\ne quebra', dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: '=SOMA(A1:A2)' },
    { id: 2, titulo: '+cmd|calc', dado: 'interno', ambiente: 'homologacao', autonomia: 'edicao', justificativa: '@x' }
  ];
  const linhas = lerCsv(A.csvMatriz(itens, {}));
  assert.equal(linhas.length, 3);
  assert.equal(linhas[1][1], 'Com "aspas", vírgula\ne quebra');
  assert.equal(linhas[1][9], "'=SOMA(A1:A2)");
  assert.equal(linhas[2][1], "'+cmd|calc");
  assert.equal(linhas[2][9], "'@x");
});

test('CSV sem cenários: só o cabeçalho', () => {
  assert.equal(lerCsv(A.csvMatriz([], {})).length, 1);
});

test('CA08 JSON de auditoria: válido, com aviso, total e eventos', () => {
  let ev = rev(3, 'aprovado', 'Revisão simulada concluída.').eventos;
  ev = rev(7, 'aprovado', 'Tentativa indevida.', {}, ev).eventos;
  const obj = JSON.parse(A.jsonAuditoria(ev, AGORA));
  assert.equal(obj.versao_esquema, 1);
  assert.equal(obj.gerado_em, AGORA);
  assert.match(obj.aviso, /fictícios/);
  assert.match(obj.sistema, /não homologado/);
  assert.equal(obj.total_eventos, 2);
  assert.deepEqual(obj.eventos.map(e => e.tipo), ['revisao_registrada', 'revisao_bloqueada']);
  assert.deepEqual(JSON.parse(A.jsonAuditoria([], AGORA)).eventos, []);
});
