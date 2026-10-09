import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import '../js/politica.js';

const { classificar, REGRAS, TAXONOMIA } = globalThis.GovPolitica;
const SERVIDOR = new URL('../tools/govsafe-mcp.mjs', import.meta.url);

let proc, proximoId = 1;
const linhasStdout = [];
const pendentes = new Map();
let stderr = '';

before(() => {
  proc = spawn(process.execPath, [fileURLToPath(SERVIDOR)], { stdio: ['pipe', 'pipe', 'pipe'] });
  proc.stderr.on('data', d => { stderr += d; });
  createInterface({ input: proc.stdout }).on('line', l => {
    linhasStdout.push(l);
    const m = JSON.parse(l); // qualquer linha em stdout PRECISA ser JSON válido
    const espera = pendentes.get(m.id);
    if (espera) { pendentes.delete(m.id); espera(m); }
  });
});
after(() => proc.kill());

const enviarBruto = texto => proc.stdin.write(`${texto}\n`);
function rpc(method, params, id = proximoId++) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout em ${method}`)), 5000);
    pendentes.set(id, m => { clearTimeout(t); resolve(m); });
    enviarBruto(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }));
  });
}
const chamar = (name, args) => rpc('tools/call', { name, arguments: args }).then(m => m.result);
const classif = (dado, ambiente, autonomia, extra = {}) => chamar('classificar_cenario', { dado, ambiente, autonomia, ...extra });

test('initialize: negocia versão, anuncia tools e avisa que é didático', async () => {
  const m = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '0' } });
  assert.equal(m.result.protocolVersion, '2025-06-18');
  assert.deepEqual(m.result.capabilities, { tools: {} });
  assert.equal(m.result.serverInfo.name, 'govsafe360-mcp');
  assert.match(m.result.instructions, /não é autorização institucional/);
  const velho = await rpc('initialize', { protocolVersion: '2024-11-05' });
  assert.equal(velho.result.protocolVersion, '2024-11-05');
  const desconhecido = await rpc('initialize', { protocolVersion: '1999-01-01' });
  assert.equal(desconhecido.result.protocolVersion, '2025-06-18');
});

test('notificação não recebe resposta; ping responde', async () => {
  const antes = linhasStdout.length;
  enviarBruto(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  const p = await rpc('ping');
  assert.deepEqual(p.result, {});
  assert.equal(linhasStdout.length, antes + 1); // só a resposta do ping
});

test('tools/list: 3 ferramentas, somente leitura, com schema', async () => {
  const { result } = await rpc('tools/list');
  assert.deepEqual(result.tools.map(t => t.name), ['listar_regras', 'classificar_cenario', 'listar_cenarios_exemplo']);
  for (const t of result.tools) {
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.annotations.destructiveHint, false);
    assert.equal(t.annotations.openWorldHint, false);
  }
  const c = result.tools.find(t => t.name === 'classificar_cenario');
  assert.deepEqual(c.inputSchema.required, ['dado', 'ambiente', 'autonomia']);
  assert.deepEqual(c.inputSchema.properties.dado.enum, TAXONOMIA.dados);
});

test('classificar: dado público em desenvolvimento/leitura => permitido (R5)', async () => {
  const r = await classif('publico', 'desenvolvimento', 'leitura');
  assert.equal(r.isError, undefined);
  assert.equal(r.structuredContent.decisao, 'permitido');
  assert.equal(r.structuredContent.regra, 'R5');
  assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
  assert.match(r.structuredContent.aviso, /não é autorização institucional/);
});

test('classificar: credencial => não autorizado (R1)', async () => {
  const r = await classif('credencial', 'desenvolvimento', 'leitura');
  assert.equal(r.structuredContent.decisao, 'nao_autorizado');
  assert.equal(r.structuredContent.regra, 'R1');
});

test('classificar: produção => condicionado (R3) ou não autorizado (R2)', async () => {
  assert.equal((await classif('interno', 'producao', 'proposta')).structuredContent.decisao, 'condicionado');
  const r = await classif('interno', 'producao', 'execucao');
  assert.equal(r.structuredContent.decisao, 'nao_autorizado');
  assert.equal(r.structuredContent.regra, 'R2');
});

test('classificar: conteúdo externo => condicionado com alerta de autoridade instrucional', async () => {
  const r = await classif('externo', 'desenvolvimento', 'leitura');
  assert.equal(r.structuredContent.decisao, 'condicionado');
  assert.match(r.structuredContent.alertas[0], /autoridade instrucional/);
});

test('aprovacao_humana é informativa e NÃO altera o resultado', async () => {
  // Casos em que uma aprovação "considerada" mudaria a decisão (só R1 os bloqueia; sem R2/R3 por trás).
  const casos = [['credencial', 'desenvolvimento', 'leitura', 'nao_autorizado'], ['pessoal', 'desenvolvimento', 'proposta', 'nao_autorizado'],
    ['publico', 'desenvolvimento', 'critica', 'nao_autorizado'], ['interno', 'homologacao', 'edicao', 'condicionado']];
  for (const [dado, ambiente, autonomia, esperada] of casos) {
    for (const aprovacao_humana of [true, false]) {
      const r = await classif(dado, ambiente, autonomia, { aprovacao_humana });
      assert.equal(r.structuredContent.decisao, esperada, `${dado}/${ambiente}/${autonomia} aprovacao=${aprovacao_humana}`);
      assert.equal(r.structuredContent.aprovacao_humana_informada, true);
      assert.equal(r.structuredContent.aprovacao_humana_alterou_resultado, false);
    }
  }
  assert.equal((await classif('publico', 'desenvolvimento', 'leitura')).structuredContent.aprovacao_humana_informada, false);
});

test('paridade: as 75 combinações do MCP coincidem com a política do navegador', async () => {
  let n = 0;
  for (const dado of TAXONOMIA.dados) for (const ambiente of TAXONOMIA.ambientes) for (const autonomia of TAXONOMIA.autonomias) {
    const esperado = classificar({ dado, ambiente, autonomia });
    const r = (await classif(dado, ambiente, autonomia)).structuredContent;
    assert.equal(r.decisao, esperado.decisao, `${dado}/${ambiente}/${autonomia}`);
    assert.equal(r.regra, esperado.regra);
    n++;
  }
  assert.equal(n, 75);
});

test('entrada inválida: erro de ferramenta, nunca "permitido"', async () => {
  const invalidas = [{}, { dado: 'publico' }, { dado: 'x', ambiente: 'desenvolvimento', autonomia: 'leitura' },
    { dado: 'PUBLICO', ambiente: 'desenvolvimento', autonomia: 'leitura' }, { dado: 1, ambiente: 2, autonomia: 3 }];
  for (const args of invalidas) {
    const r = await chamar('classificar_cenario', args);
    assert.equal(r.isError, true, JSON.stringify(args));
    assert.equal(r.structuredContent.decisao, 'nao_autorizado');
    assert.equal(r.structuredContent.regra, 'R0');
  }
  for (const args of [undefined, null, 'texto', [1]]) {
    const r = await chamar('classificar_cenario', args);
    assert.equal(r.isError, true);
    assert.equal(r.structuredContent.decisao, 'nao_autorizado');
  }
});

test('listar_regras: catálogo em ordem de precedência, coerente com a política', async () => {
  const r = (await chamar('listar_regras', {})).structuredContent;
  assert.deepEqual(r.regras_em_ordem_de_precedencia, JSON.parse(JSON.stringify(REGRAS)));
  assert.deepEqual(r.regras_em_ordem_de_precedencia.map(x => x.id), ['R0', 'R1', 'R2', 'R3', 'R5', 'R4']);
  assert.deepEqual(r.taxonomia, JSON.parse(JSON.stringify(TAXONOMIA)));
});

test('listar_cenarios_exemplo: 8 cenários, totais 2/4/2', async () => {
  const { cenarios } = (await chamar('listar_cenarios_exemplo', {})).structuredContent;
  assert.equal(cenarios.length, 8);
  const tot = d => cenarios.filter(c => c.decisao === d).length;
  assert.deepEqual([tot('permitido'), tot('condicionado'), tot('nao_autorizado')], [2, 4, 2]);
  assert.equal(cenarios.find(c => c.id === 8).dado, 'credencial');
});

test('erros de protocolo: método, ferramenta e parâmetros', async () => {
  const m1 = await rpc('metodo/inexistente');
  assert.equal(m1.error.code, -32601);
  assert.equal((await rpc('tools/call', { name: 'apagar_tudo', arguments: {} })).error.code, -32602);
  assert.equal((await rpc('tools/call', {})).error.code, -32602);
  assert.equal((await rpc('tools/call')).error.code, -32602);
});

test('erros de formato: JSON inválido, requisição inválida e lote; servidor segue vivo', async () => {
  const esperaErro = (id = null) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`sem resposta para id=${id}`)), 3000);
    pendentes.set(id, m => { clearTimeout(t); res(m); });
  });
  let p = esperaErro(); enviarBruto('{isto não é json');
  assert.equal((await p).error.code, -32700);
  p = esperaErro(5); enviarBruto(JSON.stringify({ jsonrpc: '1.0', id: 5, method: 'ping' })); // id conhecido é devolvido
  assert.equal((await p).error.code, -32600);
  p = esperaErro(); enviarBruto(JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }]));
  assert.equal((await p).error.code, -32600);
  p = esperaErro(); enviarBruto('x'.repeat(100_001));
  assert.equal((await p).error.code, -32600);
  assert.deepEqual((await rpc('ping')).result, {});
});

test('stdout só tem JSON-RPC válido; diagnóstico vai para stderr; sem erros internos', () => {
  assert.ok(linhasStdout.length > 20);
  for (const l of linhasStdout) assert.equal(JSON.parse(l).jsonrpc, '2.0');
  assert.match(stderr, /govsafe360-mcp .* pronto/);
  assert.doesNotMatch(stderr, /erro interno/);
});
