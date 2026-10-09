// Marco 4: dashboard + cadastro + revisão humana SIMULADA + histórico + exportações (CSV/JSON).
// Tudo em localStorage (só dados fictícios). A decisão exibida vem sempre de GovPolitica; a revisão nunca a altera.
const el = (tag, attrs = {}, texto = '') => {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  n.textContent = texto;
  return n;
};
const $ = id => document.getElementById(id);
const rot = v => GovStore.ROTULOS[v] || v;
const CAMPOS_CADASTRO = ['titulo', 'dado', 'ambiente', 'autonomia', 'justificativa'];
const ESTADO_REV = {
  pendente: { rotulo: 'Pendente', icone: '…' },
  aprovado: { rotulo: 'Aprovado (simulado)', icone: '✔' },
  rejeitado: { rotulo: 'Rejeitado (simulado)', icone: '✖' }
};
const MAX_EVENTOS_NA_TELA = 100;

let storage = null;
try { storage = window.localStorage; } catch (e) { /* bloqueado: segue só em memória */ }
const memoria = { getItem: () => null, setItem: () => { throw new Error('sem storage'); } };
const armazem = () => storage || memoria;

const sementes = GovStore.semear(CENARIOS);
let itens = GovStore.carregar(armazem(), sementes).itens;
let revisoes = GovAuditoria.carregarRevisoes(armazem());
let eventos = GovAuditoria.carregarEventos(armazem());
let persistente = !!storage;

function persistir() {
  const resultados = [GovStore.salvar(armazem(), itens), GovAuditoria.salvarRevisoes(armazem(), revisoes),
    GovAuditoria.salvarEventos(armazem(), eventos)];
  persistente = resultados.every(Boolean);
  $('aviso-storage').hidden = persistente;
}

function auditar(tipo, resumo, cenarioId = null) {
  eventos = GovAuditoria.registrar(eventos, tipo, resumo, new Date().toISOString(), cenarioId);
}

function renderCartoes() {
  const lista = $('cartoes');
  lista.replaceChildren();
  const totais = GovStore.resumir(itens);
  for (const [chave, { rotulo, icone }] of Object.entries(DECISOES)) {
    const li = el('li', { class: `cartao d-${chave}` });
    li.append(el('span', { class: 'num' }, String(totais[chave])), el('span', { class: 'rot' }, `${icone} ${rotulo}`));
    lista.append(li);
  }
  $('total-geral').textContent = String(itens.length);
}

function celulaRevisao(c) {
  const est = GovAuditoria.estado(c, revisoes);
  const { rotulo, icone } = ESTADO_REV[est];
  const td = el('td');
  td.append(el('span', { class: `selo r-${est}` }, `${icone} ${rotulo}`));
  if (est !== 'pendente') td.append(el('br'), el('small', {}, new Date(revisoes[c.id].data).toLocaleString('pt-BR')));
  return td;
}

function renderTabela() {
  const filtro = { texto: $('busca').value, decisao: $('filtro-decisao').value };
  const visiveis = GovStore.filtrar(itens, filtro);
  const corpo = $('linhas');
  corpo.replaceChildren();
  for (const c of visiveis) {
    const r = GovPolitica.classificar(c);
    const { rotulo, icone } = DECISOES[r.decisao];
    const tr = el('tr');
    const celulaDecisao = el('td');
    celulaDecisao.append(el('span', { class: `selo d-${r.decisao}` }, `${icone} ${rotulo}`));
    const obs = el('td', {}, `${r.motivo} [${r.regra}]`);
    r.alertas.forEach(a => obs.append(el('br'), el('strong', {}, `Atenção: ${a}`)));
    const acao = el('td');
    const botao = el('button', { type: 'button', class: 'sec pequeno', 'data-revisar': String(c.id), 'aria-label': `Revisar cenário ${c.id}` }, 'Revisar');
    acao.append(botao);
    tr.append(el('td', {}, String(c.id)), el('td', {}, c.titulo), el('td', {}, rot(c.dado)),
      el('td', {}, rot(c.ambiente)), el('td', {}, rot(c.autonomia)), celulaDecisao, obs, el('td', {}, c.justificativa),
      celulaRevisao(c), acao);
    corpo.append(tr);
  }
  $('vazio').hidden = visiveis.length > 0;
  $('vazio').textContent = itens.length === 0 ? 'Nenhum cenário cadastrado. Use o formulário acima ou restaure os exemplos.'
    : 'Nenhum cenário corresponde à busca ou ao filtro.';
  $('contagem').textContent = `Exibindo ${visiveis.length} de ${itens.length} cenário(s).`;
}

