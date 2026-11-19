# Escopo e auditoria inicial — Utilitários

## Fases 0 e 1

Esta entrega prepara a arquitetura compartilhada e as três páginas locais. O Desencurtador ainda não consulta nenhum destino. O Removedor não recebe arquivos e não executa inferência.

Incluído: rotas gated, navegação e breadcrumbs, páginas Lit, estilos responsivos, flags independentes, endpoint local de capacidades, contratos TS/Pydantic e documentação de segurança/roadmap/liberação.

Excluído: redirecionamento HTTP, upload, armazenamento, fila, banco de trabalhos, modelo de IA, editor de imagem, reputação de links, GPU, deploy ou contratação de serviço.

## Estado observado antes da implementação

- Base escolhida: `origin/main`, commit `7775b413e0d5bd78d18ebf9f2dc7a420431a9155`. A referência local `main` estava atrasada em relação a `origin/main` e não foi usada.
- Branch criada: `feature/2t-utilitarios-base`.
- A alteração já existente em `frontend/public/learn/progression-v12.json` foi preservada e excluída do trabalho. O blob no início coincidia com a base, embora o checkout a marcasse como modificada.
- Havia outros worktrees registrados. O PR de refinamento da Renda Fixa (#177) estava em branch separada, não integrado à base escolhida. Esta branch não contém mudanças daquela frente.
- Arquitetura observada: Lit + TypeScript + SCSS + esbuild, roteamento hash em `catalog.ts`/`app-shell.ts`, FastAPI com routers registrados em `backend/app/main.py`, configuração Pydantic Settings e Playwright.
- Nenhuma dependência de aplicação foi adicionada e `vercel.json` não foi alterado.

## Verificações de base

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; o gerador existente escreveu novamente o artefato V12 a partir da fonte rastreada.
- `python -m pytest tests/test_api.py -q` no diretório `backend`: 4 aprovados.
- Uma execução ampla inicial do Pytest parou depois de avançar por vários casos; ela foi interrompida e não foi tratada como falha de código. A execução direcionada acima completou.
- O socket local `127.0.0.1:8123` não estava acessível neste ambiente (EACCES). Os testes de navegador desta entrega servem `dist` por rotas Playwright e não precisam abrir socket.

## Validação desta implementação

- `npm run typecheck`: aprovado após a integração.
- `npm run build`: aprovado tanto com as flags locais ligadas quanto com `VERCEL=1` e as três flags solicitadas como `true`; a build pública mantém os recursos desabilitados.
- `python -m pytest tests/test_utilities_contracts.py tests/test_api.py -q` em `backend/`: 13 aprovados, incluindo flags padrão desabilitadas, loopback/Origin, contratos e ausência das rotas de processamento.
- Playwright com Brave instalado: prévia local 3 aprovados e 1 teste de proteção pública intencionalmente ignorado; build Vercel 2 aprovados e 2 testes locais ignorados. O teste responsivo cobriu 320, 390, 768, 1024, 1366 e 1920 px, em temas claro e escuro, sem overflow horizontal.
- A primeira execução do navegador identificou que o alias local de `globalThis` impedia o esbuild de substituir as flags; o acesso foi ajustado e a prévia passou. Também corrigimos o teste para expandir o menu “Áreas”, que é recolhido por padrão.
- Playwright serviu os arquivos `dist` por interceptação de rotas; não foi possível validar uma sessão via servidor HTTP local porque o ambiente bloqueou o socket. Não houve teste de deployment ou de produção.
