import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../js/politica.js'; // define globalThis.GovPolitica

const { classificar, DECISOES, TAXONOMIA } = globalThis.GovPolitica;
const { PERMITIDO, CONDICIONADO, NAO_AUTORIZADO } = DECISOES;
const c = (dado, ambiente, autonomia, extra = {}) => classificar({ dado, ambiente, autonomia, ...extra });

test('dados públicos: só desenvolvimento + leitura/proposta é permitido (R5)', () => {
  assert.equal(c('publico', 'desenvolvimento', 'leitura').decisao, PERMITIDO);
  assert.equal(c('publico', 'desenvolvimento', 'proposta').decisao, PERMITIDO);
  assert.equal(c('publico', 'desenvolvimento', 'proposta').regra, 'R5');
  // fora desse recorte, público deixa de ser permitido
  assert.equal(c('publico', 'desenvolvimento', 'edicao').decisao, CONDICIONADO);
  assert.equal(c('publico', 'desenvolvimento', 'execucao').decisao, CONDICIONADO);
  assert.equal(c('publico', 'homologacao', 'leitura').decisao, CONDICIONADO);
  assert.equal(c('publico', 'producao', 'leitura').decisao, CONDICIONADO);
});

test('credencial e dado pessoal: sempre não autorizado (R1)', () => {
  for (const dado of ['credencial', 'pessoal']) {
    for (const ambiente of TAXONOMIA.ambientes) {
      for (const autonomia of TAXONOMIA.autonomias) {
        const r = c(dado, ambiente, autonomia);
        assert.equal(r.decisao, NAO_AUTORIZADO, `${dado}/${ambiente}/${autonomia}`);
        assert.equal(r.regra, 'R1');
      }
    }
  }
});

test('autonomia crítica: sempre não autorizado, até com dado público (R1)', () => {
  for (const dado of TAXONOMIA.dados) {
    for (const ambiente of TAXONOMIA.ambientes) {
      assert.equal(c(dado, ambiente, 'critica').decisao, NAO_AUTORIZADO, `${dado}/${ambiente}`);
    }
  }
});

test('produção: edição/execução não autorizadas (R2); leitura/proposta condicionadas (R3)', () => {
  for (const dado of ['publico', 'interno', 'externo']) {
    assert.equal(c(dado, 'producao', 'edicao').decisao, NAO_AUTORIZADO);
    assert.equal(c(dado, 'producao', 'execucao').decisao, NAO_AUTORIZADO);
    assert.equal(c(dado, 'producao', 'leitura').decisao, CONDICIONADO);
    assert.equal(c(dado, 'producao', 'proposta').decisao, CONDICIONADO);
  }
  assert.equal(c('interno', 'producao', 'execucao').regra, 'R2');
  assert.equal(c('interno', 'producao', 'proposta').regra, 'R3');
});

test('conteúdo externo: condicionado e com alerta de ausência de autoridade instrucional', () => {
  const r = c('externo', 'desenvolvimento', 'leitura');
  assert.equal(r.decisao, CONDICIONADO);
  assert.equal(r.regra, 'R4');
  assert.match(r.alertas[0], /autoridade instrucional/);
  assert.deepEqual(c('interno', 'desenvolvimento', 'leitura').alertas, []);
  // o alerta acompanha o dado externo mesmo quando a regra é mais estrita
  assert.equal(c('externo', 'producao', 'execucao').decisao, NAO_AUTORIZADO);
  assert.equal(c('externo', 'producao', 'execucao').alertas.length, 1);
});

test('aprovação humana NÃO altera a classificação', () => {
  for (const dado of TAXONOMIA.dados) {
    for (const ambiente of TAXONOMIA.ambientes) {
      for (const autonomia of TAXONOMIA.autonomias) {
        const sem = c(dado, ambiente, autonomia);
        for (const aprovacao_humana of [true, false, 'sim']) {
          assert.deepEqual(c(dado, ambiente, autonomia, { aprovacao_humana }), sem);
        }
      }
    }
  }
});

test('entrada inválida nunca vira permitido', () => {
  const invalidas = [undefined, null, {}, { dado: 'publico' }, { dado: 'x', ambiente: 'desenvolvimento', autonomia: 'leitura' },
    { dado: 'publico', ambiente: 'nuvem', autonomia: 'leitura' }, { dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'tudo' },
    { dado: 'PUBLICO', ambiente: 'desenvolvimento', autonomia: 'leitura' }];
  for (const entrada of invalidas) {
    const r = classificar(entrada);
    assert.equal(r.decisao, NAO_AUTORIZADO, JSON.stringify(entrada));
    assert.equal(r.regra, 'R0');
  }
});

test('função pura: determinística, sem mutar a entrada, resultado imutável', () => {
  const entrada = Object.freeze({ dado: 'interno', ambiente: 'homologacao', autonomia: 'edicao' });
  assert.deepEqual(classificar(entrada), classificar(entrada));
  const r = classificar(entrada);
  assert.throws(() => { 'use strict'; r.decisao = PERMITIDO; }, TypeError);
});

test('cobertura total: as 75 combinações da taxonomia têm decisão válida e regra', () => {
  let n = 0;
  for (const dado of TAXONOMIA.dados) for (const ambiente of TAXONOMIA.ambientes) for (const autonomia of TAXONOMIA.autonomias) {
    const r = c(dado, ambiente, autonomia);
    assert.ok(Object.values(DECISOES).includes(r.decisao));
    assert.match(r.regra, /^R[1-5]$/);
    n++;
  }
  assert.equal(n, 75);
});

test('paridade: os 8 cenários fictícios de js/dados.js batem com a política', () => {
  const origem = readFileSync(new URL('../js/dados.js', import.meta.url), 'utf8');
  const { CENARIOS } = vm.runInNewContext(`${origem}\n;({ CENARIOS })`);
  const ascii = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  assert.equal(CENARIOS.length, 8);
  for (const s of CENARIOS) {
    const r = c(ascii(s.dado), ascii(s.ambiente), ascii(s.autonomia));
    assert.equal(r.decisao, s.decisao, `cenário ${s.id}: ${s.titulo}`);
  }
});

test('catálogo REGRAS: toda regra aplicada existe no catálogo, com a mesma decisão, e a ordem de precedência é R0..R3, R5, R4', () => {
  const { REGRAS } = globalThis.GovPolitica;
  assert.deepEqual(REGRAS.map(r => r.id), ['R0', 'R1', 'R2', 'R3', 'R5', 'R4']);
  assert.throws(() => { 'use strict'; REGRAS.push({}); }, TypeError);
  const usadas = new Set();
  for (const dado of TAXONOMIA.dados) for (const ambiente of TAXONOMIA.ambientes) for (const autonomia of TAXONOMIA.autonomias) {
    const r = c(dado, ambiente, autonomia);
    const catalogada = REGRAS.find(x => x.id === r.regra);
    assert.ok(catalogada, r.regra);
    assert.equal(catalogada.decisao, r.decisao, `${dado}/${ambiente}/${autonomia}`);
    usadas.add(r.regra);
  }
  assert.deepEqual([...usadas].sort(), ['R1', 'R2', 'R3', 'R4', 'R5']); // R0 só ocorre com entrada inválida
});
