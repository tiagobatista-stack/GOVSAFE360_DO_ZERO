# Relatório de entrega — GOVSAFE 360, Marco 7 (Unidade VI, Piloto IA 06)

Protótipo didático, **não homologado**, com **somente dados fictícios**. Este relatório registra o que foi feito na sessão
de 2026-11-20, com números tirados das saídas reais dos comandos. As saídas completas estão versionadas em
[`evidencias/`](../evidencias/) (`01` a `06`, `.txt`); caminhos locais, usuário do Windows e slug do time na Vercel foram
trocados por `<local>`. Relatórios HTML e resultados brutos do Playwright não são versionados.

## Mapa da entrega

| # | Item do Moodle | Onde está |
|---|---|---|
| 1 | URL da Vercel | https://govsafe360dozero.vercel.app — seção 1; comprovação em seção 4 e [`evidencias/04-producao.txt`](../evidencias/04-producao.txt) |
| 2 | URL do GitHub + hash do commit | https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO — seção 1 ("Hash de entrega (main)" e histórico de hashes); [`evidencias/01-git.txt`](../evidencias/01-git.txt) |
| 3 | Testes locais, CI e Playwright | Seções 2 e 3; [`evidencias/02-testes.txt`](../evidencias/02-testes.txt), [`evidencias/03-e2e-local.txt`](../evidencias/03-e2e-local.txt), [`evidencias/04-producao.txt`](../evidencias/04-producao.txt); [`.github/workflows/qualidade.yml`](../.github/workflows/qualidade.yml); [`tests/producao/producao.spec.mjs`](../tests/producao/producao.spec.mjs) |
| 4 | Dois prints com dados fictícios + vídeo/trace do Playwright | Enviados no Moodle, fora do repositório (seção 10): 2 prints da produção e os traces de `npm run test:producao -- --trace on` (P1–P5) |
| 5 | Matriz com 5 cenários | Seção 5; [`docs/MATRIZ_AUTONOMIA.md`](MATRIZ_AUTONOMIA.md) e [`.csv`](MATRIZ_AUTONOMIA.csv) |
| 6 | Relatório: Claude executou, humano aprovou, limites, reversão | Este documento — seções 6 e 7 (execução × aprovação, erros do agente), 8 (reversão), 9 (limites) e 10 (pendências) |

## 1. URLs e hashes

| Item | Valor |
|---|---|
| Produção | https://govsafe360dozero.vercel.app |
| Repositório | https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO |
| **Hash de entrega (`main`)** | *pendente — preencher após o merge do PR #3* |
| PR #1 (M7) | https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/pull/1 |
| PR #2 (documentação pós-produção e spec P1–P5) | https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/pull/2 |

