# Mercado de Ações V1.2 — Catálogo e pesquisa

## Etapa 1 — catálogo local

52 ações (48 adicionadas), em 13 setores. Cada entrada de `frontend/src/market-catalog.ts` contém ticker, empresa, setor e símbolo BMFBOVESPA. A busca ignora caixa/acentos e combina setor e ordenação por ticker ou empresa. Sugestões limitadas a oito itens; setas selecionam, Enter abre e Escape fecha. A lista completa reflete os filtros e informa a quantidade encontrada. Limpar remove a pesquisa e preserva o setor.

Códigos e identidades revisados em 30/10/2026 nas listagens oficiais [ações brasileiras](https://www.tradingview.com/markets/stocks-brazil/market-movers-all-stocks/) e [maiores empresas](https://www.tradingview.com/markets/stocks-brazil/market-movers-large-cap/). Foram usados códigos atuais, como AXIA3 e EMBJ3, em vez de ELET3 e EMBR3. Setores são agrupamentos editoriais locais, não uma taxonomia oficial da B3. Para manutenção, revisar listagem, mudanças de ticker e o widget incorporado antes de alterar o catálogo; a cobertura externa pode mudar.

O Tickers mantém somente os quatro destaques originais via `featuredStocks`, evitando carregar 52 cotações na página. Todas as entradas usam a página individual existente e o mesmo Symbol Overview. Não há pesquisa remota, novos widgets ou alterações no backend/brapi.

## Interface pública e provedores separados

`#/acoes` usa busca local por código/nome e o **Tickers** oficial; `#/acoes/ITUB4` (e os demais códigos do catálogo) usa **Symbol Overview**, sempre com prefixo `BMFBOVESPA:`. Para ampliar, acrescente a identidade e confirme a cobertura real antes de publicar. Códigos desconhecidos recebem mensagem local; a ausência no catálogo não significa que a empresa não existe na bolsa.

Nenhum valor de mercado é lido, extraído, armazenado ou replicado pela 2T. Preço, variação, períodos, tooltip e histórico pertencem ao widget e são exibidos por ele. Os cards de navegação mostram apenas ticker/nome. A interface não chama `/api/market/*`, nem precisa de token, banco ou plano pago.

### Incorporação oficial

- [Tickers](https://www.tradingview.com/widget-docs/widgets/tickers/tickers/): Web Component `tv-tickers`, módulo oficial `https://widgets.tradingview-widget.com/w/br/tv-tickers.js`, carregado uma vez por documento, somente ao entrar na área. Orientação vertical em telas estreitas, horizontal nas demais. Links de símbolos usam `symbol-url` e o evento documentado `tv-link-open`; as marcas e atribuições mantêm seus destinos.
- [Symbol Overview](https://www.tradingview.com/widget-docs/widgets/charts/symbol-overview/): script oficial `https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js`, com configuração JSON e iframe gerado pelo TradingView. São oferecidos 1 dia, 1 mês, 3 meses, 1 ano, 5 anos e todo o histórico disponível, respeitando o que a fonte entregar. Locale `br`; dimensões relativas dentro de um contêiner com altura definida. Fundo e tema configurados pelas opções oficiais, sem alterações dentro do iframe.
- `tradingview-widget.ts` encapsula os dois formatos: observa tema e largura, limpa iframe, observers, eventos e timers ao sair, descarta montagens assíncronas antigas e apresenta fallback/repetição em falhas de script/timeout. A definição do módulo Tickers fica compartilhada; os dados/conexões pertencem ao provedor. O tema recria o Overview para seguir sua API de incorporação.
- A marca interna e a atribuição externa são preservadas. Não há overlays que cubram o gráfico, filtros CSS que alterem logos ou manipulação de shadow roots. São usados apenas os tokens CSS públicos de tipografia/cores e opções documentadas.

### Dados, atraso e condições

O [anúncio oficial da B3 nos widgets](https://www.tradingview.com/blog/en/b3-data-available-in-tradingview-widgets-41743/) informa disponibilidade gratuita com atraso de **15 minutos**. A [cobertura atual](https://www.tradingview.com/widget-docs/markets/mexico-south-america/) confirma B3 atrasada. A interface informa esse atraso e não promete tempo real, disponibilidade contínua ou precisão garantida. A informação exibida pelo próprio widget prevalece se o provedor mudar a cobertura. Planos pagos pessoais não liberam dados diferentes para embeds.

Widgets são [gratuitos com a marca padrão](https://www.tradingview.com/widget/), sujeitos aos [termos do TradingView](https://www.tradingview.com/policies/). Isso não autoriza criar um proxy/API de preços, extrair dados ou remover a atribuição. O [FAQ de dados](https://www.tradingview.com/widget-docs/faq/data/) explica que alguns símbolos podem ser exclusivos do site TradingView. Há aviso e link de consulta externa para esse caso; a 2T não tenta contornar restrições nem substituir dados por números fictícios. Bloqueadores, rede corporativa e indisponibilidade externa podem impedir a incorporação.

### CSP e manutenção

A CSP em `frontend/index.html` limita scripts/frames ao próprio site e aos hosts oficiais usados: `s3.tradingview.com`, `widgets.tradingview-widget.com` e `www.tradingview-widget.com`. Logos usam `s3-symbol-logo.tradingview.com`; Google Fonts continua autorizado para IBM Plex Sans. O connect-src inclui localhost:8000 apenas para o desenvolvimento já existente. Os documentos externos dos widgets mantêm suas próprias políticas. Não são liberados curingas de domínios, unsafe-eval ou scripts inline genéricos; o bootstrap de tema existente tem hash SHA-256 específico (recalcular se seu conteúdo mudar). Estilos inline são necessários ao embed oficial e aos componentes existentes.

Testes de adapter usam stubs sem valores de mercado; não comprovam dados reais. Para inspeção externa sem mocks: com o servidor local ativo em 8123, execute `$env:TV_LIVE='1'; npm run test:e2e -- frontend/tests/tradingview-live.spec.ts`. Para o domínio publicado, defina também `$env:BASE_URL='https://matheus2t.com.br'`. Esse teste captura os quatro símbolos, três meses e mobile/tema claro, verifica console, estrutura e ausência de chamadas à brapi. **Revise também as capturas:** iframe ou canvas existente, isoladamente, não prova exibição de cotação. O teste não lê preços de dentro dos widgets. Remova `TV_LIVE` para a suíte padrão, que não depende da disponibilidade do serviço externo.

## Integração brapi preservada (V1)

O backend, token, cache, validações e testes Python da V1 permanecem preservados. `MARKET_DATA_PUBLIC_ENABLED` continua **false**, independentemente da integração TradingView. O componente antigo foi guardado em `brapi-market-page.ts`, sem importação no bundle público ou rota pública; `stock-chart.ts` também foi mantido. As instruções abaixo referem-se à API brapi legada em desenvolvimento. Sua liberação pública continua condicionada a licenciamento separado; os widgets não a autorizam.

## Publicação condicionada ao licenciamento

Em 30/10/2026 foram consultados os [termos da brapi](https://brapi.dev/legal/terms-of-use), a [FAQ comercial](https://brapi.dev/faq/posso-usar-a-brapi-para-construir-um-app-comercial-ou-para-minha-empresa), os [termos da B3](https://www.b3.com.br/pt_br/termos-de-uso-e-protecao-de-dados/termos-de-uso/) e a [política de consumo de Market Data](https://www.b3.com.br/data/files/0D/97/1F/B7/4CCFF91094DCD8F9AC094EA8/Politica%20de%20Consumo%20de%20Market%20Data%20B3%20V1.1.pdf).

Os termos da brapi restringem redistribuição e wrappers públicos. A FAQ admite integração respeitando termos, mas não constitui autorização inequívoca para distribuir cotações neste site. As regras da B3 também exigem avaliar a licença correspondente. Portanto **a distribuição pública fica desativada**. É necessário obter confirmação escrita da brapi e esclarecer a cobertura/licença B3 antes de habilitá-la. Não foi contratado serviço nem enviada solicitação em nome do usuário.

No Vercel (`VERCEL=1`), `MARKET_DATA_PUBLIC_ENABLED` tem padrão `false`; endpoints brapi de busca/cotação/histórico retornam 503 sem chamar a fonte. A interface antiga da brapi foi preservada sem rota pública; a V1.1 usa TradingView. A existência de token não remove o bloqueio da brapi. A variável deve ser ativada somente após a autorização correspondente. O código e testes completos da API ficam disponíveis localmente.

## Desenvolvimento

Para testar a API brapi preservada, use o backend com `PUBLIC_HISTORY_ENABLED=false`, `DATABASE_URL` vazio e **sem** `VERCEL=1`. Inicie `python -m uvicorn app.main:app --app-dir backend --port 8123`; consulte localmente `/api/market/quote/ITUB4` e `/api/market/history/ITUB4?range=3mo`. A rota `#/acoes` agora usa exclusivamente TradingView, inclusive em desenvolvimento.

`BRAPI_API_KEY` é opcional, apenas no backend, lida como SecretStr e enviada em Authorization Bearer. Nunca usar prefixos de frontend, query string, `.env` versionado ou logs. Sem token: ITUB4, PETR4, VALE3, MGLU3. Com token: outros códigos podem ser consultados individualmente, sujeitos à cobertura e ao plano; busca por nome/sugestões limita-se à lista conhecida de quatro empresas.

No PowerShell, use `$env:BRAPI_API_KEY='SUA_CHAVE'` somente se tiver uma chave gratuita. A configuração existente lê variáveis do processo e `.env` no diretório de execução; iniciar pela raiz não carrega automaticamente `backend/.env`. Para desenvolvimento, remova uma marca antiga de Vercel com `Remove-Item Env:VERCEL -ErrorAction SilentlyContinue`. Não grave o valor real da chave nos comandos versionados ou em capturas de tela. Nenhuma variável foi configurada remotamente nesta entrega.

## Contratos e limitações

[Cotação e histórico v2](https://brapi.dev/docs/acoes): `GET /api/v2/stocks/quote?symbols=TICKER`; `GET /api/v2/stocks/historical?symbols=TICKER&range=7d|1mo|3mo&interval=1d&sortOrder=asc`. Envelope `results[].data`, identidade `symbol`. Os contratos foram conferidos com consultas reais sem token de ITUB4. Não se utiliza o endpoint legado como fallback. Períodos 7d, 1mo e 3mo podem conter somente pregões disponíveis, não um número fixo de pontos.

Campos ausentes permanecem null e são apresentados como Não disponível. Horário de cotação vem de `regularMarketTime`, não do relógio de consulta; fetched_at é separado. Gráfico usa close informado pela fonte; não calcula preço ajustado ou dados faltantes. Não se apresentam cotações como tempo real. Os limites e atrasos devem ser reconferidos no plano vigente; o projeto não garante um atraso fixo nem 15 mil consultas para qualquer conta.

Cache LRU em memória por instância, 256 entradas e TTL de 1800s para cotação/histórico, com exclusão mútua para requisições simultâneas. Não é cache global: cold starts, múltiplas instâncias e regiões podem repetir consultas e consumir cota. Sem polling nem tentativas automáticas. Erros não viram cotação, dados expirados não são servidos como atuais. Não existe contratação ou upgrade automático. Para alto tráfego, será necessário avaliar controle global de cota antes da liberação pública.

Timeout na fonte, resposta limitada a 2 MB, origem fixa, validação de ticker e allowlist de períodos; erros 400/401/403/404/429/conexão tratados sem repassar payloads ou credenciais. Cache-Control no-store no navegador preserva a decisão de bloqueio por licenciamento. O proxy não aceita URLs arbitrárias e não acessa MySQL.
