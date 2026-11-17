# Arquitetura dos Utilitários 2T

## Integração atual

- O roteamento continua centralizado em `frontend/src/catalog.ts`; `app-shell` apresenta as páginas e breadcrumbs. `app-sidebar` mostra Utilitários em loopback quando a flag local está ativa ou em build público somente com a flag pública explícita.
- As páginas Lit usam `LightElement` e os tokens globais. `frontend/styles/_utilities.scss` contém apenas os estilos desta área.
- `frontend/src/utilities/flags.ts` combina as flags de build e o hostname loopback. Somente uma flag explícita de build público pode mostrar o Desencurtador fora do loopback; parâmetros de URL nunca ativam páginas. O Removedor continua loopback-only.
- `frontend/src/utilities/api.ts` usa `apiUrl` da configuração existente, consulta `GET /api/utilities/capabilities` e envia `POST /api/utilities/links/resolve` com cancelamento, sem credenciais, cache ou referrer.
- FastAPI registra `backend/app/utilities/router.py`; as rotas não aparecem no OpenAPI. Localmente, capacidades e resolução exigem as flags e cliente loopback (com Origin loopback quando presente). No Vercel, a rota permanece 404 por padrão e só pode abrir com as flags base e as flags de produção explícitas. Confirmações operacionais não detectam automaticamente a configuração externa.
- O motor do link está em `link_security.py`, `link_transport.py` e `link_resolver.py`: política URL/DNS, conexão a IP validado, redirecionamentos manuais e orçamento temporal. Nenhuma URL é persistida nem registrada em log.
- A tela consome a API somente após validar a flag de build e capacidades do backend. A URL é enviada no corpo da requisição e não é persistida pelo aplicativo nem incluída em logs de aplicação. Não há rota pública de upload, histórico, reputação ou execução de IA.

## Rotas locais

- `/#/utilitarios`: catálogo.
- `/#/utilitarios/desencurtador`: interface habilitada somente quando as flags do build e capacidades do backend permitem. Localmente exige loopback; publicamente permanece desligada por padrão.
- `/#/utilitarios/remover-fundo`: composição estática sem input de arquivo, upload ou processamento.

Rotas de ferramentas com flag individual desativada retornam ao catálogo, se este estiver habilitado. Sem a flag de catálogo, todas caem na experiência existente de Início.

## Flags e execução local

As três flags locais do frontend/backend começam em `false`:

| Variável | Efeito |
| --- | --- |
| `UTILITIES_ENABLED` | Habilita o catálogo local e o endpoint de capacidades. |
| `LINK_RESOLVER_ENABLED` | Habilita a rota local do motor de links. |
| `BACKGROUND_REMOVER_ENABLED` | Habilita a rota local do protótipo de imagem. |

No backend público, `LINK_RESOLVER_PUBLIC_ENABLED`, `LINK_RESOLVER_PUBLIC_RATE_LIMIT_CONFIRMED` e `LINK_RESOLVER_PUBLIC_EGRESS_CONFIRMED` também precisam estar explicitamente ativos; são gates operacionais, não verificações automáticas do WAF/rede. O frontend público usa somente `LINK_RESOLVER_PUBLIC_UI_ENABLED`, lida durante o build Vercel.

Limites do motor (fixos no máximo: 8 redirecionamentos, 12 s total, 3 s para conexão/leitura, 16 KiB em cabeçalhos de resposta e body JSON de 4 KiB): `LINK_RESOLVER_MAX_REDIRECTS`, `LINK_RESOLVER_TOTAL_TIMEOUT_SECONDS`, `LINK_RESOLVER_CONNECT_TIMEOUT_SECONDS` e `LINK_RESOLVER_READ_TIMEOUT_SECONDS`. A leitura do body tem deadline de 3 s. O limite de concorrência é quatro por processo, com HTTP 429 e `Retry-After`; não substitui rate limiting distribuído.

No build Vercel, as flags públicas ficam desabilitadas por padrão. `LINK_RESOLVER_PUBLIC_UI_ENABLED=true` pode expor somente o catálogo e a interface do resolvedor; a API ainda exige gates próprios de servidor. O Removedor permanece inacessível fora do loopback. Nenhuma configuração da Vercel foi alterada nesta preparação.

Para pré-visualizar no PowerShell, configure as variáveis no processo local antes de iniciar `npm run dev`. Repita as flags no processo FastAPI e inicie-o em `127.0.0.1:8000`. Para habilitar somente o catálogo, defina apenas `UTILITIES_ENABLED=true`; as flags de ferramenta podem ser habilitadas separadamente. Os valores podem ser removidos ao encerrar o terminal.

## Arquitetura futura do Removedor

Fluxo planejado: **Lit → FastAPI → upload temporário → fila → worker isolado de IA → armazenamento temporário do resultado → URL de download assinada**. FastAPI será responsável por validar acesso e estado do trabalho; armazenamento não deverá ser público; worker aplicará limites de CPU/GPU, memória, tamanho e duração. O banco ou fila devem guardar metadados mínimos, nunca URLs assinadas duradouras. Expiração e exclusão precisam cobrir original, resultado e metadados.

BiRefNet e alternativas são candidatas para avaliação comparativa, sem decisão de modelo ou serviço nesta fase. Requisitos de GPU, qualidade, latência e custo serão medidos antes de selecionar uma implementação.
