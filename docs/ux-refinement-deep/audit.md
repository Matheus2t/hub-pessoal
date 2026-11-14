# 2T — refinamento visual profundo

## Escopo e critério

Auditoria visual local de 21 rotas. A linha de base registra geometria em 1366 e 390 px nos dois temas (84 combinações); a validação posterior cobre 320, 390, 768, 1024, 1366, 1440 e 1920 px nos dois temas (294 combinações). O relatório mede overflow horizontal do documento: **0 casos** em ambas as amostras. As capturas raster “antes” são parciais (63 imagens: desktop claro/escuro e celular escuro); as capturas “depois” incluem 92 imagens em `evidence/after/`. Não há imagem “antes” em tema claro para celular. Os dois arquivos `metrics.json` registram os respectivos conjuntos de medidas.

As mudanças se limitaram aos problemas que a comparação confirmou. Telas visualmente consistentes foram mantidas sem alterações para preservar o design aprovado.

## Decisões por área

| Área | O que foi observado | Mudança e motivo | Evidência |
|---|---|---|---|
| Início e navegação | Cabeçalho, hierarquia da página e acesso às áreas estavam equilibrados nas larguras e temas amostrados. | Sem alteração: a composição já separa a identidade da plataforma dos acessos às áreas sem criar ruído visual. | `evidence/before/` e `evidence/after/`: `home-*` |
| Catálogo de Calculadoras | Busca e cartões mantiveram alinhamento e leitura em desktop e celular. | Sem alteração; não havia ganho demonstrável que justificasse mexer na distribuição aprovada. | `calculator-catalog-*` |
| Calculadoras | No estado vazio de juros compostos, a coluna de resultados terminava bem antes do formulário, deixando a grade desequilibrada. Juros simples, PRICE, SAC e aposentadoria foram inspecionados e preservados. | O painel vazio passa a ocupar duas faixas da grade e centraliza a instrução. O resultado acompanha a altura visual do formulário sem alterar campos ou cálculos. | `compound-*`; geometria em `metrics.json` |
| Mercado de Ações | Em telas estreitas, atalhos de análise ficavam comprimidos em uma faixa horizontal. Widgets TradingView podem permanecer em carregamento quando o provedor externo não responde. | Atalhos móveis passam a duas colunas, com área de toque mínima de 44 px e quebra de texto. Widgets e comportamento dos gráficos foram preservados. O placeholder externo não foi tratado como defeito de CSS. | `actions-overview-*`, `actions-company-*`; regressão `market-scroll.spec.ts` |
| Renda Fixa | A alteração anterior para `height:auto` deixou os painéis de formulário e resultado desalinhados no desktop. Em tablet/celular, as duas colunas comprimiam o conteúdo. | Restaurado `height:100%`/stretch para alinhar os painéis no desktop. Até 900 px, formulário e resultado ficam empilhados e com altura natural, mantendo leitura adequada. | `fixed-income-*`; teste de geometria em `deep-layout-composition.spec.ts` |
| Call | O lobby e a prévia local exibiram a hierarquia compacta aprovada nos temas e tamanhos amostrados. | Sem alteração. A inspeção visual não autenticou uma sala privada ativa; não se afirma homologação visual de controles em chamada. | `call-lobby-*`, `call-*` |
| Learn | Visões de início, Inglês, Russo e vocabulário foram observadas. A organização pedagógica e o estado de prévia foram mantidos. | Sem alteração para não tocar em conteúdo, persistência ou proteção das experiências. | `learn-*` |
| Times | Visão geral e páginas dos 76ers, São Paulo e Barcelona foram capturadas. Conteúdo pode variar conforme disponibilidade do provedor esportivo. | Sem alteração: não foi identificada correção de composição suficientemente clara para justificar risco em dados e calendários. | `teams-overview-*`, `team-76ers-*`, `team-spfc-*`, `team-barcelona-*` |
| Games | Catálogo e Sudoku apresentaram proporções e controles coerentes nos exemplos capturados. | Sem alteração; mecânicas e estado dos jogos não foram modificados. | `games-catalog-*`, `game-sudoku-*` |
| Componentes compartilhados | A grade do workspace precisava expressar uma altura maior somente para o estado vazio de juros compostos. | `PanelDefinition.rowSpan` é opcional; o workspace aplica a faixa extra apenas quando declarada e expõe `data-area` para regras de layout específicas. Os demais workspaces mantêm o fluxo existente. | `metrics.json`; `panel-workspace.spec.ts` |

## Implementação

- `frontend/src/panel-preferences.ts`: opção de `rowSpan` por painel.
- `frontend/src/components/panel-workspace.ts`: aplica a opção e marca a área do workspace.
- `frontend/src/components/compound-calculator.ts`: estado vazio de resultados usa duas faixas.
- `frontend/styles/_workspace.scss`: estica e centraliza o estado vazio.
- `frontend/styles/_fixed-income-minimal.scss`: alinha os painéis no desktop e os empilha até 900 px.
- `frontend/styles/_market.scss`: organiza os atalhos de Ações em duas colunas no celular.
- `frontend/tests/deep-visual-refinement.spec.ts`: regressões para painéis da Renda Fixa, estado vazio e atalhos móveis.
- `frontend/tests/deep-layout-composition.spec.ts` e `frontend/tests/panel-workspace.spec.ts`: verificam geometria e selecionam a instância visível correta.
- `scripts/ux-capture.mjs`: reproduz a matriz de 21 rotas, larguras e temas.

Não houve alteração de APIs, lógica financeira, conteúdo, componentes de Times/Learn/Call ou identidade monocromática.

## Validação

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; o conteúdo preexistente `frontend/public/learn/progression-v12.json` foi preservado byte a byte durante os builds.
- Testes visuais focados: 3/3 aprovados.
- `deep-layout-composition.spec.ts`: 14/14 aprovados (sete larguras, dois temas).
- `panel-workspace.spec.ts`: 9/9 aprovados após corrigir o seletor do teste para a instância visível.
- `market-scroll.spec.ts`: 13/13 aprovados em nova execução no Edge. Uma execução anterior da suíte completa havia apresentado deltas de rolagem inconsistentes; a repetição isolada completa passou sem relaxar asserções nem alterar o comportamento de rolagem.
- Testes financeiros de API: 9/9 aprovados.
- Regressão Playwright completa já executada nesta sessão: 593 testes descobertos; 538 passaram, 23 falharam e 32 foram ignorados. As falhas incluíram testes de build público executados no build de desenvolvimento, configuração local de disponibilidade de Ações, comparações estritas de conteúdo existente que não esperavam `translationVariants`, expectativas de calendário esportivo/endpoint desatualizadas e o seletor de workspace (este último foi corrigido e seus 9 testes passaram). A suíte completa não foi repetida depois dessas correções pontuais; portanto, o resultado global permanece **não aprovado**.

As verificações visuais usam browser automation e provedores simulados onde indicado; não representam homologação dos serviços externos, de uma sala Call autenticada ou de dados esportivos/financeiros em produção.

## Produção e limites

O projeto exato `matheus2t` e o deployment de `matheus2t.com.br` não puderam ser confirmados pela integração Vercel disponível nesta execução. Nenhum deploy, merge ou confirmação de produção é declarado. A inspeção das páginas Call limita-se ao lobby/prévia local; sala privada ativa requer credenciais e participantes. TradingView e conteúdo esportivo dependem de provedores externos e podem aparecer carregando/indisponíveis localmente.

O arquivo `frontend/public/learn/progression-v12.json` já estava modificado antes desta tarefa. Foi preservado e não deve ser incluído neste trabalho visual.
