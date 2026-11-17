# Plano de implementação — Utilitários 2T

## Fase 0 — Preparação (concluída)

- Inspecionar navegação, build, API, configuração e testes existentes.
- Registrar base, worktree e verificações iniciais em `scope.md`.
- Isolar o trabalho em `feature/2t-utilitarios-base`.

## Fase 1 — Arquitetura compartilhada (concluída nesta branch)

- Rotas locais, breadcrumbs, páginas-base e SCSS compartilhado.
- Flags independentes em build/frontend e FastAPI, todas desabilitadas por padrão.
- Endpoint de capacidades local, sem operações de ferramenta.
- Tipos TypeScript e modelos Pydantic futuros; testes de contrato e bloqueio.
- Documentação de arquitetura, escopo, segurança e release.

## Fase 2 — Motor do Desencurtador (não iniciado; próximo passo)

1. Definir política de esquemas, portas, limites e respostas.
2. Implementar cliente HTTP com redirecionamentos manuais e timeouts/budgets.
3. Fazer resolução DNS segura e conectar ao IP validado, revalidando cada salto.
4. Implementar bloqueio de SSRF/DNS rebinding, limite de saltos, bytes e taxa.
5. Integrar o endpoint tipado e a interface, sem alegações de reputação não verificadas.
6. Testar com DNS/HTTP locais controlados e casos de IP privado, redirect, loop, timeout e troca DNS; não acessar destinos arbitrários em testes.
7. Manter flag desativada fora de ambiente explicitamente autorizado até revisão de segurança.

## Fase 3 — Upload e contratos de trabalhos do Removedor (não iniciada)

Selecionar armazenamento privado temporário, autorização, URLs assinadas, limites de arquivo e ciclo de vida. Implementar upload e estados sem ativar IA até revisar privacidade, custo e isolamento.

## Fase 4 — Pesquisa e benchmark de modelos do removedor (harness pronto; homologação pendente)

Esta etapa implementa apenas um harness de avaliação isolado em `services/background-research/`; não é worker nem endpoint e não altera as flags/deploy. A execução atual comparou o baseline em 80 casos sintéticos e fez um smoke test de um avançado. A amostra fotográfica P3M depende do aceite humano do acordo; o lote avançado, CUDA, avaliação visual humana mais ampla e revisão final de licença seguem pendentes. A decisão de modelo e o worker de produção dependem dessas evidências.

## Fase 5 — Homologação e lançamento (não iniciada)

Revisão de segurança, acessibilidade, limites, privacidade, observabilidade, testes de abuso, política de retenção, custo operacional e plano de rollback. Ativar uma flag por ferramenta apenas após aprovação e deployment apropriado.
