# Plano de implementação — Utilitários 2T

## Fase 0 — Preparação (concluída)

- Inspecionar navegação, build, API, configuração e testes existentes.
- Registrar base, worktree e verificações iniciais em `scope.md`.
- Isolar o trabalho em `feature/2t-utilitarios-base`.

## Fase 1 — Arquitetura compartilhada (implementada no PR #179; integração pendente)

- Rotas locais, breadcrumbs, páginas-base e SCSS compartilhado.
- Flags independentes em build/frontend e FastAPI, todas desabilitadas por padrão.
- Endpoint de capacidades local, sem operações de ferramenta.
- Tipos TypeScript e modelos Pydantic futuros; testes de contrato e bloqueio.
- Documentação de arquitetura, escopo, segurança e release.

## Fase 2 — Motor do Desencurtador (implementado no PR #180; integração pendente)

O PR #180 contém o motor local, as proteções SSRF/DNS e os testes descritos no próprio PR. A branch depende do PR #179 e ainda não está integrada à `main`.

## Fase 3 — Interface do Desencurtador (implementada no PR #181; integração pendente)

O PR #181 contém a interface local do Desencurtador e depende do PR #180. **Upload e contratos de trabalhos do Removedor** continuam não iniciados; armazenamento privado, autorização, URLs assinadas, limites e ciclo de vida precisam de decisão própria antes de qualquer implementação.

## Fase 4 — Pesquisa e benchmark de modelos do Removedor (harness implementado no PR #182; integração pendente)

Esta etapa implementa apenas um harness de avaliação isolado em `services/background-research/`; não é worker nem endpoint e não altera as flags/deploy. A execução atual comparou o baseline em 80 casos sintéticos e fez um smoke test de um avançado. A amostra fotográfica P3M depende do aceite humano do acordo; o lote avançado, CUDA, avaliação visual humana mais ampla e revisão final de licença seguem pendentes. A decisão de modelo e o worker de produção dependem dessas evidências.

## Fase 5 — Homologação e lançamento (não iniciada)

Revisão de segurança, acessibilidade, limites, privacidade, observabilidade, testes de abuso, política de retenção, custo operacional e plano de rollback. Ativar uma flag por ferramenta apenas após aprovação e deployment apropriado.

## Estado dos PRs paralelos — 2026-11-17

- PR #179 (base dos Utilitários): aberto, ainda não integrado à `main`.
- PR #180 (motor do Desencurtador): aberto sobre #179.
- PR #181 (interface do Desencurtador): aberto sobre #180.
- PR #182 (harness do Removedor): aberto sobre #179.
- O PR da Fase 4.1 deriva do head `18bd31911a958abe814213205b51ee57aac92efa` de #182 e deve ter #182 como base. As cadeias são paralelas; não afirmar que as Fases 2/3 ou o Removedor já estão em produção.

A Fase 4.1 está **parcialmente concluída**: harness e relatório foram preparados, mas fotografias reais/licenciadas, execução pareada em fotos, validação CUDA, revisão visual humana e decisão de modelo permanecem pendentes. Consulte `services/background-research/docs/phase-4.1-homologacao.md`.
