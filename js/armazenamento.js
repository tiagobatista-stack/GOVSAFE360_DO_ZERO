// Marco 3: camada de dados (cadastro, filtro, persistência). Sem DOM: testável em Node com storage falso.
// Persiste só os CAMPOS DE ENTRADA; a decisão é sempre recalculada por GovPolitica (política única).
// localStorage = apenas dados fictícios, não é persistência institucional.
(function (raiz) {
  const CHAVE = 'govsafe360.cenarios.v1';
  const MAX_TITULO = 100;
  const MAX_JUSTIFICATIVA = 300;

  const ROTULOS = Object.freeze({
    publico: 'público', interno: 'interno', pessoal: 'pessoal', credencial: 'credencial', externo: 'externo',
    desenvolvimento: 'desenvolvimento', homologacao: 'homologação', producao: 'produção',
    leitura: 'leitura', proposta: 'proposta', edicao: 'edição', execucao: 'execução', critica: 'crítica'
  });

  // Heurística (não é garantia): recusa texto que lembre segredo ou CPF, para a auditoria ficar "sem segredos".
  const PADROES_SEGREDO = [
    /\b(senha|password|passwd|token|secret|segredo|api[-_ ]?key|chave)\b\s*[:=]\s*\S+/i,
    /\bbearer\s+[a-z0-9._~+\/-]{10,}/i,
    /\b(sk-|ghp_|gho_|xox[abp]-|AKIA)[A-Za-z0-9_-]{12,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /[A-Za-z0-9+\/_-]{40,}/,
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
    /\b\d{11}\b/
  ];
  const MSG_SEGREDO = 'O texto parece conter segredo ou dado pessoal. Remova e use apenas dados fictícios.';
  const contemSegredo = t => PADROES_SEGREDO.some(re => re.test(String(t)));

  const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tax = () => raiz.GovPolitica.TAXONOMIA;
  const texto = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

  function itemValido(c) {
    return !!c && Number.isInteger(c.id) && texto(c.titulo, MAX_TITULO) && texto(c.justificativa, MAX_JUSTIFICATIVA) &&
      tax().dados.includes(c.dado) && tax().ambientes.includes(c.ambiente) && tax().autonomias.includes(c.autonomia);
  }

  // Converte os cenários estáticos do Marco 1 (rótulos acentuados) para a taxonomia da política.
  function semear(cenarios) {
    return cenarios.map(c => ({
      id: c.id, titulo: c.titulo, dado: semAcento(c.dado), ambiente: semAcento(c.ambiente),
      autonomia: semAcento(c.autonomia), justificativa: 'Cenário de exemplo (fictício).'
    }));
  }

  // Chave ausente, JSON corrompido ou item inválido => volta às sementes. Lista vazia salva é respeitada.
  function carregar(storage, sementes) {
    try {
      const bruto = storage.getItem(CHAVE);
      if (bruto === null) return { itens: sementes.slice(), origem: 'sementes' };
      const dados = JSON.parse(bruto);
      if (Array.isArray(dados) && dados.every(itemValido)) return { itens: dados, origem: 'armazenamento' };
    } catch (e) { /* storage indisponível ou JSON inválido */ }
    return { itens: sementes.slice(), origem: 'sementes' };
  }

  function salvar(storage, itens) {
    try { storage.setItem(CHAVE, JSON.stringify(itens)); return true; } catch (e) { return false; }
  }

  function validarEntrada(campos) {
    const c = campos || {};
    const erros = {};
    const titulo = typeof c.titulo === 'string' ? c.titulo.trim() : '';
    const justificativa = typeof c.justificativa === 'string' ? c.justificativa.trim() : '';
    if (!titulo) erros.titulo = 'Informe a finalidade.';
    else if (titulo.length > MAX_TITULO) erros.titulo = `Máximo de ${MAX_TITULO} caracteres.`;
    else if (contemSegredo(titulo)) erros.titulo = MSG_SEGREDO;
    if (!justificativa) erros.justificativa = 'Informe a justificativa.';
    else if (justificativa.length > MAX_JUSTIFICATIVA) erros.justificativa = `Máximo de ${MAX_JUSTIFICATIVA} caracteres.`;
    else if (contemSegredo(justificativa)) erros.justificativa = MSG_SEGREDO;
    if (!tax().dados.includes(c.dado)) erros.dado = 'Selecione o tipo de dado.';
    if (!tax().ambientes.includes(c.ambiente)) erros.ambiente = 'Selecione o ambiente.';
    if (!tax().autonomias.includes(c.autonomia)) erros.autonomia = 'Selecione a autonomia.';
    if (Object.keys(erros).length) return { ok: false, erros };
    return { ok: true, valor: { titulo, dado: c.dado, ambiente: c.ambiente, autonomia: c.autonomia, justificativa } };
  }

  // Retorna { itens, novo } sem mutar a lista recebida. id = maior id + 1 (nunca reutiliza).
  function adicionar(itens, campos) {
    const v = validarEntrada(campos);
    if (!v.ok) return { erros: v.erros };
    const id = itens.reduce((m, c) => Math.max(m, c.id), 0) + 1;
    const novo = { id, ...v.valor };
    return { itens: [...itens, novo], novo };
  }

  const decidir = c => raiz.GovPolitica.classificar(c);

  function filtrar(itens, { texto: busca = '', decisao = '' } = {}) {
    const q = semAcento(busca.trim());
    return itens.filter(c =>
      (!decisao || decidir(c).decisao === decisao) &&
      (!q || semAcento(`${c.titulo} ${c.justificativa}`).includes(q)));
  }

  function resumir(itens) {
    const totais = { permitido: 0, condicionado: 0, nao_autorizado: 0 };
    for (const c of itens) totais[decidir(c).decisao]++;
    return totais;
  }

  raiz.GovStore = Object.freeze({ CHAVE, MAX_TITULO, MAX_JUSTIFICATIVA, ROTULOS, contemSegredo, MSG_SEGREDO, semear, carregar, salvar, validarEntrada, adicionar, filtrar, resumir });
})(globalThis);