| Hash | Conteúdo |
|---|---|
| `1ac736c` | `main` antes da M7 (produção antiga, que publicava a raiz do repositório) |
| `096aef3` | M7: build publicável (`public/`), `check:sync`, `vercel.json`, CSP, versão 0.7.0 visível |
| `a85af64` | README reflete M1–M7, URLs, testes, evidências e pendências |
| `b0c1db7` | Subtítulo da página: "Marco 4" → "Marco 7" |
| `af77dc6` | Matriz de autonomia com 5 cenários fictícios conferidos com a política |
| `93a1acd` | Correção do teste do build: `C:\` só é raiz de disco no Windows |
| **`45d3f0e`** | **Merge do PR #1 na `main`** (pais `1ac736c` + `93a1acd`), feito pelo responsável — é o que está em produção |
| `ad59483` | README e matriz (C4) "comprovado"; spec de produção P1–P5 (`npm run test:producao`) |
| **`8aa9907`** | **Merge do PR #2 na `main`** (pais `45d3f0e` + `ad59483`), feito pelo responsável — `main` e produção atuais; `public/` idêntico ao de `45d3f0e` |

## 2. Resultados dos testes

| Onde | Verificação | Resultado |
|---|---|---|
| Local (Windows, Node v26.13.1, Playwright 1.64.0, Chrome) | `npm run check:js` | exit 0 |
| | `npm test` (política, armazenamento, auditoria, MCP, build) | **57/57** |
| | `npm run build` + `npm run check:sync` | 7 arquivos idênticos à fonte, versão 0.7.0 |
| | `npm run test:e2e` (fonte) | **33/33** |
| | `npm run test:e2e:public` (`public/`) | **33/33** |
| CI "Qualidade" (Linux, Node 22) | 1º run do PR #1 ([44740883907](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/actions/runs/44740883907)) | **falhou**: 56/57 (ver seção 3) |
| | 2º run do PR #1, `93a1acd` ([44741813278](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/actions/runs/44741813278)) | verde: 57/57, `check:sync` ok, fonte 33, `public/` 33 |
| | `main` `45d3f0e` após o merge ([44743710180](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/actions/runs/44743710180)) | verde: 57/57, `check:sync` ok, fonte 33, `public/` 33 |
| | PR #2, `ad59483` ([44746811813](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/actions/runs/44746811813)) | verde: 57/57, `check:sync` ok, fonte 33, `public/` 33 |
| | `main` `8aa9907` após o merge do PR #2 ([44748184512](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/actions/runs/44748184512)) | verde: 57/57, `check:sync` ok, fonte 33, `public/` 33 |
| Produção (`npm run test:producao`) | P1 painel 8 cenários e 2/4/2, aviso, "Marco 7", 0.7.0 · P2 cabeçalhos · P3 console sem erros e sem domínios externos · P4 cadastro fictício persiste · P5 internos 404 | **5/5** com `45d3f0e` e de novo **5/5** com `8aa9907` |
| Vercel | Deployments Production do `45d3f0e` e do `8aa9907` (API de deployments do GitHub) | ambos *success*, disparados pela integração Git em cada merge |

## 3. Falha do CI no Linux e correção

O primeiro CI do PR #1 parou em "Testes Node" com 56/57:

```
not ok 27 - build recusa pastas de saída perigosas e não apaga nada
  error: deveria recusar "C:\"   0 !== 1
