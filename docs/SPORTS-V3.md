# Times V3 — duas APIs privadas

Implementação: football-data.org v4 para SPFC/Barcelona e BALLDONTLIE v1 para NBA.
Sem mudanças no design, banco ou serviços financeiros.

## Configuração manual necessária

Em 31/10/2026, tanto a consulta MCP sem descriptografia quanto `vercel env ls
--environment=production` não mostraram variáveis configuradas em matheus2t.
Não foram lidas, reutilizadas ou publicadas as credenciais anteriormente expostas.

1. Revogar as chaves antigas no painel de cada provedor e gerar novas.
2. Vercel → projeto matheus2t → Settings → Environment Variables: configurar
   `FOOTBALL_DATA_API_KEY` e `BALLDONTLIE_API_KEY` como Sensitive, Production
   (Preview somente se desejado). Não colar valores no chat, GitHub ou exemplos.
3. Fazer novo deploy para as funções receberem as variáveis.
4. Validar `/api/sports/{team}/{schedule|results|standings|roster|statistics}`.

Sem as variáveis, continua o fallback TheSportsDB já publicado. Com uma variável
configurada, o respectivo novo provedor se torna principal. 401/403/404/429 e erros
não são ocultados por fallback silencioso. As chaves existentes no computador não
foram buscadas nem usadas para consultas reais. Não se pode garantir rotação pela
simples presença de um nome de variável.

## Contratos e consumo

- Adaptadores separados em sports_football.py e sports_nba.py. SportsHTTP usa
  exclusivamente HTTPS nos dois hosts oficiais, rejeita redirecionamentos, timeout
  de 6s e resposta máxima de 2 MB. Autenticação somente em cabeçalhos privados.
- Cache em memória limitado a 64 entradas por provedor, isolado por fingerprint da
  credencial. Futebol: 15min partidas/tabelas, 6h equipes/elencos; NBA: 30min jogos/
  jogadores e 24h equipes. Sem imprimir respostas brutas, tokens ou cabeçalhos.
- Limites locais de 10/min e 5/min. Futebol observa os cabeçalhos de quota disponíveis
  e pausa quando chegam a zero. 429 pausa o processo por pelo menos 60s, sem retry automático.
- Instâncias serverless não compartilham cache/limites. Cache HTTP/CDN existente reduz
  consultas, mas não há promessa de controle global. Falhas não entram no cache público.
- IDs resolvidos pela API: equipes de BSA/PD e lista de equipes NBA; sem IDs inventados.
- Futebol: matches da equipe, status/horário confirmado, até dez futuros e cinco
  encerrados; tabela TOTAL da temporada atual. Barcelona permite consultar CL com
  `standings?competition=CL`; só exibe tabela que inclua o Barcelona. Fase eliminatória
  sem tabela TOTAL é indisponível, nunca convertida em classificação fictícia.
- Elenco football-data depende de squad autorizado; NBA players por team_ids é
  identificado como cadastro, não elenco ativo confirmado. Altura, posição e camisa
  quando retornadas. Não há endpoints pagos de standings/leaders/season averages NBA.
- NBA paginação por cursor limitada a três páginas; truncamento não é anunciado como
  completo. Games sem season_type incluem tipos não preseason conforme documentação.
  Apenas datetime, nunca date-only, é usado como horário. status_state separa jogos
  agendados, em andamento, adiados/cancelados e finalizados.
- Não se calcula campanha NBA a partir de resultados parciais. Não há médias inventadas.
- Fonte e consulta individual ficam no detalhe de cobertura, mantendo a interface aprovada.

## Fontes oficiais e pendências

[football-data Team v4](https://docs.football-data.org/general/v4/team.html),
[NBA API](https://nba.balldontlie.io/),
[OpenAPI NBA](https://www.balldontlie.io/openapi/nba.yml).

As duas integrações autenticadas só têm validação com mocks de testes enquanto faltam
novas credenciais no ambiente privado. Quantidades reais, IDs, autorização de squad/CL
e cobertura por competição precisam ser confirmados após configurar e redeployar.
Não houve contratação, criação de contas ou habilitação de planos pagos.

Validação sem credenciais: typecheck e build aprovados; 94 testes Python; 48 testes
E2E de regressão aprovados (TradingView opt-in não executado nesta etapa) e 11 testes
esportivos aprovados, incluindo seleção de Champions e fonte por seção. Nenhuma chave
real foi usada nos mocks, publicada no frontend ou incluída em arquivos de exemplo.
