# GOVSAFE 360 — projeto do zero (M1–M7, versão 0.7.0)

Protótipo didático da Unidade VI (Piloto IA 06), **não homologado**. Classifica cenários **fictícios** de uso de IA
(tipo de dado × ambiente × autonomia) em **Permitido**, **Condicionado** ou **Não autorizado**, com revisão humana
simulada, histórico local e exportações. Use **somente dados fictícios**.

## Marcos (ver `docs/BACKLOG_CONSTRUCAO_DO_ZERO.md`)

| Marco | Produto | Situação nesta branch (`m7-build-vercel`) |
|---|---|---|
| M1 | HTML + CSS responsivo, dashboard com dados fictícios | Feito — testes e2e T01 e T07 |
| M2 | Política única de classificação (`js/politica.js`) | Feito — `tests/politica.test.mjs` |
| M3 | Cadastro, filtro e `localStorage` | Feito — `tests/armazenamento.test.mjs`, e2e T02–T04 |
| M4 | Revisão humana simulada, auditoria, exportações CSV/JSON | Feito — `tests/auditoria.test.mjs`, e2e T05–T06 |
| M5 | MCP local, somente leitura (`tools/govsafe-mcp.mjs`) | Feito — `tests/mcp.test.mjs` (ver `docs/MCP.md`) |
| M6 | Playwright + CI "Qualidade" (`.github/workflows/qualidade.yml`) | Feito — CI verde só na `main` (sem M7) |
| M7 | Build publicável (`public/`), `check:sync`, `vercel.json`, CSP, versão visível | Código pronto (commit `096aef3`); publicação **pendente** |

### Pendente (ainda não existe)
- [ ] Pull Request `m7-build-vercel` → `main`
- [ ] CI "Qualidade" executado na M7 (dispara ao abrir o PR)
- [ ] Preview da Vercel para o PR
- [ ] Revisão humana e merge controlado em `main`
- [ ] Produção servindo a M7

## URLs
- Repositório: https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO
- Produção: https://govsafe360dozero.vercel.app

> **Situação atual da produção (conferida em 2026-11-20):** a URL serve a `main` (`1ac736c`), anterior à M7. Sem `vercel.json`,
> a Vercel publica a raiz do repositório: `/docs/`, `/tools/`, `/tests/` e `CLAUDE.md` respondem 200 e não há cabeçalhos de
> segurança. O conteúdo é o mesmo do repositório público (só dados fictícios). A M7 corrige isso publicando apenas `public/`
> — a confirmar depois do merge.

## Como testar

Requisitos: Node ≥ 20.11 e, para o e2e local, Google Chrome instalado (o Playwright usa o canal `chrome`; `PW_CHANNEL=msedge` troca).

```bash
npm ci                     # dependências de desenvolvimento (só @playwright/test)
npm run check:js           # sintaxe dos arquivos JavaScript
npm test                   # testes Node: política, armazenamento, auditoria, MCP, build
npm run build              # gera public/ (somente index.html, css/ e js/)
npm run check:sync         # confere que public/ é idêntico à fonte e mostra a versão
npm run test:e2e           # Playwright contra a fonte
npm run test:e2e:public    # Playwright contra public/ (o que será publicado)
npm run dev                # servidor local da fonte
```

Publicação e checklist de Preview/Produção: `docs/DEPLOY.md`.

## Evidências (Etapa 2, execução local)

Branch `m7-build-vercel`, commit `096aef3`, Node **v26.13.1** local (o CI usa Node **22**), Playwright 1.64.0, Chrome do sistema.

| Verificação | Resultado |
|---|---|
| `npm run check:js` | exit 0 |
| `npm test` (unidade) | **57/57** aprovados, 0 falhas |
| `npm run build` + `npm run check:sync` | 7 arquivos, idênticos à fonte, versão 0.7.0 |
| `npm run test:e2e` (fonte) | **33/33** aprovados |
| `npm run test:e2e:public` (`public/`) | **33/33** aprovados |

As saídas completas ficam em `evidencias/` (fora do repositório por enquanto).

## Governança
- Matriz de autonomia com 5 cenários fictícios, conferida com `js/politica.js`: [`docs/MATRIZ_AUTONOMIA.md`](docs/MATRIZ_AUTONOMIA.md) (planilha: [`docs/MATRIZ_AUTONOMIA.csv`](docs/MATRIZ_AUTONOMIA.csv))
- Relatório de entrega: [`docs/RELATORIO_ENTREGA.md`](docs/RELATORIO_ENTREGA.md) *(a criar)*
- Regras e política de dados: `docs/REGRAS_GOVERNANCA.md`, `docs/POLITICA_DE_DADOS.md`, critérios em `docs/CRITERIOS_ACEITE.md`

## Limitações
- Protótipo didático, **não homologado** e sem valor de aprovação institucional.
- Somente dados fictícios; o app recusa textos com aparência de segredo ou CPF, mas isso não substitui o cuidado de quem digita.
- Os dados ficam só no navegador (`localStorage`); não há servidor, autenticação nem banco.
- O histórico de auditoria é local e **não é imutável**.
- O MCP (`tools/`) é local, somente leitura, e não é publicado.

## Licença
MIT — ver `LICENSE`.
