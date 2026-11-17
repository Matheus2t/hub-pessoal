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
5. Integrar endpoint tipado local; reputação continua `false`.
6. Adicionar testes controlados para DNS/IP, redirects, loops, timeout, TLS/SNI, limites e guardas locais, sem destinos arbitrários.
7. Manter flags desativadas por padrão; Vercel retorna 404 mesmo se as flags forem configuradas.

Validação histórica da Fase 2 no GitHub Actions: suíte Python aprovada no Ubuntu (439 aprovados, 5 ignorados) e Windows (443 aprovados, 1 ignorado), além de typecheck, build e browser smoke tests. Naquela execução local, o sandbox bloqueou o socketpair e não houve handshake TLS real; a limitação foi superada nesta Fase 3 com servidor TLS controlado em loopback.

## Fase 3 — Interface do Desencurtador (implementada nesta branch; PR aguardando revisão)

- Integrar página Lit ao endpoint local com estados por resposta, validação básica, cancelamento e limite do cliente.
- Apresentar somente destino final confirmado, status HTTP observado, avisos e saltos realmente registrados; sem navegação ou persistência de URLs.
- Manter o recurso restrito a loopback e às flags locais; produção Vercel continua bloqueada.
- Validar formulário, erros, responsividade, acessibilidade e fluxo completo com API FastAPI real e servidor TLS efêmero em loopback.
- Validação desta branch: typecheck e builds de prévia e produção aprovados; 89 testes Python focados aprovados; Playwright de prévia 12 aprovados e 1 ignorado, e gate de produção 2 aprovados e 2 testes locais ignorados. Layouts verificados em 320, 390, 768, 1024, 1366, 1440 e 1920 px, nos dois temas. TLS testado somente em loopback.

## Fase 4 — Upload e contratos de trabalhos do Removedor (não iniciada)

Selecionar armazenamento privado temporário, autorização, URLs assinadas, limites de arquivo e ciclo de vida. Implementar upload e estados sem ativar IA até revisar privacidade, custo e isolamento.

## Fase 5 — Worker de remoção de fundo (não iniciada)

Comparar modelos/candidatos, incluindo BiRefNet e alternativas, com conjunto de avaliação autorizado. Medir qualidade, bordas, cabelo/transparência, latência, GPU, memória e custo. Isolar processamento e validar limpeza/cancelamento.

## Fase 6 — Homologação e lançamento (não iniciada)

Revisão de segurança, acessibilidade, limites, privacidade, observabilidade, testes de abuso, política de retenção, custo operacional e plano de rollback. Ativar uma flag por ferramenta apenas após aprovação e deployment apropriado.