function renderSeletorRevisao() {
  const sel = $('rev-cenario');
  const anterior = sel.value;
  sel.replaceChildren();
  if (itens.length === 0) {
    sel.append(el('option', { value: '' }, 'Nenhum cenário disponível'));
  } else {
    sel.append(el('option', { value: '' }, 'Selecione…'));
    for (const c of itens) sel.append(el('option', { value: String(c.id) }, `#${c.id} — ${c.titulo}`));
    if (itens.some(c => String(c.id) === anterior)) sel.value = anterior;
  }
  sel.disabled = itens.length === 0;
  atualizarDica();
}

const itemSelecionado = () => itens.find(c => String(c.id) === $('rev-cenario').value);

// Cenário não autorizado: desabilita "aprovar" na tela (a regra real continua na lógica, que também bloqueia).
function atualizarDica() {
  const item = itemSelecionado();
  const opcaoAprovar = $('rev-resultado').querySelector('option[value="aprovado"]');
  const bloqueado = !!item && GovPolitica.classificar(item).decisao === GovPolitica.DECISOES.NAO_AUTORIZADO;
  opcaoAprovar.disabled = bloqueado;
  if (bloqueado && $('rev-resultado').value === 'aprovado') $('rev-resultado').value = '';
  $('dica-rev').textContent = !item ? ''
    : bloqueado ? 'Este cenário é NÃO AUTORIZADO: a aprovação está bloqueada; só é possível rejeitar.'
      : `Decisão da política: ${DECISOES[GovPolitica.classificar(item).decisao].rotulo}. A revisão simulada não a altera.`;
}

function renderEventos() {
  const corpo = $('eventos');
  corpo.replaceChildren();
  const recentes = eventos.slice().reverse().slice(0, MAX_EVENTOS_NA_TELA);
  for (const e of recentes) {
    const tr = el('tr');
    tr.append(el('td', {}, String(e.seq)), el('td', {}, new Date(e.data).toLocaleString('pt-BR')),
      el('td', {}, e.tipo), el('td', {}, e.resumo));
    corpo.append(tr);
  }
  $('eventos-vazio').hidden = eventos.length > 0;
  $('contagem-eventos').textContent = eventos.length === 0 ? ''
    : `${eventos.length} evento(s) registrado(s)` + (eventos.length > MAX_EVENTOS_NA_TELA ? `; mostrando os ${MAX_EVENTOS_NA_TELA} mais recentes (a exportação traz todos).` : '.');
}

const renderTudo = () => { renderCartoes(); renderTabela(); renderSeletorRevisao(); renderEventos(); };

function mostrarErros(erros, campos, prefixo = 'erro-') {
  for (const [campo, idCampo] of campos) {
    $(`${prefixo}${campo}`).textContent = erros[campo] || '';
    $(idCampo).setAttribute('aria-invalid', erros[campo] ? 'true' : 'false');
  }
}
const CAMPOS_REV = [['rev-cenario', 'rev-cenario'], ['rev-resultado', 'rev-resultado'], ['rev-justificativa', 'rev-justificativa']];

$('form-cenario').addEventListener('submit', ev => {
  ev.preventDefault();
  const campos = Object.fromEntries(CAMPOS_CADASTRO.map(k => [k, $(k).value]));
  const r = GovStore.adicionar(itens, campos);
  const status = $('status-form');
  const pares = CAMPOS_CADASTRO.map(k => [k, k]);
  if (r.erros) {
    mostrarErros(r.erros, pares);
    status.textContent = 'Corrija os campos indicados.';
    $(CAMPOS_CADASTRO.find(k => r.erros[k])).focus();
    return;
  }
  mostrarErros({}, pares);
  itens = r.itens;
  const dec = GovPolitica.classificar(r.novo);
  auditar('cenario_cadastrado', `Cenário #${r.novo.id} "${r.novo.titulo}" cadastrado: ${DECISOES[dec.decisao].rotulo} (${dec.regra}).`, r.novo.id);
  persistir();
  status.textContent = `Cenário #${r.novo.id} cadastrado: ${DECISOES[dec.decisao].rotulo} (${dec.regra}).`
    + (persistente ? '' : ' Atenção: não foi possível salvar neste navegador.');
  ev.target.reset();
  renderTudo();
});

