# Auditoria global de UX/UI — 2T

Data: 2026-11-14
Base auditada: produção `matheus2t.com.br` e build local no Chromium/Edge.
Branch: `codex/2t-global-ux-redesign`, baseada no `origin/main` em `973e2f75`.

## Método e evidências

- Navegação visual nas principais rotas da homepage, calculadoras, Ações, Renda Fixa, Times, Learn, Call, Games e calendário.
- 39 rotas capturadas em desktop e celular; 702 verificações de largura nos viewports 320, 375, 390, 600, 768, 1024, 1366, 1440 e 1920 px, em tema claro e escuro.
- Capturas anteriores: `C:/Users/mathe/.codex/visualizations/2026/10/30/01a18a81-e280-7cb0-8545-bc3572826a28/2t-global-ux/before/`.
- Não foram observados erros de página no carregamento das rotas capturadas. A disponibilidade de dados de terceiros variou durante a inspeção; widgets esportivos e financeiros em carregamento foram tratados como estado de ambiente, não como falha visual do produto.
- Encontrado overflow horizontal em TERMO a 320 px nos dois temas: documento com 330 px para viewport de 320 px.

## Matriz de problemas

| Área / rotas inspecionadas | O que funciona | Problema observado / severidade | Proposta e preservação |
| --- | --- | --- | --- |
| Início | Acessos diretos às seis áreas, calendário discreto, cartões com previews | Call e Games ocupam faixas grandes; quatro áreas principais têm igual peso e composição repetida (média) | Hierarquia editorial entre áreas, atalhos compactos e grupo principal responsivo; preservar links e Games após o grupo |
| Calculadoras: catálogo e oito simuladores | Formulários, cálculos e histórico claros | Busca e resultados sem padrão consistente; estado inicial pode deixar grandes áreas vazias; ação principal não é igualmente evidente (média) | Reforçar título/ação, agrupamento do formulário e estado inicial de resultado; manter fórmulas e dados |
| Ações: panorama, empresas, comparação, rankings e proventos | Universo amplo de dados e visualizações | Navegação interna distribuída; alguns widgets externos ficam visualmente vazios enquanto carregam; tabelas longas exigem orientação (média) | Unificar toolbar e hierarquia terminal, indicar agrupamentos e preservar alturas/âncoras que mantêm a rolagem estável; sem mexer na integração |
| Renda Fixa | Simulação líquida, comparação e detalhes técnicos | Formulário e resumo competem por atenção; estado vazio pode parecer resultado incompleto (média) | Priorizar ação e resultado/estado vazio, manter custos, impostos, hipóteses e simuladores |
| Times: visão geral, agenda, 76ers, São Paulo e Barcelona | Identidades próprias e dados contextualizados | Próximos jogos e classificações perdem alinhamento em larguras estreitas; listas longas precisam de hierarquia (média) | Melhorar cabeçalhos, alinhamento e overflow de tabelas; preservar identidade e diferenças de cada clube, sem alterar fontes de dados |
| Learn: seleção, inglês, russo, atividades e áudio | Melhor base de hierarquia, contexto e agrupamento; controles de aprendizagem claros | Rotas de versões diferentes têm densidade e escala tipográfica distintas; estados e áudio variam entre gerações (média) | Tomar os padrões mais claros do Learn como base, consolidar tokens e refinamentos locais; não alterar pedagogia, progresso, áudio nem proteção |
| Call: lobby e sala | Fluxo e controles funcionais, estados explícitos | Lobby divide atenção entre dois painéis; na sala controles e participantes competem em telas pequenas (média) | Dar prioridade à entrada/estado da sala e agrupar controles; preservar todos os controles essenciais e o comportamento WebRTC |
| Games: catálogo e dez jogos | Mecânicas identificáveis, controles e recordes locais | Componentes de entrada variam entre jogos; TERMO tem overflow em 320 px (média/alta para celular) | Unificar somente elementos compartilhados e instruções; manter layouts específicos de cada mecânica e corrigir TERMO |
| Calendário e diálogos | Calendário abre sob demanda, navega e fecha por Escape | Cabeçalho e ações podem ficar apertados em celular (baixa) | Refinar largura, espaçamento e foco sem alterar feriados nem navegação |
| Navegação global | Logo, Início, Games, Times e escudos diretos | Calculadoras, Ações, Renda Fixa, Learn e Call dependem da home; ocupação dos escudos prejudica o cabeçalho móvel (alta) | Adicionar menu nativo “Áreas” com acessos diretos, manter Times/Games e levar os escudos para o menu Times em telas estreitas |

## Direção visual

