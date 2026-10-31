# Times V3 â€” duas APIs privadas

ImplementaÃ§Ã£o: football-data.org v4 para SPFC/Barcelona e BALLDONTLIE v1 para NBA.
Sem mudanÃ§as no design, banco ou serviÃ§os financeiros.

## ConfiguraÃ§Ã£o privada e confirmaÃ§Ã£o

Em 31/10/2026, tanto a consulta MCP sem descriptografia quanto `vercel env ls
--environment=production` nÃ£o mostraram variÃ¡veis configuradas em matheus2t.
O usuÃ¡rio confirmou posteriormente que ambas estÃ£o configuradas como Sensitive em
Production. O deploy 9d47c58 confirmou a seleÃ§Ã£o dos dois provedores pelas funÃ§Ãµes.
A listagem nÃ£o era prova de ausÃªncia de Sensitive. NÃ£o foram lidos ou exibidos os valores.
NÃ£o foram reutilizadas credenciais compartilhadas em mensagens.

1. Usar somente chaves novas; a rotaÃ§Ã£o nÃ£o pode ser verificada sem acesso aos painÃ©is.
2. ConfiguraÃ§Ã£o confirmada pelo usuÃ¡rio: Vercel â†’ projeto matheus2t â†’ Environment Variables:
   `FOOTBALL_DATA_API_KEY` e `BALLDONTLIE_API_KEY` como Sensitive, Production
   (Preview somente se desejado). NÃ£o colar valores no chat, GitHub ou exemplos.
3. O novo deploy recebeu as variÃ¡veis, conforme consultas reais bem-sucedidas.
4. Endpoints validados sem ler os valores: `/api/sports/{team}/{schedule|results|standings|roster|statistics}`.

Sem as variÃ¡veis, continua o fallback TheSportsDB jÃ¡ publicado. Com uma variÃ¡vel
configurada, o respectivo novo provedor se torna principal. 401/403/404/429 e erros
nÃ£o sÃ£o ocultados por fallback silencioso. As chaves existentes no computador nÃ£o
foram buscadas nem usadas para consultas reais. NÃ£o se pode garantir rotaÃ§Ã£o pela
simples presenÃ§a de um nome de variÃ¡vel.

## Contratos e consumo

- Adaptadores separados em sports_football.py e sports_nba.py. SportsHTTP usa
  exclusivamente HTTPS nos dois hosts oficiais, rejeita redirecionamentos, timeout
  de 6s e resposta mÃ¡xima de 2 MB. AutenticaÃ§Ã£o somente em cabeÃ§alhos privados.
- Cache em memÃ³ria limitado a 64 entradas por provedor, isolado por fingerprint da
  credencial. Futebol: 15min partidas/tabelas, 6h equipes/elencos; NBA: 30min jogos/
  jogadores e 24h equipes. Sem imprimir respostas brutas, tokens ou cabeÃ§alhos.
- Limites locais de 10/min e 5/min. Futebol observa os cabeÃ§alhos de quota disponÃ­veis
  e pausa quando chegam a zero. 429 pausa o processo por pelo menos 60s, sem retry automÃ¡tico.
- InstÃ¢ncias serverless nÃ£o compartilham cache/limites. Cache HTTP/CDN existente reduz
  consultas, mas nÃ£o hÃ¡ promessa de controle global. Falhas nÃ£o entram no cache pÃºblico.
- IDs resolvidos pela API: equipes de BSA/PD e lista de equipes NBA; sem IDs inventados.
- Futebol: matches da equipe, horÃ¡rios fornecidos pela API com confirmaÃ§Ã£o identificada, atÃ© dez futuros e cinco
  encerrados; tabela TOTAL da temporada atual. Barcelona permite consultar CL com
  `standings?competition=CL`; sÃ³ exibe tabela que inclua o Barcelona. Fase eliminatÃ³ria
  sem tabela TOTAL Ã© indisponÃ­vel, nunca convertida em classificaÃ§Ã£o fictÃ­cia.
- Elenco football-data depende de squad autorizado; NBA players por team_ids Ã©
  identificado como cadastro, nÃ£o elenco ativo confirmado. Altura, posiÃ§Ã£o e camisa
  quando retornadas. NÃ£o hÃ¡ endpoints pagos de standings/leaders/season averages NBA.
- NBA paginaÃ§Ã£o por cursor limitada a trÃªs pÃ¡ginas; truncamento nÃ£o Ã© anunciado como
  completo. Games sem season_type incluem tipos nÃ£o preseason conforme documentaÃ§Ã£o.
  Apenas datetime, nunca date-only, Ã© usado como horÃ¡rio. status_state separa jogos
  agendados, em andamento, adiados/cancelados e finalizados.
