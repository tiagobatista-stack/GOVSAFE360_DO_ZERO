import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../js/politica.js';
import '../js/armazenamento.js';

const { GovStore } = globalThis;
const lerDados = () => vm.runInNewContext(`${readFileSync(new URL('../js/dados.js', import.meta.url), 'utf8')}\n;({ CENARIOS })`).CENARIOS;
const sementes = GovStore.semear(lerDados());
const storageFalso = (inicial = {}) => {
  const m = new Map(Object.entries(inicial));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m };
};
const entrada = (extra = {}) => ({ titulo: 'Teste fictício', dado: 'publico', ambiente: 'desenvolvimento', autonomia: 'leitura', justificativa: 'Exemplo.', ...extra });

test('sementes: 8 cenários na taxonomia da política, totais 2/4/2', () => {
  assert.equal(sementes.length, 8);
  assert.deepEqual(GovStore.resumir(sementes), { permitido: 2, condicionado: 4, nao_autorizado: 2 });
});

test('estado inicial: sem chave => sementes; com chave vazia => lista vazia respeitada', () => {
  assert.equal(GovStore.carregar(storageFalso(), sementes).origem, 'sementes');
  const vazio = GovStore.carregar(storageFalso({ [GovStore.CHAVE]: '[]' }), sementes);
  assert.deepEqual(vazio.itens, []);
  assert.equal(vazio.origem, 'armazenamento');
});

test('persistência: salvar e recarregar (simula F5) devolve os mesmos itens', () => {
  const st = storageFalso();
  const r = GovStore.adicionar(sementes, entrada({ titulo: 'Novo cenário persistente' }));
  assert.equal(GovStore.salvar(st, r.itens), true);
  const apos = GovStore.carregar(st, sementes);
  assert.equal(apos.origem, 'armazenamento');
  assert.equal(apos.itens.length, 9);
  assert.equal(apos.itens.at(-1).titulo, 'Novo cenário persistente');
});

test('armazenamento corrompido ou adulterado => volta às sementes', () => {
  for (const bruto of ['{nao-json', '{"a":1}', '[{"id":1}]', '[{"id":1,"titulo":"x","dado":"publico","ambiente":"desenvolvimento","autonomia":"tudo","justificativa":"y"}]']) {
    const r = GovStore.carregar(storageFalso({ [GovStore.CHAVE]: bruto }), sementes);
    assert.equal(r.origem, 'sementes', bruto);
  }
});

test('storage indisponível: carregar cai nas sementes e salvar devolve false sem lançar', () => {
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('cheio'); } };
  assert.equal(GovStore.carregar(quebrado, sementes).origem, 'sementes');
  assert.equal(GovStore.salvar(quebrado, sementes), false);
});

test('adicionar valida campos obrigatórios e não muta a lista original', () => {
  const antes = JSON.stringify(sementes);
  const r = GovStore.adicionar(sementes, { titulo: '  ', dado: '', ambiente: 'nuvem', autonomia: '', justificativa: '' });
  assert.deepEqual(Object.keys(r.erros).sort(), ['ambiente', 'autonomia', 'dado', 'justificativa', 'titulo']);
  assert.equal(r.itens, undefined);
  assert.equal(JSON.stringify(sementes), antes);
  const ok = GovStore.adicionar(sementes, entrada({ titulo: '  espaços  ' }));
  assert.equal(ok.novo.titulo, 'espaços');
  assert.equal(sementes.length, 8);
});

test('limites de tamanho e ids nunca reutilizados', () => {
  assert.ok(GovStore.adicionar(sementes, entrada({ titulo: 'x'.repeat(101) })).erros.titulo);
  assert.ok(GovStore.adicionar(sementes, entrada({ justificativa: 'x'.repeat(301) })).erros.justificativa);
  const a = GovStore.adicionar(sementes, entrada());
  const semUltimo = a.itens.filter(c => c.id !== a.novo.id);
  assert.equal(a.novo.id, 9);
  assert.equal(GovStore.adicionar(a.itens, entrada()).novo.id, 10);
  assert.equal(GovStore.adicionar([], entrada()).novo.id, 1);
  assert.equal(semUltimo.length, 8);
});

test('política aplicada ao cadastro: credencial, produção e externo', () => {
  const dec = campos => globalThis.GovPolitica.classificar(GovStore.adicionar([], entrada(campos)).novo);
  assert.equal(dec({ dado: 'credencial' }).decisao, 'nao_autorizado');
  assert.equal(dec({ dado: 'interno', ambiente: 'producao', autonomia: 'execucao' }).decisao, 'nao_autorizado');
  assert.equal(dec({ dado: 'interno', ambiente: 'producao', autonomia: 'proposta' }).decisao, 'condicionado');
  const ext = dec({ dado: 'externo' });
  assert.equal(ext.decisao, 'condicionado');
  assert.equal(ext.alertas.length, 1);
});

test('filtro por decisão e busca (sem diferenciar acento/caixa); estado vazio', () => {
  assert.equal(GovStore.filtrar(sementes, { decisao: 'nao_autorizado' }).length, 2);
  assert.equal(GovStore.filtrar(sementes, { decisao: 'permitido' }).length, 2);
  assert.equal(GovStore.filtrar(sementes, { texto: 'NORMA PUBLICA' }).length, 1);
  assert.equal(GovStore.filtrar(sementes, { texto: 'configuracao' }).length, 1);
  assert.equal(GovStore.filtrar(sementes, { texto: 'configuração', decisao: 'permitido' }).length, 0);
  assert.equal(GovStore.filtrar(sementes, {}).length, 8);
  assert.equal(GovStore.filtrar([], { texto: 'a' }).length, 0);
});

test('a decisão não é persistida: adulterar o storage não muda a classificação', () => {
  const st = storageFalso();
  GovStore.salvar(st, GovStore.adicionar([], entrada({ dado: 'credencial' })).itens);
  assert.ok(!/nao_autorizado|decisao/.test(st.m.get(GovStore.CHAVE)));
  const { itens } = GovStore.carregar(st, sementes);
  assert.equal(GovStore.resumir(itens).nao_autorizado, 1);
});
