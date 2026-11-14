# 2T — auditoria de layout e refinamento

Data: 2026-11-14

Branch: `codex/2t-layout-refinement-deep-main`

Base visual: conteúdo de `main` integrado pelos PRs #158 e #159.

## Escopo

Revisão visual direcionada a páginas existentes, sem alterar funcionalidades, cálculos, integrações ou identidade. A inspeção cobriu Início e catálogo, calculadoras, Ações, Times, Renda Fixa, Call, Learn e Games/Sudoku. Só foram corrigidas três diferenças de composição reproduzidas com medidas no navegador.

| Área | Resultado da inspeção | Alteração |
| --- | --- | --- |
| Início e catálogo | Alinhamento e densidade equilibrados | Nenhuma |
| Calculadoras | Formulário e resultados sem desvio estrutural reproduzido | Nenhuma |
| Ações | Gráfico e painel de mercado mantidos; sem mudança nesta tarefa | Nenhuma |
| Times | Seções alinhadas no estado verificado; sem mudança | Nenhuma |
| Games e Sudoku | Composição responsiva adequada na inspeção | Nenhuma |
| Renda Fixa | Resultado vazio ocupava a altura do formulário | Altura intrínseca no painel vazio |
| Call | Cartão da sala permanente esticava até a altura do formulário privado | Cards alinhados ao topo e dimensionados pelo conteúdo |
| Learn — acompanhamento | Quatro resumos curtos formavam uma coluna longa | Resumo em duas colunas; uma coluna em telas estreitas |

## Medidas reproduzidas

Playwright Chromium, viewport de 1366 px, antes e depois. Os elementos continuam alinhados no topo:

| Área | Antes | Depois |
| --- | --- | --- |
| Renda Fixa: formulário / resultado vazio | 498,1 / 498,1 px | 498,1 / 318,5 px |
| Call: sala permanente / chamada privada | 331,9 / 331,9 px | 207,7 / 331,9 px |
| Learn: painel de resumo | 267,5 px, quatro linhas | 157,8 px, grade 2 × 2 |

No Learn, os quatro títulos antes começavam em `y=452,7`, `509,7`, `566,7` e `623,7` px, cada um ocupando 1150 px. Depois, cada coluna mede 559 px; os títulos das duas colunas alinham-se em cada linha. Abaixo de 701 px, o resumo volta a uma coluna.

### Capturas comparativas — desktop escuro

| Área | Antes | Depois |
| --- | --- | --- |
| Renda Fixa | [1366 px](evidence/before/fixed-income-1366-dark.png) | [1366 px](evidence/after/fixed-income-1366-dark.png) |
| Call | [1366 px](evidence/before/call-1366-dark.png) | [1366 px](evidence/after/call-1366-dark.png) |
| Learn | [1366 px](evidence/before/learn-dashboard-1366-dark.png) | [1366 px](evidence/after/learn-dashboard-1366-dark.png) |

Capturas adicionais de celular (390 px) e tema claro estão em `evidence/before/` e `evidence/after/`. O teste também verifica 320, 768, 1024, 1440 e 1920 px.

## Implementação

- **Renda Fixa:** remove `height: 100%` dos painéis de entrada e resultado; o painel vazio passa a usar sua altura de conteúdo.
- **Call:** remove a altura mínima fixa dos cartões do lobby e impede o esticamento vertical; mantém duas colunas no desktop e empilhamento já existente em telas menores.
- **Learn:** envolve cada resumo existente em um contêiner sem mudar valores, critérios ou recomendações. A grade compacta alinha os itens no desktop e empilha em telas estreitas.
- Outras áreas, endpoints, cálculos, integrações e dados permanecem inalterados.

## Validação

- `npm run build` — aprovado; o script também executa `npm run typecheck` (`tsc --noEmit`).
- `frontend/tests/deep-layout-composition.spec.ts` — **14/14 aprovados**: 7 larguras × temas escuro e claro. Cada caso visita Renda Fixa, Call e Learn e verifica overflow horizontal em cada rota. As capturas comparativas abrangem 1366 e 390 px nos dois temas.
- Regressões Playwright direcionadas — **39/39 aprovadas**: `call-landing-minimal.spec.ts`, `fixed-income-layout.spec.ts`, `fixed-income.spec.ts` e `learn-mobile-ux-v22.spec.ts`.
- `git diff --check` — aprovado.
- A medição de baseline foi executada intencionalmente antes das alterações: os dois casos desktop apontaram os três desequilíbrios descritos; os casos mobile passaram. Isso registra a condição anterior, não é falha da versão final.
- A revisão visual pós-alteração confirmou desktop e celular, nos temas escuro e claro, sem overflow horizontal nas rotas cobertas.

## Publicação

Não foi possível validar o projeto Vercel `matheus2t` pelo conector disponível: a consulta não retornou esse projeto. Nenhum outro projeto foi usado como substituto. Portanto, este relatório não afirma preview, merge, deploy ou estado de produção. A integração e publicação ficam pendentes até que o projeto correto esteja acessível e o preview desta branch seja verificado.
