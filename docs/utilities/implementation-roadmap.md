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

## Fase 2 — Motor do Desencurtador (implementado; CI aprovado, aguardando revisão do PR)

1. Definir política de esquemas, portas, limites e respostas.
2. Implementar cliente HTTP com redirecionamentos manuais e timeouts/budgets.
3. Fazer resolução DNS segura e conectar ao IP validado, revalidando cada salto.
4. Implementar bloqueio de SSRF/DNS rebinding, limite de saltos, bytes e taxa.
5. Integrar endpoint tipado local; a tela não chama a API até a Fase 3 e reputação continua `false`.
6. Adicionar testes controlados para DNS/IP, redirects, loops, timeout, TLS/SNI, limites e guardas locais, sem destinos arbitrários.
7. Manter flags desativadas por padrão; Vercel retorna 404 mesmo se as flags forem configuradas.

Validação no GitHub Actions: suíte Python completa aprovada no Ubuntu (439 aprovados, 5 ignorados) e Windows (443 aprovados, 1 ignorado). Typecheck, build e browser smoke tests também passaram. O sandbox Windows local bloqueou o socketpair do event loop padrão; os testes direcionados locais usaram transportes sintéticos. Não houve handshake TLS real nem acesso a destinos externos. Revisão de segurança ainda é necessária antes de integrar.

## Fase 3 — Upload e contratos de trabalhos do Removedor (não iniciada)

Selecionar armazenamento privado temporário, autorização, URLs assinadas, limites de arquivo e ciclo de vida. Implementar upload e estados sem ativar IA até revisar privacidade, custo e isolamento.

## Fase 4 — Worker de remoção de fundo (não iniciada)

Comparar modelos/candidatos, incluindo BiRefNet e alternativas, com conjunto de avaliação autorizado. Medir qualidade, bordas, cabelo/transparência, latência, GPU, memória e custo. Isolar processamento e validar limpeza/cancelamento.

## Fase 5 — Homologação e lançamento (não iniciada)

Revisão de segurança, acessibilidade, limites, privacidade, observabilidade, testes de abuso, política de retenção, custo operacional e plano de rollback. Ativar uma flag por ferramenta apenas após aprovação e deployment apropriado.
