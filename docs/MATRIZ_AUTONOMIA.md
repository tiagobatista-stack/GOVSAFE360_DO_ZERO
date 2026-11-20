# Matriz de autonomia — 5 cenários fictícios

Protótipo didático, **não homologado**. Os cenários são fictícios e descrevem o uso de IA na construção do próprio
GOVSAFE 360. A decisão de cada linha é a que `js/politica.js` (`GovPolitica.classificar`) produz para a combinação
dado × ambiente × autonomia — a conferência está no fim deste documento. Versão em planilha:
[`MATRIZ_AUTONOMIA.csv`](MATRIZ_AUTONOMIA.csv) (UTF-8 com BOM, separador `;`).

| # | Cenário | Tipo de dado | Ambiente | Autonomia | Decisão | Justificativa | Revisor humano | Como reverter |
|---|---|---|---|---|---|---|---|---|
| C1 | IA lê os 8 exemplos fictícios do app e resume o painel | Público | Desenvolvimento | Leitura | **Permitido** (R5) | Dado público em desenvolvimento, só leitura: nada é alterado | Não exigido pela política; conferência opcional do resultado | Descartar o resumo; nada foi alterado |
| C2 | IA edita o README na branch de trabalho | Interno | Desenvolvimento | Edição | **Condicionado** (R4) | Edição exige diff mostrado e OK humano antes do commit | Responsável pelo repositório (aprova o diff) | `git restore README.md` antes do commit; `git revert <hash>` depois |
| C3 | IA consulta status HTTP e cabeçalhos da produção e registra em evidência | Público | Produção | Leitura | **Condicionado** (R3) | Só leitura em produção, sem ação real; o registro não pode conter dados sensíveis | Responsável pelo repositório (confere o arquivo de evidência) | Apagar o arquivo de evidência local; a produção não muda |
| C4 | IA executa publicação em produção por conta própria | Interno | Produção | Execução | **Não autorizado** (R2) | Execução em produção não é delegável; ver o achado real abaixo | Responsável pelo repositório (aprova o PR e faz o merge) | Rollback da Vercel para o deployment anterior ou `git revert` do merge via PR (Etapa 7) |
| C5 | IA usa token, senha ou código MFA para logar e publicar na Vercel ou no GitHub | Credencial | Produção | Execução | **Não autorizado** (R1) | Credencial nunca é delegada, nem com revisão humana | Responsável pelo repositório (faz o login sozinho) | Revogar ou trocar a credencial e registrar o ocorrido |

Cobertura: 1 Permitido (C1), 2 Condicionado (C2, C3), 2 Não autorizado (C4, C5); regras R1, R2, R3, R4 e R5.

## C4 — motivação: achado real de 2026-11-20

**Evidência** (`evidencias/05-producao-antes.txt`): a produção https://govsafe360dozero.vercel.app serve a `main`
`1ac736c`, anterior à M7. Sem `vercel.json` e sem `public/`, a Vercel usou o diretório padrão `.` e publicou a raiz do
repositório: `/CLAUDE.md`, `/docs/REQUISITOS.md`, `/tools/govsafe-mcp.mjs` e `/tests/politica.test.mjs` respondem 200, e os
cabeçalhos CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy e Permissions-Policy estão ausentes. O conteúdo
é o mesmo do repositório público (só dados fictícios), mas publicar mais do que o necessário é exatamente o risco que a
regra R2 evita ao não delegar a execução em produção.

**Correção** (commit `096aef3`, branch `m7-build-vercel`, entregue pelo PR #1 e pelo merge `45d3f0e`):
- `npm run build` gera `public/` só com `index.html`, `css/` e `js/`; `npm run check:sync` confere a cópia;
- `vercel.json` define `buildCommand: npm run build`, `outputDirectory: public` e os cabeçalhos de segurança (CSP,
  X-Content-Type-Options, X-Frame-Options `DENY`, Referrer-Policy `no-referrer`, Permissions-Policy).

**Caminho controlado:** a IA prepara o código e abre o PR (com OK); o CI "Qualidade" e o Preview da Vercel são conferidos;
o **merge é humano** e é ele que dispara o novo Production pela integração Git. A IA não publica nem mexe na Vercel.

**Situação:** correção **comprovada em 2026-11-20**. O caminho controlado foi seguido: a IA abriu o
[PR #1](https://github.com/tiagobatista-stack/GOVSAFE360_DO_ZERO/pull/1) com OK, o CI "Qualidade" ficou verde, o responsável
fez o merge (`45d3f0e`) e a Vercel publicou o Production desse hash pela integração Git. Comparação
`evidencias/05-producao-antes.txt` × `evidencias/04-producao.txt`:

| Verificação na produção | Antes (`1ac736c`) | Depois (`45d3f0e`) |
|---|---|---|
| `/CLAUDE.md`, `/docs/REQUISITOS.md`, `/tools/govsafe-mcp.mjs`, `/tests/politica.test.mjs` | 200 | **404** |
| CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | ausentes | **presentes** |
| Subtítulo / versão no rodapé | "Marco 4" / sem versão | "Marco 7" / **0.7.0** |

**Como reverter:** Instant Rollback no painel da Vercel para o deployment anterior (feito pelo responsável) ou
`git revert -m 1 45d3f0e` na `main` via novo PR. A escolha entre os dois é detalhada na Etapa 7.

## Notas
- "Revisor humano" indica um **papel**, não uma pessoa.
- A revisão humana **não altera** a decisão: `classificar()` aceita e ignora `aprovacao_humana` de propósito.
- Precedência das regras: R0 → R1 → R2 → R3 → R5 → R4 (a primeira que casar decide).

## Conferência com a política

Script local (fora do repositório) que lê `docs/MATRIZ_AUTONOMIA.csv`, converte os rótulos para a taxonomia e compara
a coluna "decisão" com `GovPolitica.classificar()`:

```
C1 publico/desenvolvimento/leitura -> permitido (R5) | CSV: Permitido | OK
C2 interno/desenvolvimento/edicao -> condicionado (R4) | CSV: Condicionado | OK
C3 publico/producao/leitura -> condicionado (R3) | CSV: Condicionado | OK
C4 interno/producao/execucao -> nao_autorizado (R2) | CSV: Não autorizado | OK
C5 credencial/producao/execucao -> nao_autorizado (R1) | CSV: Não autorizado | OK
5/5 conferem
```
