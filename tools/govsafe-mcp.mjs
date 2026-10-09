#!/usr/bin/env node
// Marco 5: servidor MCP local (stdio, JSON-RPC 2.0 delimitado por linhas), sem dependências.
// Ferramentas SOMENTE DE CONSULTA e didáticas: sem rede, sem escrita em disco, sem shell.
// A decisão vem de js/politica.js (política única); `aprovacao_humana` é aceito e IGNORADO.
// stdout carrega só mensagens do protocolo; diagnósticos vão para stderr.
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../js/politica.js'; // define globalThis.GovPolitica

const { classificar, REGRAS, TAXONOMIA } = globalThis.GovPolitica;
const SERVER_INFO = { name: 'govsafe360-mcp', version: '0.5.0' };
const VERSOES = ['2025-06-18', '2025-03-26', '2024-11-05'];
const AVISO = 'Classificação didática com dados fictícios; não é autorização institucional nem sistema homologado.';
const MAX_LINHA = 100_000;

const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const lerExemplos = () => {
  const origem = readFileSync(new URL('../js/dados.js', import.meta.url), 'utf8');
  return vm.runInNewContext(`${origem}\n;({ CENARIOS })`).CENARIOS.map(c => {
    const entrada = { dado: semAcento(c.dado), ambiente: semAcento(c.ambiente), autonomia: semAcento(c.autonomia) };
    const { decisao, regra } = classificar(entrada);
    return { id: c.id, finalidade: c.titulo, ...entrada, decisao, regra };
  });
};

const SOMENTE_LEITURA = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const FERRAMENTAS = [
  {
    name: 'listar_regras',
    description: 'Lista as regras de governança didáticas em ordem de precedência e a taxonomia aceita.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: SOMENTE_LEITURA
  },
  {
    name: 'classificar_cenario',
    description: 'Classifica um cenário FICTÍCIO (permitido, condicionado ou não autorizado) com a regra aplicada e a explicação. ' +
      'aprovacao_humana é aceito, mas NÃO altera a classificação. Resultado didático, sem valor institucional.',
    inputSchema: {
      type: 'object',
      properties: {
        dado: { type: 'string', enum: TAXONOMIA.dados },
        ambiente: { type: 'string', enum: TAXONOMIA.ambientes },
        autonomia: { type: 'string', enum: TAXONOMIA.autonomias },
        aprovacao_humana: { type: 'boolean', description: 'Informativo: não altera a classificação.' }
      },
      required: ['dado', 'ambiente', 'autonomia'],
      additionalProperties: false
    },
    annotations: SOMENTE_LEITURA
  },
  {
    name: 'listar_cenarios_exemplo',
    description: 'Lista os 8 cenários fictícios de exemplo do painel, com a decisão da política para cada um.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: SOMENTE_LEITURA
  }
];

const resposta = (dados, erro = false) => ({
  content: [{ type: 'text', text: JSON.stringify(dados, null, 2) }],
  structuredContent: dados,
  ...(erro ? { isError: true } : {})
});

function chamar(nome, args) {
  switch (nome) {
    case 'listar_regras':
      return resposta({ aviso: AVISO, regras_em_ordem_de_precedencia: REGRAS, taxonomia: TAXONOMIA });
    case 'listar_cenarios_exemplo':
      return resposta({ aviso: AVISO, cenarios: lerExemplos() });
    case 'classificar_cenario': {
      const a = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
      const r = classificar({ dado: a.dado, ambiente: a.ambiente, autonomia: a.autonomia });
      const saida = {
        aviso: AVISO, decisao: r.decisao, regra: r.regra, motivo: r.motivo, alertas: r.alertas,
        aprovacao_humana_informada: 'aprovacao_humana' in a,
        aprovacao_humana_alterou_resultado: false
      };
      return resposta(saida, r.regra === 'R0'); // entrada inválida => erro de ferramenta (e nunca "permitido")
    }
    default:
      return null;
  }
}

const erro = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });

// Retorna a resposta JSON-RPC ou null (notificações não têm resposta).
function tratar(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return erro(msg && msg.id !== undefined ? msg.id : null, -32600, 'Requisição inválida.');
  }
  const { id, method, params } = msg;
  const ehNotificacao = id === undefined;
  if (ehNotificacao) return null; // ex.: notifications/initialized, notifications/cancelled
  switch (method) {
    case 'initialize': {
      const pedida = params && params.protocolVersion;
      return ok(id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: `${AVISO} Ferramentas somente de consulta; use apenas dados fictícios.`
      });
    }
    case 'ping': return ok(id, {});
    case 'tools/list': return ok(id, { tools: FERRAMENTAS });
    case 'tools/call': {
      if (!params || typeof params.name !== 'string') return erro(id, -32602, 'Parâmetro "name" obrigatório.');
      const r = chamar(params.name, params.arguments);
      return r ? ok(id, r) : erro(id, -32602, `Ferramenta desconhecida: ${params.name.slice(0, 60)}`);
    }
    default: return erro(id, -32601, `Método não encontrado: ${method.slice(0, 60)}`);
  }
}

const enviar = obj => process.stdout.write(`${JSON.stringify(obj)}\n`);

createInterface({ input: process.stdin }).on('line', linha => {
  if (!linha.trim()) return;
  if (linha.length > MAX_LINHA) return enviar(erro(null, -32600, 'Mensagem grande demais.'));
  let msg;
  try { msg = JSON.parse(linha); } catch { return enviar(erro(null, -32700, 'JSON inválido.')); }
  try {
    const r = tratar(msg);
    if (r) enviar(r);
  } catch (e) {
    console.error('erro interno:', e && e.message);
    enviar(erro(msg && msg.id !== undefined ? msg.id : null, -32603, 'Erro interno.'));
  }
});
console.error(`${SERVER_INFO.name} ${SERVER_INFO.version} pronto (stdio). ${AVISO}`);
