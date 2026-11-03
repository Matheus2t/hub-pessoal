# Ações V2 — investigação de rolagem (03/11/2026)

Base publicada: `5a466f1`. Correção limitada ao catálogo `#/acoes`.
Não há mudanças de Times, Learn, Início, Calculadoras, Renda Fixa, fontes de
mercado, fórmulas, preferências ou estrutura dos painéis.

## Evidência anterior à correção

Reprodução com Brave e Google Chrome instalados (Chromium 156.0.8078.80),
em 1920, 1366, 768, 390 e 320px. Em cada resolução: provedor real e isolado,
pausas parado, rolagem pelas margens, retorno e rolagem sobre o conteúdo.
Os números e o método constam em `stocks-scroll-baseline.json` (20 cenários).
A instrumentação não muda o tamanho observado nem escreve dados financeiros.

- Nas fases de rolagem pela página: **0px de mudança na posição documental e
  na altura do catálogo/painéis; 0 callbacks de ResizeObserver; 0 long tasks
  observadas no documento principal**. Picos de carregamento são separados.
- A lista tem 65 links e 267 elementos. Quinze rerenders controlados levaram
  mediana de 0,3ms e máximo de 0,9ms. Nenhum rerender do catálogo ocorreu por
  causa da rolagem. Não foi justificada virtualização ou alteração do grid.
- As mesmas 24 entradas de roda de 120px avançaram 2.880px pela margem ou
  com o provedor isolado. Sobre o gráfico real: 0px em desktop/768px; em
  390/320px, apenas 240/360px até o iframe entrar sob o cursor.
- Controle específico no Brave, 1366px: partindo de scrollY=1800 e aplicando
  40 entradas de −60px, a página parou em **540px**, apesar de ainda haver
  entradas para chegar ao topo. A coordenada documental do catálogo ficou
  exatamente em 1215,6875px. O controle temporário chegou a **0px** com a
  mesma geometria e sequência. O teste determinístico também falhou antes
  da correção (ficou em 616px) e passou depois.

Isso reproduz uma interrupção do gesto quando o iframe captura a roda;
não demonstra instabilidade do ResizeObserver ou recálculo oscilante do layout.
Não se atribui ao código um problema de GPU/vídeo que as medidas não mostram.
A análise de long tasks é do documento principal; não é um profiler completo
implementado dentro dos scripts privados do provedor.

## Correção mínima

Enquanto um gesto **da página** está ativo, apenas seus hosts de widgets em
Ações deixam temporariamente de capturar o ponteiro. Após 180ms sem scroll,
a interação normal é restaurada. O gesto pode atravessar gráfico e lista
sem ser interrompido. Não há overlay, botão novo, scrollTo no produto,
intervenção no iframe ou alteração de dimensões.

O listener é passivo, a classe só é escrita quando muda, não há estado Lit
reativo nem renderização dos 65 itens no handler. Timer/listener são liberados
ao sair da rota. Gestos iniciados no gráfico parado continuam destinados ao
gráfico; teclado, cliques, desenho e zoom ficam disponíveis normalmente.
O ResizeObserver foi preservado integralmente.

Referências do provedor: [widget e opções oficiais](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)
e [módulo público usado](https://widgets.tradingview-widget.com/w/br/tv-advanced-chart.js).
A biblioteca Advanced Charts licenciada possui APIs diferentes e não foi
confundida com o widget gratuito já integrado.

## Testes

`frontend/tests/market-scroll.spec.ts` usa iframe isolado que realmente captura
a roda, respeitando a CSP. A versão inicial com srcdoc não foi considerada
prova, pois a CSP bloqueava o script; a fixture válida usa o domínio de widget
interceptado somente nos testes, sem preços fictícios.

O teste percorre as cinco larguras e ambos os temas, mede as posições e alturas
por requestAnimationFrame, impede inversões/saltos maiores que a entrada de
roda, verifica ausência de movimento parado, restaura a interação do gráfico
e preserva preferências após navegação. `MARKET_SCROLL_LIVE=1` usa o provedor
real, incluindo recarga dos widgets na troca de tema. Medições são anexadas
como JSON às saídas Playwright; capturas são revisadas visualmente.

Execução Windows (nenhum caminho de instalação é imposto ao projeto):

```powershell
$env:MARKET_SCROLL_BROWSER_PATH = 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
npx playwright test market-scroll.spec.ts
$env:MARKET_SCROLL_LIVE = '1'
npx playwright test market-scroll.spec.ts
# Repetir apontando MARKET_SCROLL_BROWSER_PATH para o chrome.exe instalado.
```

## Homologação local

- Typecheck e build de produção aprovados.
- 24 execuções da matriz principal aprovadas: Brave e Chrome, real/isolado,
  cinco resoluções e dois temas, mais navegação e preferências.
- 34 regressões relevantes aprovadas: Ações, widgets, CVM/TTM, modos, ordem,
  recuperação de preferências e isolamento das áreas preservadas.
- As 30 comparações visuais dos Times continuam aprovadas.
- Capturas reais das cinco resoluções revisadas nos dois temas.
- Repetição instrumentada em 1366px: Brave e Chrome, real/isolado,
  scrollY 1800→0; 0px de mudança de geometria, 0 RO e 0 long tasks na passagem.
  As atualizações dos painéis continuam sendo somente as duas de montagem.

- Mais quatro execuções de descida aprovadas (Brave/Chrome, real/isolado),
  cobrindo desktop e celular. Total local: **62 execuções aprovadas**.
- `git diff --check` aprovado. O teste falhou na versão antiga e passou com
  a correção, sem aumentar timeouts para esconder a captura de roda.

Os resultados de produção ficam registrados com o release/PR da correção,
incluindo o SHA e o deploy correspondente.
A árvore das áreas restritas e seus dados permanece idêntica à base publicada.
