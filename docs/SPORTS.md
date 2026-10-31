# Times na 2T

Rotas independentes: `#/76ers`, `#/spfc`, `#/barcelona`. Backend em
`/api/sports/{team}` e `/api/sports/{team}/{schedule|results|standings|roster|statistics}`.
Sem banco ou credencial obrigatória. Não cria assinatura nem altera os serviços financeiros.

## Pesquisa de provedores — 31/10/2026

| Fonte | Acesso gratuito | Limitações relevantes |
| --- | --- | --- |
| [BALLDONTLIE](https://docs.balldontlie.io/) | Cadastro/chave; times, jogadores e jogos, 5 requisições/min | Classificação e médias de temporada não são gratuitas. Não contratado. |
| [API-Football](https://www.api-football.com/documentation-v3) | Cadastro/chave e cobertura restrita por plano/temporada | Cobertura atual precisa ser validada com credenciais. Direitos de imagens separados. Não integrado. |
| [football-data.org](https://www.football-data.org/coverage) | Chave; cobertura gratuita inclui ligas principais de Brasil/Espanha e Champions | Não cobre todas as copas solicitadas. Não integrado. |
| [TheSportsDB](https://www.thesportsdb.com/documentation) | API v1 pública documentada, sem cadastro | Calendário e resultados: até 1 jogo por consulta. Tabelas: até 5 linhas, ligas de futebol selecionadas. Elenco limitado sem confirmação da temporada. |

Implementado: TheSportsDB, respeitando os limites, sem consultar endpoints alternativos
para contornar as restrições. O plano gratuito não entrega dez próximos jogos nem cinco
resultados. Os componentes aceitam até dez/cinco quando houver cobertura legítima; os
testes desse volume são mocks, nunca dados publicados.

## Cobertura real verificada

Consultas diretas à fonte retornaram uma partida futura por time e cinco linhas de
classificação de Brasileirão/La Liga. O São Paulo não estava nas cinco linhas; sua
posição não é inferida. NBA sem classificação disponível. Não há alternância de copas
porque não há cobertura confirmada de participação/fase. Elenco e estatísticas individuais exibem
indisponibilidade: não mostramos jogadores antigos nem escolhemos famosos manualmente.
Indicadores de temporada do clube são exibidos quando a linha do time aparece na tabela
retornada (jogos, pontos, vitórias, empates, derrotas e gols conforme disponíveis).

Dados são de terceiros, não um feed oficial dos clubes. A interface identifica cobertura
parcial e oferece os sites oficiais. Horários são convertidos de UTC para America/Sao_Paulo;
partidas sem horário confirmado, encerradas, com placar ou adiadas não entram em próximas.
NBA/La Liga usam temporada entre anos; Brasileirão usa ano civil. Dados de cada partida
mantêm a temporada informada pela fonte. Não há ano fixo de produção.

## Operação e cache

- Adaptador `backend/app/sports_provider.py`, contratos Pydantic em `sports_schemas.py`.
- Timeout de 5 segundos, resposta máxima 2 MB, host e endpoints fixos; sem URLs fornecidas
  pelo cliente, scraping, chaves de usuários ou imagens externas.
- Cache em memória de 10 minutos, máximo 40 entradas; lock evita consultas duplicadas
  na mesma função aquecida. Limite preventivo de 24 chamadas/minuto por processo.
- O cache e o limitador **não são globais entre instâncias serverless**. A chave pública
  compartilha a quota externa (30/min); 429 tem estado explícito e não causa retries automáticos.
- Respostas úteis têm cache HTTP público: navegador 60s, CDN 300s. Falhas usam no-store.
  Não se promete atualização ao vivo, cache persistente ou quota global garantida.
- Seções carregam isoladamente; timeout do cliente 25s, cancelamento ao sair da página.
- A data da interface é a consulta/cache, não uma afirmação de quando o provedor atualizou o jogo.

## Escudos e direitos de imagens

O usuário confirmou possuir autorização para os três escudos em 31/10/2026.
São servidos localmente, sem hotlink nem requisição de imagem a terceiros no navegador.
Fontes verificadas:

- Philadelphia 76ers: https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg (CDN oficial NBA).
- SPFC: https://r2.thesportsdb.com/images/media/team/badge/sxpupx1473538135.png
- Barcelona: https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png

Escudos mantidos sem alteração de geometria/cores, usados para identificar os times.
A autorização informada não é uma licença pública para redistribuição por terceiros.
Fotos de atletas e escudos dos adversários não foram incluídos, pois a autorização
confirmada se refere somente aos três clubes. Não são substituídos por imagens inventadas.
Os [termos TheSportsDB](https://www.thesportsdb.com/docs_terms_of_use.php) separam direitos
sobre dados e imagens. Não se presume licença de imagem a partir de um campo da API.

## Validação

`$env:PYTHONPATH='backend'; python -m pytest -q backend/tests --basetemp=.vercel/pytest-sports`

`npm run typecheck`; `npm run build`; servidor `python -m uvicorn app.main:app --app-dir backend --port 8123`;
`npm run test:e2e`. Especificações esportivas usam mocks de teste claramente separados.
Imagens Playwright cobrem três rotas, cinco larguras e dois temas.

Validação anterior em 31/10/2026: 79 testes Python e 45 testes Playwright aprovados.
Após a reconciliação da homepage e os indicadores de temporada, a suíte Python tem
81 testes. A nova execução completa do Playwright passou: 46 testes, incluindo TradingView real.
Typecheck e build aprovados; revisão visual final nas cinco larguras e nos dois temas. O servidor
de QA foi iniciado com `VERCEL=1` e `MARKET_DATA_PUBLIC_ENABLED=false` para validar o
bloqueio público preexistente da brapi; nenhuma configuração financeira foi alterada.
As três páginas também foram abertas sem mocks: uma próxima partida e um resultado por
time; cinco linhas de tabela para SPFC/Barcelona; zero erros JavaScript e zero loading
pendente. Revisadas capturas nas cinco larguras e nos dois temas, sem overflow horizontal.
Publicação pelo fluxo GitHub/Vercel existente após as verificações finais.

## Arquivos desta implementação

- `backend/app/main.py`: registro do router.
- `backend/app/sports.py`: endpoints, temporadas e normalização.
- `backend/app/sports_provider.py`: adaptador, cache e limites.
- `backend/app/sports_schemas.py`: contratos Pydantic.
- `backend/tests/test_sports.py`: testes de dados e integração.
- `frontend/src/catalog.ts`: três rotas e títulos.
- `frontend/src/components/app-shell.ts`: integração na estrutura existente.
- `frontend/src/components/team-shortcuts.ts`: atalhos acessíveis com os três escudos.
- `frontend/src/components/team-page.ts`: página compartilhada e estados independentes.
- `frontend/src/components/sports-games.ts`: calendário/resultados.
- `frontend/src/components/sports-standings.ts`: tabela e destaque do clube.
- `frontend/src/sports.ts`: contratos e formatação de horário.
- `frontend/styles/_sports.scss`: estilos responsivos usando tokens existentes.
- `frontend/styles/main.scss`: importação dos estilos esportivos.
- `frontend/tests/sports.spec.ts`: testes responsivos e de navegação.
- `docs/SPORTS.md`: pesquisa, operação, limitações e validação.

- `frontend/public/teams/`: três escudos autorizados.
- `scripts/copy-financials.cjs`: cópia dos escudos para o build estático.

## Cobertura e configuração pendentes

| Requisito | Implementação publicada/validável sem credenciais | Limite externo |
| --- | --- | --- |
| Páginas e escudos | Três rotas diretas, títulos, breadcrumbs, teclado e tema | Nenhum |
| Próximos 10 | Normalizador ordena e limita a dez jogos reais; interface suporta dez | Chave pública só entrega um; não há dez jogos reais nesta entrega |
| Últimos cinco | Normalizador limita a cinco resultados encerrados com placar | Chave pública só entrega um; não há cinco resultados reais nesta entrega |
| Classificação | Tabela principal do futebol, destaque do clube quando presente | Cinco linhas; NBA, copas e outras competições indisponíveis |
| Elenco atual | Estado indisponível e link oficial | Fonte atual não confirma vínculo/temporada; sem elenco real nesta entrega |
| Destaques individuais | Estado indisponível | Sem médias, gols/assistências/minutos individuais da temporada |
| Estatísticas do clube | Indicadores da linha do time na tabela, com competição/temporada | Indisponíveis se a fonte omitir o time; NBA sem cobertura |

### Única variável esportiva implementada

`SPORTSDB_API_KEY` é opcional, secreta e lida exclusivamente pelo backend. Sem ela,
usa-se a chave pública documentada 123. Uma chave **já obtida/autorizada** pode ser
configurada no projeto Vercel existente (Production/Preview) ou em `.env` local ignorado;
refazer o deploy após configurar. Não enviar o valor pelo chat nem versionar `.env`.
O adaptador usa os mesmos endpoints v1 documentados e permite os limites da chave
fornecida, sem criar plano, fazer upgrade ou cobrar automaticamente. Uma chave inválida
produz erro explícito, sem fallback silencioso nem exposição do valor.

A chave premium não foi fornecida: o caminho autenticado tem testes com mocks, mas
**não foi validado com dados reais autenticados**. Não garante NBA standings, elenco
atual confirmado ou estatísticas individuais. A cobertura depende do plano/fonte.
BALLDONTLIE/API-Football/football-data.org foram pesquisados, não foram integrados;
configurar chaves desses serviços hoje não habilita endpoints nesta versão. Completar
as lacunas exige escolher uma fonte com cobertura e licença confirmadas e integrar seus
contratos, depois testar com a credencial real. Nenhuma despesa foi autorizada/assumida.

O histórico dos três commits da homepage (f0c76da, 33b679d, b465613) foi incorporado
por fast-forward, preservando todos os arquivos locais desta implementação.

- `backend/app/config.py` e `.env.example`: chave esportiva opcional somente no backend.

## Redesign das páginas de Times — 31/10/2026

- Identificação do clube com escudo maior e indicadores nomeados (posição, pontos e jogos).
- Próxima partida em uma superfície principal: mandante e visitante separados, horário
  de Brasília em destaque e competição/local no rodapé. Estado inicial sem jogo inventado.
- Calendário com adversário, data curta, horário e mando em colunas; resultados com
  placar próprio em destaque, vitória/empate/derrota por escrito e indicação da ordem dos pontos.
- Seções sem caixas repetidas; estados vazios curtos e proporcionais, com link oficial.
- Tabelas com números alinhados, pontos em destaque, clube selecionado identificado,
  abreviações explicadas e colunas de posição/equipe fixas na rolagem interna do celular.
- Estatísticas do clube mantêm competição/temporada; nenhum número novo ou atleta foi inventado.
- Notas originais de cobertura e horário da consulta permanecem em um detalhe expansível.
- Escudo do 76ers sobre base neutra clara, sem edição do SVG, geometria ou cores oficiais.
  Atalhos mantêm alvo de 44px, nome acessível, tooltip, foco e seleção por sublinhado.
- Retry consulta somente a seção que falhou e bloqueia cliques duplicados enquanto aguarda.
- Backend, endpoints financeiros, homepage, Ações, fontes globais e Vercel não foram alterados.

### Revisão de cobertura

Revisadas novamente as documentações e os planos oficiais, sem criar contas ou contratar serviços:

- [BALLDONTLIE](https://docs.balldontlie.io/): jogos gratuitos com chave (5 chamadas/minuto);
  classificação, médias da temporada e líderes ficam fora do gratuito. Não há chave disponível.
- [football-data.org](https://www.football-data.org/pricing): plano gratuito com fixtures,
  calendário e tabelas de 12 competições (10 chamadas/minuto); squads/dados aprofundados
  aparecem em planos superiores. Credencial não fornecida; cobertura não cobre todas as copas.
- [API-Football](https://www.api-football.com/pricing): 100 chamadas/dia no gratuito, com
  limitação de temporadas. Sem credencial, a temporada corrente e a licença do uso proposto
  não foram validadas. Não usamos elencos antigos como alternativa.
- TheSportsDB permanece como fonte real em produção, com os limites já documentados.
  Não houve ampliação de cobertura nem ativação de plano pago nesta atualização.

### Arquivos do redesign

`frontend/src/components/team-page.ts`, `sports-games.ts`, `sports-standings.ts`,
`team-shortcuts.ts`, `frontend/src/sports.ts`, `frontend/styles/_sports.scss`,
`frontend/tests/sports.spec.ts` e este documento. Nenhum escudo original foi modificado.

O teste opt-in `frontend/tests/tradingview-live.spec.ts` também foi ajustado: reconhece
somente a tentativa de telemetria Snowplow explicitamente bloqueada pela CSP existente
e confirma que esse domínio continua fora da política. Erros de widgets, JavaScript e
outras violações de CSP continuam falhando o teste. Não foi liberado rastreamento nem
alterada a implementação de Ações.

Validações do redesign: typecheck/build aprovados, 81 testes Python, 48 testes E2E
principais aprovados e teste opt-in do TradingView real aprovado após o ajuste descrito.
Inspeção visual das três páginas em 1920, 1366, 768, 390 e 320 px, nos dois temas,
com dados reais do backend. Sem overflow horizontal ou exceções JavaScript nessas páginas.
Testes com mocks ficam restritos à suíte, inclusive os cenários de dez jogos e API indisponível.
