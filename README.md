# GOVSAFE 360 — projeto do zero (M1–M7, versão 0.7.0)

Protótipo didático da Unidade VI (Piloto IA 06), **não homologado**. Classifica cenários **fictícios** de uso de IA
(tipo de dado × ambiente × autonomia) em **Permitido**, **Condicionado** ou **Não autorizado**, com revisão humana
simulada, histórico local e exportações. Use **somente dados fictícios**.

## Marcos (ver `docs/BACKLOG_CONSTRUCAO_DO_ZERO.md`)

| Marco | Produto | Situação na `main` (`45d3f0e`) |
|---|---|---|
| M1 | HTML + CSS responsivo, dashboard com dados fictícios | Feito — testes e2e T01 e T07 |
| M2 | Política única de classificação (`js/politica.js`) | Feito — `tests/politica.test.mjs` |
| M3 | Cadastro, filtro e `localStorage` | Feito — `tests/armazenamento.test.mjs`, e2e T02–T04 |
| M4 | Revisão humana simulada, auditoria, exportações CSV/JSON | Feito — `tests/auditoria.test.mjs`, e2e T05–T06 |
| M5 | MCP local, somente leitura (`tools/govsafe-mcp.mjs`) | Feito — `tests/mcp.test.mjs` (ver `docs/MCP.md`) |
| M6 | Playwright + CI "Qualidade" (`.github/workflows/qualidade.yml`) | Feito — CI verde no PR #1 e na `main` `45d3f0e` |
| M7 | Build publicável (`public/`), `check:sync`, `vercel.json`, CSP, versão visível | Feito — PR #1, merge `45d3f0e`, **em produção** (comprovado em 2026-11-20) |

### Publicação da M7 (comprovado em 2026-11-20)
- [x] Pull Request [#1](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/pull/1) `m7-build-vercel` → `main`
- [x] CI "Qualidade" na M7: verde no PR (após corrigir um teste que só valia no Windows, `93a1acd`) e na `main`
  ([run 44743710180](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/actions/runs/44743710180))
- [x] Preview da Vercel gerado para o PR (protegido por login da Vercel) — conferência no navegador: **pendente (prints)**
- [x] Revisão humana e merge controlado em `main` pelo responsável (merge commit `45d3f0e`)
- [x] Produção servindo a M7: deployment Production do `45d3f0e`, conferido por HTTP e Playwright (`evidencias/04-producao.txt`)

## URLs
- Repositório: https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO
- Produção: https://govsafe360dozero.vercel.app

> **Situação da produção (conferida em 2026-11-20, após o merge):** a URL serve a `main` `45d3f0e` (M7, versão 0.7.0, subtítulo
> "Marco 7"). Antes do merge, a `main` `1ac736c` não tinha `vercel.json` e a Vercel publicava a raiz do repositório:
> `/CLAUDE.md`, `/docs/REQUISITOS.md`, `/tools/govsafe-mcp.mjs` e `/tests/politica.test.mjs` respondiam 200, sem cabeçalhos de
> segurança. Agora esses caminhos respondem **404** e os 5 cabeçalhos (CSP, X-Content-Type-Options, X-Frame-Options,
> Referrer-Policy, Permissions-Policy) estão **presentes** — comparação em `evidencias/05-producao-antes.txt` × `evidencias/04-producao.txt`.

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
npm run test:producao      # Playwright contra a URL publicada (P1–P5, precisa de internet)
```

`test:producao` roda `tests/producao/producao.spec.mjs` com `playwright.producao.config.mjs`, separado da suíte e2e e fora do
CI. Por padrão confere https://govsafe360dozero.vercel.app; para outra URL: `PROD_URL=https://<url> npm run test:producao`
(um Preview protegido por login da Vercel não pode ser conferido assim). Só lê a página e faz um cadastro fictício no
navegador de teste, que é descartado ao fim.

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

## Evidências (Etapas 5–6, CI e produção)

| Verificação | Resultado |
|---|---|
| CI "Qualidade" no PR #1 (`93a1acd`, Node 22, Linux) | verde — Node 57/57, `check:sync` ok, Playwright fonte 33 e `public/` 33 |
| CI "Qualidade" na `main` (`45d3f0e`, push) | verde — Node 57/57, `check:sync` ok, Playwright fonte 33 e `public/` 33 |
| Deployment Production da Vercel | do `45d3f0e`, estado *success* (integração Git, sem ação manual na Vercel) |
| Playwright contra a produção (`npm run test:producao`, P1–P5) | **5/5** — painel 8 cenários e 2/4/2, "Marco 7", 0.7.0, cabeçalhos, console sem erros e sem domínios externos, cadastro persiste, 404 nos internos |
| `curl` na produção: `/CLAUDE.md`, `/docs/REQUISITOS.md`, `/tools/govsafe-mcp.mjs`, `/tests/politica.test.mjs` | 200 antes → **404** depois |
| `curl` na produção: 5 cabeçalhos de segurança | ausentes antes → **presentes** depois |

O primeiro CI do PR falhou (56/57): o teste do build esperava recusar `C:\`, que só é raiz de disco no Windows; no Linux do
CI é um nome de pasta comum. Corrigido no teste (`93a1acd`), sem mudar o build.

As saídas completas ficam em `evidencias/` (fora do repositório por enquanto): `01-git`, `02-testes`, `03-e2e-local`,
`04-producao`, `05-producao-antes` e `06-preview` (Preview protegido por login: inconclusivo por `curl`).

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
