# Arquitetura dos Utilitários 2T

## Integração atual

- O roteamento continua centralizado em `frontend/src/catalog.ts`; `app-shell` apresenta as páginas e breadcrumbs, e `app-sidebar` só mostra Utilitários quando a flag de catálogo está ligada em loopback.
- As páginas Lit usam `LightElement` e os tokens globais. `frontend/styles/_utilities.scss` contém apenas os estilos desta área.
- `frontend/src/utilities/flags.ts` combina as flags de build com o hostname loopback. Parâmetros de URL não ativam as páginas.
- `frontend/src/utilities/api.ts` usa `apiUrl` da configuração existente, consulta `GET /api/utilities/capabilities` e envia `POST /api/utilities/links/resolve` com cancelamento, sem credenciais, cache ou referrer.
- FastAPI registra `backend/app/utilities/router.py`. Capacidades e `POST /api/utilities/links/resolve` exigem as flags respectivas, cliente loopback e Origin loopback quando presente; ambas as rotas são omitidas do OpenAPI. `VERCEL=1` força 404 mesmo com flags ligadas.
- O motor do link está em `link_security.py`, `link_transport.py` e `link_resolver.py`: política URL/DNS, conexão a IP validado, redirecionamentos manuais e orçamento temporal. Nenhuma URL é persistida nem registrada em log.
- A tela do resolvedor consome a API local somente após validar flags de frontend e capacidades do backend. Não há rota de upload, histórico, reputação ou execução de IA.

## Rotas locais

- `/#/utilitarios`: catálogo.
- `/#/utilitarios/desencurtador`: interface local do resolvedor, habilitada somente quando flags de frontend e capacidades do backend permitem. A API só responde quando as duas flags de backend estão ativas.
- `/#/utilitarios/remover-fundo`: composição estática sem input de arquivo, upload ou processamento.

Rotas de ferramentas com flag individual desativada retornam ao catálogo, se este estiver habilitado. Sem a flag de catálogo, todas caem na experiência existente de Início.

## Flags e execução local

As três variáveis existem no frontend e no backend e começam em `false`:

| Variável | Efeito |
| --- | --- |
| `UTILITIES_ENABLED` | Habilita o catálogo local e o endpoint de capacidades. |
| `LINK_RESOLVER_ENABLED` | Habilita a rota local do motor de links. |
| `BACKGROUND_REMOVER_ENABLED` | Habilita a rota local do protótipo de imagem. |

Limites do motor (fixos no máximo: 8 redirecionamentos, 12 s total, 3 s para conexão e leitura): `LINK_RESOLVER_MAX_REDIRECTS`, `LINK_RESOLVER_TOTAL_TIMEOUT_SECONDS`, `LINK_RESOLVER_CONNECT_TIMEOUT_SECONDS` e `LINK_RESOLVER_READ_TIMEOUT_SECONDS`. O endpoint rejeita corpo acima de 4 KiB e limita a quatro consultas concorrentes por processo.

No build Vercel, todas as flags do frontend são forçadas para `false`, mesmo se variáveis correspondentes forem definidas no ambiente. O hostname também precisa ser loopback. Nenhuma configuração Vercel foi alterada.

Para pré-visualizar no PowerShell, configure as variáveis no processo local antes de iniciar `npm run dev`. Repita as flags no processo FastAPI e inicie-o em `127.0.0.1:8000`. Para habilitar somente o catálogo, defina apenas `UTILITIES_ENABLED=true`; as flags de ferramenta podem ser habilitadas separadamente. Os valores podem ser removidos ao encerrar o terminal.

## Arquitetura futura do Removedor

Fluxo planejado: **Lit → FastAPI → upload temporário → fila → worker isolado de IA → armazenamento temporário do resultado → URL de download assinada**. FastAPI será responsável por validar acesso e estado do trabalho; armazenamento não deverá ser público; worker aplicará limites de CPU/GPU, memória, tamanho e duração. O banco ou fila devem guardar metadados mínimos, nunca URLs assinadas duradouras. Expiração e exclusão precisam cobrir original, resultado e metadados.

BiRefNet e alternativas são candidatas para avaliação comparativa, sem decisão de modelo ou serviço nesta fase. Requisitos de GPU, qualidade, latência e custo serão medidos antes de selecionar uma implementação.