- Monocromia funcional: preto, branco e cinzas para identidade; cores já usadas por dados, clubes e jogos permanecem apenas quando codificam significado.
- Hierarquia tipográfica baseada em Geist: títulos compactos, leitura confortável, dados tabulares e textos auxiliares com contraste AA.
- Menos superfícies competindo: painéis apenas para grupos de trabalho; divisórias e espaçamento para separar informação secundária.
- Escala comum de espaçamento, raios, controles, foco e movimento, preservando padrões necessários a cada domínio.
- Navegação global por áreas, navegação contextual e títulos/breadcrumbs existentes sem duplicar o nome da página.
- Cada módulo recebe ajustes próprios; não padronizar visualmente os clubes, jogos, gráficos, aulas ou estados de chamada.

## Escopo de implementação

Tokens e componentes comuns; navegação e homepage; refinamentos focados nas famílias de calculadoras, Ações, Renda Fixa, Times, Learn, Call, Games e diálogos. As mudanças são exclusivamente de apresentação, composição e navegação, salvo correções de acessibilidade/overflow. A auditoria final comparará capturas nos dois temas e nos viewports documentados.

## Resultado da implementação e validação

- Tokens monocromáticos e estados comuns foram consolidados; a navegação ganhou o menu responsivo “Áreas”, mantendo Início, Games, Times e atalhos de escudos. A homepage agora hierarquiza Calculadoras, Ações, Renda Fixa e Learn, com acessos compactos para Call e Games.
- Foram aplicados refinamentos de layout aos módulos existentes sem alterar cálculos, dados, fontes esportivas, currículo/persistência do Learn ou lógica WebRTC. O gráfico da calculadora foi ajustado para usar tokens neutros e padrões de linha para diferenciar séries. O cabeçalho móvel de TERMO foi corrigido para evitar o overflow de 320 px identificado na auditoria.
- Revisão visual realizada nos temas claro/escuro e em desktop/celular; Playwright confirmou dimensões responsivas e ausência de overflow nos casos cobertos.

### Validações executadas

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Aprovado |
| `npm run build` (TypeScript, esbuild e Sass) | Aprovado após os ajustes finais de SCSS |
| Playwright: 15 specs relevantes, excluindo somente o smoke integrado HTML/API/resultado financeiro | 117 aprovados; 0 falhas |
| Regressão dedicada `market-scroll.spec.ts` | O CI detectou conflito causado por `scroll-behavior: smooth` global; removido o comportamento global e repetida a suíte no Edge com provedor isolado: 13/13 aprovados nos cinco viewports e cenários de widgets/iframe |
| Navegação Ações `market-nav.spec.ts` | O CI revelou asserções ainda vinculadas ao antigo destaque por fundo; adaptadas ao sublinhado ativo e aprovadas localmente no Edge: 4/4 |
| Cobertura visual automatizada | Incluiu 320, 390, 600, 768, 1024, 1366, 1920 px e ambos os temas, nos specs aplicáveis |
| `git diff --check` | Aprovado; Git emitiu apenas avisos de conversão LF/CRLF em arquivos existentes |
| Pytest completo | Iniciado com `PYTHONPATH=backend`, mas não terminou: ficou sem progresso após os primeiros casos e foi interrompido. Resultado inconclusivo, não aprovado |
| Smoke integrado `/api/health` + cálculo | Não executado com sucesso: o servidor estático local usado pela suíte retorna 404 para `/api/health`. Isso não testa o backend FastAPI integrado; a regressão de API permanece pendente |

O teste Playwright integrado excluído exige frontend e API FastAPI disponíveis juntos. Não houve alteração de backend; por isso, o resultado da suíte não deve ser interpretado como validação da API. O primeiro CI do PR encontrou a rolagem global concorrendo com os gestos de Ações; a correção passou os 13 casos de scroll no Edge e no segundo CI. Esse CI também identificou expectativas visuais antigas em `market-nav.spec.ts`; foram atualizadas para o destaque por sublinhado e os quatro casos passaram localmente. A nova execução de CI após esse ajuste ainda deve ser acompanhada. A implantação e a validação de produção devem ser registradas separadamente após a publicação.

### Pendências de homologação

- Reexecutar Pytest em ambiente com progresso e confirmar a regressão backend, caso o pipeline do repositório a exija para esta mudança transversal.
- Executar o smoke integrado do frontend e da API em ambiente que sirva ambos, incluindo `/api/health` e um cálculo real.
- Confirmar o commit implantado e o domínio `matheus2t.com.br` no projeto Vercel `matheus2t`; build local aprovado não comprova deploy de produção.
