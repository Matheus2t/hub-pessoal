# 2T Learn — Preparação final (C1–C5)

## Avaliação de respostas abertas

Não há nesta versão um avaliador semântico validado, revisor linguístico autenticado ou adjudicação editorial dos exemplos. Portanto, respostas abertas continuam `uncertain`, `pending`, `rubricWithReview`, sem `feedback` gravado e sem classificação por texto literal. Variantes, erros gramaticais e respostas ambíguas não são promovidos automaticamente a corretos ou incorretos.

O módulo `frontend/src/learn/open-review-contract.ts` deriva uma ficha de revisão contextual, sem alterar o evento imutável. A ficha reúne idioma, unidade/versão, tarefa, enunciado, contexto, resposta e ajudas com indicação de quando foram exibidas. Critérios são apresentados como pontos para revisão, não como decisão automática. O componente `learn-open-response-review` permite baixar o JSON somente após ação explícita do usuário; não transmite dados a terceiros. A ficha não é uma avaliação humana e não altera IndexedDB nem os backups v1/v2/v3.

As fichas aparecem no feedback de produção aberta dos pilotos C1/C2, diagnóstico C3 e revisão espaçada C4. No diagnóstico, listening continua não avaliado sem áudio validado. O teclado fonético do Russo permanece um apoio de digitação e é registrado como ajuda.

## Experiência e acesso

Foi acrescentada navegação compacta entre percurso integrado, diagnóstico, aula-piloto, revisões, plano diário e acompanhamento. Ela só aparece quando `learn-preview=c5-integration` está ativo em `localhost`, `127.0.0.1` ou `::1`; as proteções existentes das rotas continuam obrigatórias. O fluxo legado permanece sem alterações. A ficha usa superfícies e tokens monocromáticos existentes, foco visível, estrutura semântica e quebra responsiva.

## Persistência e compatibilidade

- Nenhuma migração, atualização de versão do IndexedDB, edição de evento histórico ou mudança de contrato de backup.
- A ficha é derivada sob demanda e exportada localmente; não é gravada nem sincronizada.
- Inglês e Russo permanecem isolados pelos eventos existentes.
- Uma correção semântica automática permanece bloqueada até haver rubricas calibradas com revisão linguística e validação com aprendizes, ou um serviço avaliador aprovado explicitamente quanto a custo, privacidade e consentimento.

## Validação desta entrega

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado, incluindo typecheck e bundles Lit/esbuild + SCSS.
- Dez validadores `learn:*`: aprovados (`audit`, pedagogia, diagnósticos, qualidade, cobertura, leitura, curadoria, rubricas, revisões e readiness). Os próprios validadores mantêm explícito que a revisão linguística/pedagógica humana ainda é necessária.
- Playwright Chromium, regressão Learn completa C1–C5: **111/111 aprovados**.
- Playwright focado na navegação C5 em 320/390/768/1366px e nos temas claro/escuro: **1/1 aprovado**.
- `git diff --check`: aprovado após a revisão final do diff.

Os resultados confirmam o funcionamento técnico local, não certificação pedagógica nem autorização para liberar as novas experiências a estudantes.