$('form-revisao').addEventListener('submit', ev => {
  ev.preventDefault();
  const status = $('status-rev');
  const item = itemSelecionado();
  if (!item) {
    mostrarErros({ 'rev-cenario': 'Selecione o cenário.' }, CAMPOS_REV);
    status.textContent = 'Corrija os campos indicados.';
    $('rev-cenario').focus();
    return;
  }
  const r = GovAuditoria.revisar({ item, revisoes, eventos, resultado: $('rev-resultado').value, justificativa: $('rev-justificativa').value });
  revisoes = r.revisoes;
  eventos = r.eventos;
  if (!r.ok) {
    if (r.bloqueado) persistir(); // a tentativa bloqueada também fica no histórico
    mostrarErros({ 'rev-resultado': r.erros.resultado, 'rev-justificativa': r.erros.justificativa }, CAMPOS_REV);
    status.textContent = r.bloqueado ? 'Aprovação bloqueada: cenário não autorizado.' : 'Corrija os campos indicados.';
    $(r.erros.resultado ? 'rev-resultado' : 'rev-justificativa').focus();
    renderTudo();
    return;
  }
  mostrarErros({}, CAMPOS_REV);
  persistir();
  status.textContent = `Revisão simulada registrada para o cenário #${item.id}: ${r.revisoes[item.id].resultado}.`
    + (persistente ? '' : ' Atenção: não foi possível salvar neste navegador.');
  $('rev-resultado').value = '';
  $('rev-justificativa').value = '';
  renderTudo();
});

$('rev-cenario').addEventListener('change', atualizarDica);

$('linhas').addEventListener('click', ev => {
  const b = ev.target.closest('[data-revisar]');
  if (!b) return;
  $('rev-cenario').value = b.getAttribute('data-revisar');
  atualizarDica();
  $('revisao').scrollIntoView();
  $('rev-resultado').focus();
});

['busca', 'filtro-decisao'].forEach(id => $(id).addEventListener('input', renderTabela));
$('limpar-filtros').addEventListener('click', () => { $('busca').value = ''; $('filtro-decisao').value = ''; renderTabela(); });

$('restaurar').addEventListener('click', () => {
  if (!window.confirm('Substituir todos os cenários pelos 8 exemplos fictícios? As revisões simuladas serão descartadas (o histórico é mantido).')) return;
  itens = sementes.slice();
  revisoes = {};
  auditar('exemplos_restaurados', 'Os 8 cenários de exemplo foram restaurados; revisões simuladas descartadas.');
  persistir();
  renderTudo();
});

$('remover-todos').addEventListener('click', () => {
  if (!window.confirm('Remover todos os cenários deste navegador? As revisões simuladas serão descartadas (o histórico é mantido).')) return;
  const n = itens.length;
  itens = [];
  revisoes = {};
  auditar('cenarios_removidos', `${n} cenário(s) removido(s); revisões simuladas descartadas.`);
  persistir();
  renderTudo();
});

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = el('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('exportar-csv').addEventListener('click', () => {
  auditar('exportacao_csv', `Matriz exportada em CSV (${itens.length} cenário(s)).`);
  persistir();
  baixar('govsafe360-matriz.csv', GovAuditoria.csvMatriz(itens, revisoes), 'text/csv;charset=utf-8');
  $('status-export').textContent = `CSV gerado com ${itens.length} cenário(s).`;
  renderEventos();
});

$('exportar-json').addEventListener('click', () => {
  auditar('exportacao_json', 'Auditoria exportada em JSON.');
  persistir();
  baixar('govsafe360-auditoria.json', GovAuditoria.jsonAuditoria(eventos), 'application/json;charset=utf-8');
  $('status-export').textContent = `JSON gerado com ${eventos.length} evento(s).`;
  renderEventos();
});

$('aviso-storage').hidden = persistente;
renderTudo();