- NÃ£o se calcula campanha NBA a partir de resultados parciais. NÃ£o hÃ¡ mÃ©dias inventadas.
- Fonte e consulta individual ficam no detalhe de cobertura, mantendo a interface aprovada.

## Fontes oficiais e pendÃªncias

[football-data Team v4](https://docs.football-data.org/general/v4/team.html),
[NBA API](https://nba.balldontlie.io/),
[OpenAPI NBA](https://www.balldontlie.io/openapi/nba.yml).

As duas integraÃ§Ãµes foram acionadas em produÃ§Ã£o apÃ³s confirmaÃ§Ã£o das variÃ¡veis Sensitive.
O teste real identificou a ambiguidade Espanyol/Barcelona, corrigida com correspondÃªncia
exata de FC Barcelona e teste de regressÃ£o. Partidas SCHEDULED mantÃªm status de horÃ¡rio
a confirmar; TIMED usa o horÃ¡rio confirmado da fonte.
NÃ£o houve contrataÃ§Ã£o, criaÃ§Ã£o de contas ou habilitaÃ§Ã£o de planos pagos.

ValidaÃ§Ã£o sem credenciais: typecheck e build aprovados; 94 testes Python; 48 testes
E2E de regressÃ£o aprovados (TradingView opt-in nÃ£o executado nesta etapa) e 11 testes
esportivos aprovados, incluindo seleÃ§Ã£o de Champions e fonte por seÃ§Ã£o. Nenhuma chave
real foi usada nos mocks, publicada no frontend ou incluÃ­da em arquivos de exemplo.

## ValidaÃ§Ã£o real em produÃ§Ã£o (31/10/2026)

As variÃ¡veis Sensitive foram confirmadas pelo usuÃ¡rio e pelo funcionamento das funÃ§Ãµes.
Escopo: matheus2ts-projects, projeto prj_nNppFpQ5k2AUn0qNH7Hmrylw5FQ3, domÃ­nio
matheus2t.com.br. Nenhum valor de chave foi lido ou exposto.

| Time | PrÃ³ximos | Resultados | Tabela principal | Jogadores identificados | Indicadores | Fonte |
| --- | --- | --- | --- | --- | --- | --- |
| 76ers | 10 | 5 | NÃ£o incluÃ­da no gratuito | 268 no cadastro histÃ³rico; nÃ£o elenco ativo | Sem mÃ©dias individuais | BALLDONTLIE |
| SPFC | 3 com horÃ¡rio utilizÃ¡vel | 5 | 20 equipes | IndisponÃ­vel nesta consulta | 7 da campanha | football-data.org |
| Barcelona | 8 com horÃ¡rio utilizÃ¡vel | 5 | 20 equipes | IndisponÃ­vel nesta consulta | 7 da campanha | football-data.org |

Jogos sem horÃ¡rio utilizÃ¡vel nÃ£o foram inventados. Registros SCHEDULED dependem de
confirmaÃ§Ã£o e sÃ£o identificados assim. A consulta extra de CL inicialmente recebeu
rate_limited, demonstrando o controle da quota; requer nova verificaÃ§Ã£o apÃ³s a janela.
NÃ£o se afirmou que squad estÃ¡ incluÃ­do no plano: a resposta disponÃ­vel nÃ£o permitiu
confirmar elenco atual e recente.

O cadastro NBA Ã© apresentado em detalhe recolhido e explicitamente histÃ³rico, evitando
que a pÃ¡gina mostre 268 atletas como elenco atual. ValidaÃ§Ã£o final: 95 testes Python;
revalidaÃ§Ã£o esportiva com 11 testes Playwright aprovados.

## CorreÃ§Ã£o de consumo â€” carga inicial agregada

`GET /api/sports/{team}?include=all` reÃºne as cinco seÃ§Ãµes sequencialmente na mesma
execuÃ§Ã£o. As falhas permanecem independentes. Os endpoints individuais continuam
disponÃ­veis para retry e Champions. NÃ£o hÃ¡ fan-out paralelo para os provedores.

Futebol consulta uma Ãºnica lista da temporada para calendÃ¡rio e resultados. A mesma
tabela serve Ã  classificaÃ§Ã£o e aos indicadores, com os mesmos parÃ¢metros de cache.
Em cache frio: quatro chamadas por clube (descoberta, partidas, tabela, elenco). Na NBA:
uma descoberta + pÃ¡ginas de jogos + pÃ¡ginas de jogadores; no cenÃ¡rio observado, cinco
chamadas (1+1+3). Jogos e resultados reutilizam a mesma coleÃ§Ã£o. PaginaÃ§Ã£o tem limite
de seguranÃ§a de trÃªs pÃ¡ginas e nunca anuncia truncamento como conjunto completo.
O limite gratuito pode adiar a Ãºltima pÃ¡gina em calendÃ¡rios maiores; os jogos jÃ¡
obtidos continuam disponÃ­veis e o elenco informa a indisponibilidade temporÃ¡ria.

No navegador, a carga inicial faz uma chamada agregada por time e compartilha promessas
em andamento entre componentes de rota. Voltar rapidamente ao mesmo clube reutiliza
a resposta por 60s (15s quando alguma seÃ§Ã£o falhou). Sair da pÃ¡gina nÃ£o cancela e
reinicia a requisiÃ§Ã£o compartilhada; timeout de 55s evita loading infinito.

Cache HTTP/CDN: respostas agregadas Ãºteis usam max-age=60/s-maxage=300; respostas com
falhas parciais usam 10/15s para amortecer navegaÃ§Ã£o repetida sem ocultar falhas por muito
tempo. Valores em cache vÃ¡lidos sÃ£o consultados antes de verificar o bloqueio de quota.
NÃ£o se reutilizam dados expirados sem identificaÃ§Ã£o. Sem cache vÃ¡lido, hÃ¡ estado de erro.

Transportes serializam misses por provedor em cada instÃ¢ncia e respeitam 10/min e 5/min.
429 bloqueia novas chamadas por pelo menos 60s e pelo tempo maior informado em
Retry-After (segundos ou data HTTP) / X-RequestCounter-Reset. Quota restante zero
tambÃ©m aciona pausa. Respostas 401/403/404 tÃªm cache negativo de 5min, separado por
fingerprint da credencial, evitando reconsultar recursos nÃ£o autorizados. NÃ£o hÃ¡
loops de retry, nem promessa de um limitador global entre instÃ¢ncias serverless.

VerificaÃ§Ã£o da correÃ§Ã£o: typecheck/build aprovados; 98 testes Python; 50 Playwright
aprovados e 1 opt-in TradingView nÃ£o executado. O teste instrumentado de futebol
confirma quatro chamadas totais mesmo executando duas cargas agregadas na mesma
instÃ¢ncia: partidas e tabela consultadas somente uma vez. O teste de navegaÃ§Ã£o rÃ¡pida
confirma uma Ãºnica requisiÃ§Ã£o agregada por clube e nenhuma requisiÃ§Ã£o inicial de seÃ§Ã£o.


## Acabamento dos Times: escudos e escalações

Os escudos de futebol vêm do campo `crest` da football-data.org; os logos NBA
usam cópias locais do CDN oficial da NBA, mapeadas pela sigla da equipe. São imagens
públicas, sem credenciais. O futebol carrega de `crests.football-data.org`; os 30 logos
NBA ficam em `/teams/nba/`. Isso evita o ERR_HTTP2_PROTOCOL_ERROR observado no CDN
no teste real do navegador, apesar de o mesmo asset responder HTTP 200 via curl.
A CSP autoriza somente essas duas novas origens. O responsável pelo projeto
confirmou autorização de uso para clubes, adversários e equipes das tabelas.
Imagens ausentes, inválidas ou com erro são omitidas sem placeholder.

O SPFC não exibe elenco vazio ou indisponível. O nome La Liga é normalizado apenas
na apresentação; os nomes e IDs recebidos do provedor permanecem intactos.

O componente de escalação aceita somente formação confirmada, jogadores e posições
completos: 11 no futebol ou 5 no basquete. O adaptador de futebol aproveita o payload
de partidas já consultado, quando existir uma formação compatível e completa. Não
consulta endpoints adicionais nem infere titulares do cadastro. No plano atual,
os payloads observados não confirmam escalação; campo e quadra ficam ocultos.
A API gratuita NBA não confirma quinteto: a documentação restringe Lineups ao plano
GOAT. Não foi contratado plano nem adicionado consumo pago. O cadastro histórico
continua identificado e recolhido, nunca convertido em escalação.

Referências: https://docs.football-data.org/general/v4/match.html e
https://nba.balldontlie.io/ (Lineups). Formações de teste existem somente nos testes.

## Simplificação da interface — sem elenco ou escalação

As páginas `#/76ers`, `#/spfc` e `#/barcelona` não mostram mais seções de
elenco nem campos/quadras de escalação, incluindo mensagens de indisponibilidade.
A navegação inicial carrega somente calendário, resultados, classificação e
indicadores. `GET /api/sports/{team}?include=all` exclui `roster`, evitando
requisições aos provedores que não são utilizadas pela interface. Endpoints
individuais legados permanecem por compatibilidade, mas não são consultados
pelas páginas. Os demais recursos esportivos permanecem inalterados.