```

**Causa:** `tests/build.test.mjs` nasceu na M7 (`096aef3`) e nunca tinha rodado fora do Windows — a `main` passava porque
não tinha esse arquivo. No Windows `C:\` é a raiz do disco e o build recusa; no Linux do CI é um nome de pasta comum dentro do
projeto (`path.posix.isAbsolute("C:\\") = false`), que o build aceita com segurança. **Correção** (`93a1acd`): o teste só
exige a recusa de `C:\` quando roda no Windows; a recusa de `/` continua testada em todos os sistemas e o build não mudou.
Os 57/57 locais eram reais, mas medidos num só sistema — é para isso que o CI existe.

## 4. Achado C4: a produção publicava a raiz do repositório

Antes da M7, sem `vercel.json`, a Vercel publicava o diretório `.` inteiro. Comparação `evidencias/05-producao-antes.txt` ×
`evidencias/04-producao.txt` (mesmos caminhos, `curl`):

| Verificação | 05 antes (`1ac736c`) | 04 depois (`45d3f0e`) |
|---|---|---|
| `/` | 200 | 200 |
| `/CLAUDE.md` | 200 | **404** |
| `/docs/REQUISITOS.md` | 200 | **404** |
| `/tools/govsafe-mcp.mjs` | 200 | **404** |
| `/tests/politica.test.mjs` | 200 | **404** |
| `/docs/`, `/tools/`, `/tests/`, `/package.json`, `/README.md` | 404 | 404 |
| Content-Security-Policy | ausente | **presente** |
| X-Content-Type-Options | ausente | **presente** (`nosniff`) |
| X-Frame-Options | ausente | **presente** (`DENY`) |
| Referrer-Policy | ausente | **presente** (`no-referrer`) |
| Permissions-Policy | ausente | **presente** |
| Subtítulo / versão no rodapé | "Marco 4" / ausente | "Marco 7" / **0.7.0** |

O conteúdo exposto era só fictício e já público no repositório, mas publicado além do necessário. A correção chegou pelo
caminho controlado: PR, CI, Preview e **merge humano**; a IA não publicou nem alterou nada na Vercel.

## 5. Matriz de autonomia (resumo de `docs/MATRIZ_AUTONOMIA.md`)

| # | Cenário fictício | Dado / Ambiente / Autonomia | Decisão (regra) |
|---|---|---|---|
| C1 | IA lê os 8 exemplos e resume o painel | Público / Desenvolvimento / Leitura | **Permitido** (R5) |
| C2 | IA edita o README na branch de trabalho | Interno / Desenvolvimento / Edição | **Condicionado** (R4) |
| C3 | IA consulta status HTTP e cabeçalhos da produção | Público / Produção / Leitura | **Condicionado** (R3) |
| C4 | IA executa publicação em produção por conta própria | Interno / Produção / Execução | **Não autorizado** (R2) |
| C5 | IA usa token, senha ou MFA para publicar | Credencial / Produção / Execução | **Não autorizado** (R1) |

Conferida com `GovPolitica.classificar()`: **5/5**. A revisão humana não altera a decisão (`aprovacao_humana` é ignorada de
propósito); o C4 tem como motivação o achado da seção 4, agora com a correção comprovada.

## 6. O que o Claude executou × o que o humano aprovou

| Etapa | Claude executou | Humano decidiu / aprovou |
|---|---|---|
| 1. Diagnóstico | Leituras de Git, arquivos e configuração da Vercel (sem alterar) | Contrato de trabalho e regras |
| 2. Testes | `check:js`, `npm test`, build, `check:sync`, e2e fonte e `public/`; evidências 01–03 saneadas | OK para rodar e para o saneamento `<local>` |
| 3. README e subtítulo | Diffs propostos; commits `a85af64` e `b0c1db7` com `git add` explícito | OK para cada commit; opinião pedida sobre o subtítulo |
| 4. Matriz | Proposta, conferência 5/5 com a política, commit `af77dc6` | 3 ajustes (C4 como "IA publica por conta própria", revisor do C1, CSV `;` com BOM) e OK do commit |
| 5. Push e PR #1 | Push, `gh pr create`, `gh pr checks`; diagnóstico da falha; correção `93a1acd` | Conferência da conta ativa do `gh`; OK do push/PR; OK da correção; escolha (a)+(b) para o Preview |
| 6. Produção | `git fetch`, espera do Production, Playwright e `curl`, `04-producao.txt`; commit `ad59483`; push e PR #2 | **Merge do PR #1** (`45d3f0e`); prova do conteúdo na produção em vez do Preview; OK do commit, push e PR #2; **merge do PR #2** (`8aa9907`) |
| 7. Reversão | Só explicação (seção 8) | — |
| 8–9. Relatório e checklist | Este documento e a inclusão dos `evidencias/*.txt` saneados | Ajustes no texto, decisão de versionar as evidências e OK antes do commit |
| Fora do CLI (responsável) | — | Criação do repositório; ligação Vercel↔GitHub; mudança do repositório de privado para **público** em 2026-11-20 (justificativa: só dados fictícios; risco avaliado no C4) |

Em nenhum momento o Claude usou senha, token ou MFA, fez merge, rodou `vercel deploy` ou alterou configuração da Vercel.

## 7. Erros do próprio agente que foram detectados

| Erro | Como foi detectado | Tratamento |
|---|---|---|
| Saneamento com `sed`/`perl` usando o caminho como expressão regular cortou trechos de texto das evidências | Releitura do arquivo saneado | Refeito a partir do bruto com troca literal (`\Q…\E`); erro relatado na hora |
| Bloco de conferência da matriz escrito antes de rodar o script | Revisão própria | `diff` contra a saída real: idênticos |
| `npm test` rodou antes de a edição do teste ser aplicada (a ferramenta exigia ler o arquivo antes) | Diff vazio na mesma saída | Resultado descartado e informado; teste refeito sobre o código editado (57/57) |
| Spec de produção: o P1 dizia conferir os totais 2/4/2 mas a linha não conferia nada | Revisão própria antes de gravar a evidência | Asserção corrigida para `['2','4','2']` e spec rodada de novo; só a 2ª rodada foi registrada |
| Primeiro `curl` do Preview gravado sem perceber o 302 de login | Todas as rotas com o mesmo 302 | Redirecionamento inspecionado; resultado marcado como **inconclusivo**, sem contornar a proteção |

## 8. Reversão (Etapa 7)

| Opção | O que faz | Quando serve aqui |
|---|---|---|
| `git restore <arquivo>` | Descarta mudanças **locais não commitadas** | Não desfaz nada já publicado; serve só durante a edição |
| `git revert -m 1 45d3f0e` | Cria um commit novo que desfaz o merge, mantendo o histórico (`-m 1` = manter o lado da `main`) | Via branch + PR + merge humano; a Vercel publica o resultado. Rastreável e passa pelo CI, porém mais lento |
| Instant Rollback da Vercel | Volta o alias de produção para um deployment anterior, sem build nem mudança no Git | Mais rápido (segundos); feito pelo responsável no painel. A `main` continua com a M7, então o próximo merge publica de novo |

**Efeito colateral comum:** voltar para antes de `45d3f0e`, por qualquer caminho, **volta a expor** `/CLAUDE.md`, `/docs`,
`/tools` e `/tests` e **remove os 5 cabeçalhos** — reabre o achado C4. **Escolha aqui:** numa falha grave da M7 em
produção, Instant Rollback para estancar (feito pelo responsável), seguido de correção para a frente por PR, **não** de
`git revert`, justamente para não manter a exposição. Como o problema provável seria de conteúdo, e não de segurança, a
preferência é sempre corrigir com um novo PR em vez de reverter a M7.

## 9. Limites

- Protótipo didático, não homologado, sem valor institucional; somente dados fictícios.
- Dados só no `localStorage` do navegador; histórico local e **não imutável**; sem servidor, autenticação ou banco.
- O Preview da Vercel é protegido por login: o `curl` não confere o conteúdo do Preview, e a prova HTTP ficou para a produção.
- `test:producao` depende da rede e fica fora do CI; o cadastro do P4 fica só no navegador de teste.
- Testes locais rodaram só no Windows com Node v26; o CI usa Linux e Node 22.
- Os marcos M1–M6 (2026-10-09) ficaram num **único commit** (`f9bd037`, "projeto inicial", 35 arquivos), sem commits por
  marco; o histórico granular só existe a partir da M7 (`096aef3` em diante).

## 10. Pendências do responsável

- [ ] **2 prints da produção com dados fictícios:** tela inicial com "Marco 7" e tela de revisão/histórico.
- [x] **Prints de processo** (feitos pelo responsável): CI do PR #1 falhando e depois corrigido.
- [x] **Merge do PR #2** (`8aa9907`), registrado na seção 1.
- [x] **Trace do Playwright:** `npm run test:producao -- --trace on` → 5/5; um trace por teste (`trace-P1-producao.zip` a
  `trace-P5-producao.zip`), com o caminho local trocado por `<local>`, para o Moodle. Abrir com
  `npx playwright show-trace <arquivo>` ou em https://trace.playwright.dev.
- [ ] **Revisão e merge do PR #3** (este relatório e as evidências) e registro do **hash de entrega** na seção 1.
- [ ] **Aviso do GitHub Actions:** `actions/checkout@v4`, `actions/setup-node@v4` e `actions/upload-artifact@v4` usam Node 20, obsoleto (hoje forçado para Node 24); atualizar as versões num PR futuro.
- [ ] **Preview atrás de login:** decidir se mantém a proteção (recomendado); o conteúdo foi comprovado na produção.

Prints e traces ficam **fora do repositório** e são entregues no Moodle (`evidencias/prints/` já está no `.gitignore`).
