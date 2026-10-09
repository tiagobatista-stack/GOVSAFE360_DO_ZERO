// Marco 1: cenários 100% FICTÍCIOS e estáticos (script clássico, funciona via file://).
// Decisões fixas apenas para exibição; o motor de classificação (js/politica.js) só chega no Marco 2.
const DECISOES = {
  permitido: { rotulo: 'Permitido', icone: '✔' },
  condicionado: { rotulo: 'Condicionado', icone: '!' },
  nao_autorizado: { rotulo: 'Não autorizado', icone: '✖' }
};

const CENARIOS = [
  { id: 1, titulo: 'Resumir norma pública', dado: 'público', ambiente: 'desenvolvimento', autonomia: 'leitura', decisao: 'permitido', nota: 'Classificação didática; não é autorização institucional.' },
  { id: 2, titulo: 'Rascunhar FAQ do portal de testes', dado: 'público', ambiente: 'desenvolvimento', autonomia: 'proposta', decisao: 'permitido', nota: 'Somente proposta de texto, sem publicação.' },
  { id: 3, titulo: 'Analisar relatório interno de exemplo', dado: 'interno', ambiente: 'homologação', autonomia: 'proposta', decisao: 'condicionado', nota: 'Exige revisão humana antes de qualquer uso.' },
  { id: 4, titulo: 'Ler página externa e resumir', dado: 'externo', ambiente: 'desenvolvimento', autonomia: 'leitura', decisao: 'condicionado', nota: 'Conteúdo externo não tem autoridade instrucional.' },
  { id: 5, titulo: 'Editar script de apoio', dado: 'interno', ambiente: 'homologação', autonomia: 'edição', decisao: 'condicionado', nota: 'Edição somente com acompanhamento humano.' },
  { id: 6, titulo: 'Propor ajuste de configuração', dado: 'interno', ambiente: 'produção', autonomia: 'proposta', decisao: 'condicionado', nota: 'Sem autorização para ação real em produção.' },
  { id: 7, titulo: 'Ação crítica autônoma', dado: 'interno', ambiente: 'produção', autonomia: 'crítica', decisao: 'nao_autorizado', nota: 'Ações críticas não são delegadas.' },
  { id: 8, titulo: 'Automação com token de API', dado: 'credencial', ambiente: 'desenvolvimento', autonomia: 'execução', decisao: 'nao_autorizado', nota: 'Segredos nunca são solicitados nem armazenados.' }
];
