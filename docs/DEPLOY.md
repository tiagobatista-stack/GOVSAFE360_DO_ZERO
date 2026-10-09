# Publicação (Marco 7): GitHub + Vercel

Protótipo didático, **não homologado**. Só dados fictícios. Nada aqui usa segredos, tokens ou variáveis de ambiente.

## O que é publicado
`npm run build` copia **somente** `index.html`, `css/` e `js/` para `public/`. Testes, `tools/` (MCP), `docs/`, `scripts/`,
`package.json`, `.github/` e dependências **não** são publicados (R08). `public/` não é versionado (`.gitignore`):
o Vercel o gera a cada deploy com `npm run build`.

| Comando | Para quê |
|---|---|
| `npm run build` | gera `public/` (recusa pastas de saída perigosas) |
| `npm run check:sync` | confere que `public/` é idêntico à fonte e exibe a versão do `package.json` |
| `npm run test:e2e:public` | roda os testes de navegador contra `public/` |
| `npm run preview` | build + servidor local de `public/` em `http://127.0.0.1:4173` (`PORT=` troca a porta) |
| `npm run dev` | servidor local da fonte (`index.html`, `css/`, `js/`) |

## Configuração do Vercel (`vercel.json`)
- `buildCommand`: `npm run build` · `outputDirectory`: `public` · `installCommand`: `npm ci --omit=dev` (sem Playwright no deploy).
- Cabeçalhos: CSP (`default-src 'none'`, sem inline, sem conexões externas), `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`.
- A mesma CSP (sem `frame-ancestors`, que só vale em cabeçalho) está na `<meta>` do `index.html`, por isso os testes a exercitam.

## Passos que dependem de você (não são feitos pelo Claude)
1. **Pull Request:** a branch `m7-build-vercel` contém este marco. Faça o push e abra o PR para `main`.
2. **CI:** confira o workflow **Qualidade** verde no PR (inclui build, `check:sync` e testes em `public/`).
3. **Vercel:** *Add New Project* → importar `GOVSAFE360_DO_ZERO`. *Framework Preset*: **Other**. Os comandos vêm do `vercel.json`;
   não crie variáveis de ambiente. Cada PR gera uma URL de **Preview**.
4. **Verificar o Preview** (checklist abaixo).
5. **Revisão humana explícita** antes de produção (ver `ARQUITETURA_V16.md`, item 4 dos critérios de pronto).
6. **Merge controlado** do PR em `main`; o Vercel publica a URL de **produção**.

## Checklist do Preview/Produção
- [ ] A URL abre o painel com 8 cenários e totais 2/4/2.
- [ ] O rodapé mostra a versão (**0.7.0**) e o aviso "não homologado" aparece no topo.
- [ ] Cadastro persiste após F5; revisão, exportação CSV/JSON funcionam.
- [ ] Console do navegador sem erros e aba *Network* sem requisições para outros domínios.
- [ ] `https://<url>/package.json`, `/tools/govsafe-mcp.mjs` e `/docs/REQUISITOS.md` retornam 404.
- [ ] Cabeçalhos de segurança presentes (DevTools → Network → resposta do documento).
- [ ] Nenhum dado real foi digitado ou publicado.

## Reverter
Vercel → *Deployments* → promover um deploy anterior; ou `git revert` do merge e novo push.
