# Arquitetura dos Utilitários 2T

## Integração atual

- O roteamento continua centralizado em `frontend/src/catalog.ts`; `app-shell` apresenta as páginas e breadcrumbs, e `app-sidebar` só mostra Utilitários quando a flag de catálogo está ligada em loopback.
- As páginas Lit usam `LightElement` e os tokens globais. `frontend/styles/_utilities.scss` contém apenas os estilos desta área.
- `frontend/src/utilities/flags.ts` combina as flags de build com o hostname loopback. Parâmetros de URL não ativam as páginas.
- `frontend/src/utilities/api.ts` usa `apiUrl` da configuração existente e consulta somente `GET /api/utilities/capabilities`.
- FastAPI registra `backend/app/utilities/router.py`. O endpoint de capacidades exige `UTILITIES_ENABLED=true`, cliente loopback e, quando presente, Origin loopback. Está fora do OpenAPI público.
- Os modelos Pydantic e tipos TypeScript descrevem contratos futuros; não há rota funcional para resolver URLs, enviar arquivos ou executar IA.

## Rotas locais

- `/#/utilitarios`: catálogo.
- `/#/utilitarios/desencurtador`: formulário demonstrativo sem requisição à URL informada.
- `/#/utilitarios/remover-fundo`: composição estática sem input de arquivo, upload ou processamento.

Rotas de ferramentas com flag individual desativada retornam ao catálogo, se este estiver habilitado. Sem a flag de catálogo, todas caem na experiência existente de Início.

## Flags e execução local

As três variáveis existem no frontend e no backend e começam em `false`:

| Variável | Efeito |
| --- | --- |
| `UTILITIES_ENABLED` | Habilita o catálogo local e o endpoint de capacidades. |
| `LINK_RESOLVER_ENABLED` | Habilita a rota local do protótipo de links. |
| `BACKGROUND_REMOVER_ENABLED` | Habilita a rota local do protótipo de imagem. |

No build Vercel, todas as flags do frontend são forçadas para `false`, mesmo se variáveis correspondentes forem definidas no ambiente. O hostname também precisa ser loopback. Nenhuma configuração Vercel foi alterada.

Para pré-visualizar no PowerShell, configure as variáveis no processo local antes de iniciar `npm run dev`. Repita as flags no processo FastAPI e inicie-o em `127.0.0.1:8000`. Para habilitar somente o catálogo, defina apenas `UTILITIES_ENABLED=true`; as flags de ferramenta podem ser habilitadas separadamente. Os valores podem ser removidos ao encerrar o terminal.

## Arquitetura futura do Removedor

Fluxo planejado: **Lit → FastAPI → upload temporário → fila → worker isolado de IA → armazenamento temporário do resultado → URL de download assinada**. FastAPI será responsável por validar acesso e estado do trabalho; armazenamento não deverá ser público; worker aplicará limites de CPU/GPU, memória, tamanho e duração. O banco ou fila devem guardar metadados mínimos, nunca URLs assinadas duradouras. Expiração e exclusão precisam cobrir original, resultado e metadados.

BiRefNet e alternativas são candidatas para avaliação comparativa, sem decisão de modelo ou serviço nesta fase. Requisitos de GPU, qualidade, latência e custo serão medidos antes de selecionar uma implementação.
