# Servidor MCP local (Marco 5)

`tools/govsafe-mcp.mjs` é um servidor MCP **local, somente de consulta e didático**: stdio, JSON-RPC 2.0, sem
dependências (nada a instalar), sem rede, sem escrita em disco e sem shell. Usa a mesma política do navegador
(`js/politica.js`). O resultado **não é autorização institucional**; use apenas dados fictícios.

## Ferramentas
| Ferramenta | Entrada | Saída |
|---|---|---|
| `listar_regras` | nenhuma | regras R0–R5 em ordem de precedência e a taxonomia |
| `classificar_cenario` | `dado`, `ambiente`, `autonomia` (+ `aprovacao_humana` opcional, ignorado) | `decisao`, `regra`, `motivo`, `alertas` |
| `listar_cenarios_exemplo` | nenhuma | os 8 cenários fictícios com a decisão de cada um |

Entrada inválida devolve erro de ferramenta (`isError`) com decisão `nao_autorizado` (R0): nunca "permitido".

## Uso
```
npm run mcp          # sobe o servidor em stdio (aguarda mensagens JSON-RPC, uma por linha)
npm run test:mcp     # testes: sobem o servidor como subprocesso e conversam pelo protocolo
```

Para registrar no Claude Code (altera a sua configuração; faça por sua conta e risco, na raiz do projeto):
```
claude mcp add govsafe360 -- node tools/govsafe-mcp.mjs
```
