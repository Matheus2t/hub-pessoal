# 2T Learn — Homologação técnica final

Data: 2026-11-11

Base examinada: `main` em `16a280a363e84d07766dabd4f3eba31b359a2475`

Árvore local de validação: idêntica à árvore dessa `main`.

## Checklist técnico

- [x] Inglês e Russo: isolamento de tentativas, eventos, progresso, plano e resumo coberto pela regressão.
- [x] Acesso: C1–C5 exige hostname loopback e flag específica; host público, domínio oficial e subdomínios Vercel não habilitam a prévia. A flag é uma seleção de interface, não autenticação.
- [x] Persistência: IndexedDB v3 mantém stores legadas; atualização aditiva, gravações transacionais, deduplicação por IDs e falha de armazenamento sem confirmação falsa foram exercitadas.
- [x] Backups: leitura/importação v1/v2 e validação/restauração v3, duplicações, integridade e rollback foram exercitados.
- [x] Continuidade: rascunhos, retomada após reload, troca de idioma/rota e grandes históricos foram cobertos.
- [x] Avaliação: itens fechados usam gabarito; respostas abertas permanecem `uncertain`/pendentes; listening sem áudio validado permanece `notAssessed`.
- [x] Interface: teclado, foco visível, movimento reduzido, teclado fonético russo e layouts desktop/tablet/celular em tema claro/escuro foram testados.
- [x] Privacidade: a auditoria do Learn encontrou carregamento somente same-origin de catálogos/conteúdo; não encontrou envio de respostas por `XMLHttpRequest` ou `sendBeacon`.
- [x] Falhas de infraestrutura foram separadas de falhas do produto: a primeira execução Playwright foi bloqueada por `ERR_NETWORK_ACCESS_DENIED` ao loopback; após liberar o loopback, a suíte completa passou.

## Validações executadas

- Typecheck `npm run typecheck`: aprovado.
- Build `npm run build`: aprovado; recompila TypeScript e gera bundles Lit/esbuild e CSS.
- Dez validadores `learn:*`: 10/10 aprovados — currículo, pedagogia, diagnóstico, qualidade, cobertura, leitura, curadoria, rubricas, revisões e readiness.
- Playwright Chromium: **116/116 aprovados**, em 15 specs do Learn e a regressão `platform-v2-learn.spec.ts`. Inclui migração, importação/restauração, falhas de armazenamento, privacidade, isolamento, retomada, deduplicação e 10.000 eventos.
- Layouts cobertos em 1920, 1366, 768, 390 e 320 px; tema claro e escuro; verificações sem overflow horizontal.
- `git diff --check`: aprovado. Artefatos `dist/` e `test-results/` permanecem ignorados.
- Não foi executado Pytest: esta homologação não alterou nem usa o backend.

Os validadores também confirmam o tamanho atual de cada catálogo legado: 162 palavras, 62 expressões, 15 leituras, 15 lições e 237 exercícios em Inglês e em Russo.

## Vercel e domínio oficial

- O check do commit `16a280a` chamado `Vercel` está `success` e aponta para a página de deployment do projeto `matheus2t`.
- A conexão Vercel disponível não consegue consultar esse projeto/domínio: `GET project matheus2t` e a consulta do deployment retornam `404`; a listagem autorizada da equipe mostra somente `dashboard-esportivo`. Não foi possível inspecionar o deployment, seu SHA de produção, alias ou estado `Production/Ready`.
- Verificação Chromium não autenticada em `https://matheus2t.com.br` com `learn-preview=c1`, `c2`, `diagnostic-en`, `diagnostic-ru`, `c4-delayed` e `c5-integration`: todas retornaram HTTP 200 com a página genérica “Página do Learn não encontrada”; nenhum conteúdo das experiências foi renderizado. Isso confirma indisponibilidade pública dessas rotas no domínio observado, mas **não identifica o commit servido nem valida a publicação da `main`**.
- Resultado de produção: **deployment exato não confirmado**. É necessário conceder ao conector Vercel acesso de leitura ao projeto `matheus2t` na equipe proprietária para conferir projeto, deployment, alias e SHA.

## Prontidão para ativação pública

**Prontidão técnica local: aprovada. Ativação pública/uso por estudantes: não aprovada.**

Pendências antes de liberar C1–C5:

1. Revisão linguística e pedagógica independente dos conteúdos de Inglês e Russo, rubricas, exemplos e dificuldade.
2. Testes moderados com estudantes dos dois idiomas; testes automatizados não substituem essa validação.
3. Áudio validado para listening; até lá, essas competências seguem não avaliadas.
4. Para respostas abertas, não existe avaliador semântico confiável nesta entrega. A ficha contextual exportável serve apenas para revisão manual, não dá nota nem produz feedback corretivo. As respostas continuam `uncertain`.
5. Antes de qualquer acesso remoto, definir autenticação/autorização no servidor, consentimento, privacidade, retenção e suporte. A query string não protege conteúdo e os arquivos estáticos podem ser públicos.
6. Confirmar o deployment de produção e o SHA diretamente no projeto Vercel correto antes de declarar a homologação online concluída.

Não foram encontrados defeitos de implementação que justificassem alterações no código nesta homologação; nenhuma funcionalidade ou flag pública foi habilitada. Este documento registra os resultados e os bloqueios verificáveis.
