// Marco 4: revisão humana SIMULADA, trilha de auditoria local e exportações (CSV/JSON). Sem DOM, testável em Node.
// A revisão NUNCA altera a decisão da política; cenário NÃO AUTORIZADO só pode ser rejeitado.
// Dados apenas fictícios, em localStorage; não é auditoria imutável nem institucional.
(function (raiz) {
  const CH_REVISOES = 'govsafe360.revisoes.v1';
  const CH_AUDITORIA = 'govsafe360.auditoria.v1';
  const RESULTADOS = ['aprovado', 'rejeitado'];
  const ROTULO_DECISAO = { permitido: 'Permitido', condicionado: 'Condicionado', nao_autorizado: 'Não autorizado' };
  const agoraISO = () => new Date().toISOString();

  function ler(storage, chave) {
    try { const b = storage.getItem(chave); return b === null ? null : JSON.parse(b); } catch (e) { return null; }
  }
  function gravar(storage, chave, valor) {
    try { storage.setItem(chave, JSON.stringify(valor)); return true; } catch (e) { return false; }
  }

  const revisaoValida = r => !!r && RESULTADOS.includes(r.resultado) && typeof r.data === 'string' &&
    typeof r.justificativa === 'string' && r.justificativa.trim().length > 0;
  const eventoValido = e => !!e && Number.isInteger(e.seq) && ['data', 'tipo', 'resumo'].every(k => typeof e[k] === 'string');

  // Mapa { [idCenario]: { resultado, justificativa, data } }; qualquer anomalia => mapa vazio.
  function carregarRevisoes(storage) {
    const d = ler(storage, CH_REVISOES);
    return d && typeof d === 'object' && !Array.isArray(d) && Object.values(d).every(revisaoValida) ? d : {};
  }
  function carregarEventos(storage) {
    const d = ler(storage, CH_AUDITORIA);
    return Array.isArray(d) && d.every(eventoValido) ? d : [];
  }
  const salvarRevisoes = (storage, revisoes) => gravar(storage, CH_REVISOES, revisoes);
  const salvarEventos = (storage, eventos) => gravar(storage, CH_AUDITORIA, eventos);

  // Acrescenta um evento (sem mutar). `resumo` não deve conter segredos: quem chama já filtrou os textos livres.
  function registrar(eventos, tipo, resumo, agora = agoraISO(), cenarioId = null) {
    const seq = eventos.reduce((m, e) => Math.max(m, e.seq), 0) + 1;
    return [...eventos, { seq, data: agora, tipo, cenario_id: cenarioId, resumo }];
  }

  // Estado efetivo da revisão. Um "aprovado" armazenado para cenário NÃO AUTORIZADO (storage adulterado) é ignorado.
  function estado(item, revisoes) {
    const r = revisoes[item.id];
    if (!r) return 'pendente';
    if (r.resultado === 'aprovado' && raiz.GovPolitica.classificar(item).decisao === raiz.GovPolitica.DECISOES.NAO_AUTORIZADO) return 'pendente';
    return r.resultado;
  }

  // Retorna { ok, revisoes, eventos, erros?, bloqueado? }. Sem mutar as entradas.
  function revisar({ item, revisoes, eventos, resultado, justificativa, agora = agoraISO() }) {
    const dec = raiz.GovPolitica.classificar(item);
    if (resultado === 'aprovado' && dec.decisao === raiz.GovPolitica.DECISOES.NAO_AUTORIZADO) {
      return {
        ok: false, bloqueado: true, revisoes,
        eventos: registrar(eventos, 'revisao_bloqueada',
          `Tentativa de aprovar o cenário #${item.id} bloqueada: decisão "Não autorizado" (${dec.regra}) só admite rejeição.`, agora, item.id),
        erros: { resultado: 'Cenário NÃO AUTORIZADO não pode ser aprovado; só a rejeição é permitida.' }
      };
    }
    const erros = {};
    const just = typeof justificativa === 'string' ? justificativa.trim() : '';
    if (!RESULTADOS.includes(resultado)) erros.resultado = 'Selecione aprovar ou rejeitar.';
    if (!just) erros.justificativa = 'A justificativa é obrigatória.';
    else if (just.length > raiz.GovStore.MAX_JUSTIFICATIVA) erros.justificativa = `Máximo de ${raiz.GovStore.MAX_JUSTIFICATIVA} caracteres.`;
    else if (raiz.GovStore.contemSegredo(just)) erros.justificativa = raiz.GovStore.MSG_SEGREDO;
    if (Object.keys(erros).length) return { ok: false, erros, revisoes, eventos };

    const revisao = { resultado, justificativa: just, data: agora };
    return {
      ok: true,
      revisoes: { ...revisoes, [item.id]: revisao },
      eventos: registrar(eventos, 'revisao_registrada',
        `Cenário #${item.id} "${item.titulo}": revisão humana simulada = ${resultado}. ` +
        `Decisão da política inalterada: ${ROTULO_DECISAO[dec.decisao]} (${dec.regra}). Justificativa: ${just}`, agora, item.id)
    };
  }

  // ---- Exportações ----
  const COLUNAS = ['id', 'finalidade', 'tipo_dado', 'ambiente', 'autonomia', 'decisao', 'regra', 'motivo', 'alertas',
    'justificativa', 'revisao_humana', 'revisao_justificativa', 'revisao_data'];

  // Todos os campos entre aspas (RFC 4180). Prefixa ' em células que o Excel leria como fórmula.
  function celula(v) {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }

  function csvMatriz(itens, revisoes) {
    const linhas = [COLUNAS.map(celula).join(',')];
    for (const c of itens) {
      const d = raiz.GovPolitica.classificar(c);
      const est = estado(c, revisoes);
      const r = est === 'pendente' ? null : revisoes[c.id];
      linhas.push([c.id, c.titulo, c.dado, c.ambiente, c.autonomia, d.decisao, d.regra, d.motivo, d.alertas.join(' | '),
        c.justificativa, est, r ? r.justificativa : '', r ? r.data : ''].map(celula).join(','));
    }
    return '﻿' + linhas.join('\r\n') + '\r\n'; // BOM para o Excel reconhecer UTF-8
  }

  function jsonAuditoria(eventos, agora = agoraISO()) {
    return JSON.stringify({
      sistema: 'GOVSAFE 360 (protótipo didático, não homologado)',
      aviso: 'Dados fictícios e simulados. Não é auditoria institucional nem registro imutável.',
      versao_esquema: 1,
      gerado_em: agora,
      total_eventos: eventos.length,
      eventos
    }, null, 2);
  }

  raiz.GovAuditoria = Object.freeze({
    CH_REVISOES, CH_AUDITORIA, RESULTADOS, COLUNAS,
    carregarRevisoes, carregarEventos, salvarRevisoes, salvarEventos, registrar, estado, revisar, csvMatriz, jsonAuditoria
  });
})(globalThis);
