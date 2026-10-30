# Mercado de Ações V1

## Publicação condicionada ao licenciamento

Em 30/10/2026 foram consultados os [termos da brapi](https://brapi.dev/legal/terms-of-use), a [FAQ comercial](https://brapi.dev/faq/posso-usar-a-brapi-para-construir-um-app-comercial-ou-para-minha-empresa), os [termos da B3](https://www.b3.com.br/pt_br/termos-de-uso-e-protecao-de-dados/termos-de-uso/) e a [política de consumo de Market Data](https://www.b3.com.br/data/files/0D/97/1F/B7/4CCFF91094DCD8F9AC094EA8/Politica%20de%20Consumo%20de%20Market%20Data%20B3%20V1.1.pdf).

Os termos da brapi restringem redistribuição e wrappers públicos. A FAQ admite integração respeitando termos, mas não constitui autorização inequívoca para distribuir cotações neste site. As regras da B3 também exigem avaliar a licença correspondente. Portanto **a distribuição pública fica desativada**. É necessário obter confirmação escrita da brapi e esclarecer a cobertura/licença B3 antes de habilitá-la. Não foi contratado serviço nem enviada solicitação em nome do usuário.

No Vercel (`VERCEL=1`), `MARKET_DATA_PUBLIC_ENABLED` tem padrão `false`; endpoints de busca/cotação/histórico retornam 503 sem chamar a fonte. A tela informa a restrição e não mostra dados fictícios. A existência de token não remove o bloqueio. A variável deve ser ativada somente após a autorização. O código e testes completos ficam disponíveis localmente.

## Desenvolvimento

Use o backend existente com `PUBLIC_HISTORY_ENABLED=false`, `DATABASE_URL` vazio e **sem** `VERCEL=1`. Inicie `python -m uvicorn app.main:app --app-dir backend --port 8123` após `npm run build`; abra `http://localhost:8123/#/acoes`. O frontend em modo dev também usa a API local já configurada.

`BRAPI_API_KEY` é opcional, apenas no backend, lida como SecretStr e enviada em Authorization Bearer. Nunca usar prefixos de frontend, query string, `.env` versionado ou logs. Sem token: ITUB4, PETR4, VALE3, MGLU3. Com token: outros códigos podem ser consultados individualmente, sujeitos à cobertura e ao plano; busca por nome/sugestões limita-se à lista conhecida de quatro empresas.

No PowerShell, use `$env:BRAPI_API_KEY='SUA_CHAVE'` somente se tiver uma chave gratuita. A configuração existente lê variáveis do processo e `.env` no diretório de execução; iniciar pela raiz não carrega automaticamente `backend/.env`. Para desenvolvimento, remova uma marca antiga de Vercel com `Remove-Item Env:VERCEL -ErrorAction SilentlyContinue`. Não grave o valor real da chave nos comandos versionados ou em capturas de tela. Nenhuma variável foi configurada remotamente nesta entrega.

## Contratos e limitações

[Cotação e histórico v2](https://brapi.dev/docs/acoes): `GET /api/v2/stocks/quote?symbols=TICKER`; `GET /api/v2/stocks/historical?symbols=TICKER&range=7d|1mo|3mo&interval=1d&sortOrder=asc`. Envelope `results[].data`, identidade `symbol`. Os contratos foram conferidos com consultas reais sem token de ITUB4. Não se utiliza o endpoint legado como fallback. Períodos 7d, 1mo e 3mo podem conter somente pregões disponíveis, não um número fixo de pontos.

Campos ausentes permanecem null e são apresentados como Não disponível. Horário de cotação vem de `regularMarketTime`, não do relógio de consulta; fetched_at é separado. Gráfico usa close informado pela fonte; não calcula preço ajustado ou dados faltantes. Não se apresentam cotações como tempo real. Os limites e atrasos devem ser reconferidos no plano vigente; o projeto não garante um atraso fixo nem 15 mil consultas para qualquer conta.

Cache LRU em memória por instância, 256 entradas e TTL de 1800s para cotação/histórico, com exclusão mútua para requisições simultâneas. Não é cache global: cold starts, múltiplas instâncias e regiões podem repetir consultas e consumir cota. Sem polling nem tentativas automáticas. Erros não viram cotação, dados expirados não são servidos como atuais. Não existe contratação ou upgrade automático. Para alto tráfego, será necessário avaliar controle global de cota antes da liberação pública.

Timeout na fonte, resposta limitada a 2 MB, origem fixa, validação de ticker e allowlist de períodos; erros 400/401/403/404/429/conexão tratados sem repassar payloads ou credenciais. Cache-Control no-store no navegador preserva a decisão de bloqueio por licenciamento. O proxy não aceita URLs arbitrárias e não acessa MySQL.
