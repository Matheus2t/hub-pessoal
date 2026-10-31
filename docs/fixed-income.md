# Renda Fixa V1

Rota: `#/renda-fixa`. Lit/TypeScript/SCSS/esbuild existentes. C√°lculos puros em
`frontend/src/fixed-income.ts`, executados exclusivamente no navegador. Sem API,
login, hist√≥rico remoto, banco adicional ou depend√™ncia nova. Todas as taxas s√£o
hip√≥teses manuais constantes. Nenhum valor √© apresentado como taxa de mercado.

## Escopo e refer√™ncia normativa

Verifica√ß√£o: **31/10/2026**. Pessoa f√≠sica residente no Brasil, aplica√ß√£o √∫nica,
sem aportes, sem cupons. Regras congeladas na data de refer√™ncia, inclusive em
proje√ß√µes futuras; n√£o reproduz mudan√ßas legislativas nem apura o IRPF global.

Fontes oficiais consultadas:

- [Receita: rendimentos do capital](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/rendimentos/rendimentos-do-capital).
- [IN RFB 1.585/2015](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=67494), tributa√ß√£o regressiva e isen√ß√µes de LCI/LCA para PF.
- [Decreto 6.306/2007](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm), art. 32 e anexo do IOF.
- [CMN 5.215/2025](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=5215&tipo=Resolu%C3%A7%C3%A3o+CMN).
- [B3: prazo m√≠nimo LCI/LCA](https://www.b3.com.br/data/files/63/43/8C/0B/43FF69106B8BCB69AC094EA8/CE%20016-2025-VPC%20PLATAFORMA%20NOME%20BALCAO%20B3_LCA_LCI.pdf).
- [Tesouro: regras e regulamento](https://www.tesourodireto.com.br/sobre-o-tesouro/regras-e-regulamento), impostos, cust√≥dia, isen√ß√£o Selic e marca√ß√£o a mercado.
- [FGC: material oficial](https://www.fgc.org.br/documents/d/guest/fgc_material-de-apoio-ao-atendimento), limites de cobertura.

## Taxas, capitaliza√ß√£o e datas

Datas ISO em UTC, sem efeitos de fuso ou hor√°rio de ver√£o. Prazo fiscal em dias
corridos exatos, exclu√≠da a data inicial. Meses de calend√°rio preservam o dia
inicial quando poss√≠vel, limitando ao √∫ltimo dia do m√™s. Limite de 600 meses.

- CDB e LCI/LCA CDI: `d = expm1(log1p(CDI/100)/252)`,
  `G(t) = P * (1 + d * percentualCDI/100)^(t*252/365)`.
  Dias √∫teis aproximados proporcionalmente: **DU = DC √ó 252/365**; n√£o conta
  fins de semana ou feriados individualmente. N√£o multiplica a taxa anual pelo
  percentual do CDI. Hip√≥tese de CDI constante.
- LCI/LCA prefixadas: `G(t) = P * (1 + taxa/100)^(t/365)`.
- Selic: `G(t) = P * [(1+Selic/100)*(1+adicional/100)]^(t/365)`.
  Composi√ß√£o aproximada dos fatores anuais; n√£o soma taxas. N√£o precifica √°gio,
  des√°gio, VNA, spreads de negocia√ß√£o ou pre√ßo de uma LFT.
- IPCA+ sem cupons: fator anual `(1+IPCA/100)*(1+real/100)`; acumula√ß√£o em `t/365`.
  Infla√ß√£o constante, sem modelar defasagens do √≠ndice ou pre√ßo unit√°rio oficial.
- Retorno acumulado l√≠quido: `L/P - 1`. Anualiza√ß√£o: `(L/P)^(365/DC)-1`.
  Se `L <= 0`, anualiza√ß√£o n√£o √© definida e assim aparece na interface.
- Poder de compra IPCA+: `L/(1+IPCA/100)^(DC/365)`, em reais da data inicial.
  Retorno real l√≠quido: `poderDeCompra/P - 1` (depois de custos e impostos).

Usa log1p/expm1 e IEEE-754 sem arredondar saldos di√°rios. Moeda arredondada apenas
na apresenta√ß√£o, em centavos. Proje√ß√µes acima de `MAX_SAFE_INTEGER/100` s√£o
recusadas para preservar precis√£o monet√°ria. N√£o √© extrato fiscal de uma corretora.

## Impostos e custos

IR sobre `max(rendimento positivo ‚àí IOF, 0)`, nunca sobre o principal. Faixas em
dias: at√© 180: 22,5%; 181‚Äì360: 20%; 361‚Äì720: 17,5%; a partir de 721: 15%.
LCI/LCA: isentas para a PF contemplada na V1; n√£o extrapola a isen√ß√£o para PJ.

IOF dos dias 1‚Äì30, em % do rendimento: 96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0.
Somente CDB e Tesouro, se o resgate estiver permitido; n√£o aplica em LCI/LCA.
Perdas e rendimento nulo n√£o geram IR/IOF. Custos n√£o abatem a base do IR.

Cust√≥dia padr√£o: 0,20% a.a., edit√°vel. Taxa da institui√ß√£o: hip√≥tese inicial zero,
edit√°vel. Provis√£o di√°ria estimada: `baseDoDia * taxaAnual/100/365`, somada at√© a
data consultada e descontada no resgate projetado. Base: saldo bruto ao fim do
dia; n√£o desconta custos diariamente da capitaliza√ß√£o. Estimativa ACT/365, sem
calend√°rio de liquida√ß√£o D+1 ou pre√ßos de mercado: pode diferir da cobran√ßa real.

Selic: base incremental = `max(0, saldo ‚àí max(0, 10000 ‚àí outrosSelic))`. O estoque
de outros t√≠tulos informado permanece constante e n√£o √© somado ao resultado da
aplica√ß√£o simulada. Zero/em branco: **cen√°rio isolado**, n√£o uma declara√ß√£o de
isen√ß√£o de todo o patrim√¥nio do CPF. A institui√ß√£o cobra sobre todo o saldo;
a isen√ß√£o aplica-se somente √† cust√≥dia B3. IPCA+: cust√≥dia sobre todo o saldo.

## Liquidez, limites e garantias

LCI/LCA suportam somente CDI ou prefixadas, sem indexa√ß√£o a pre√ßos. Vencimento
e primeira data poss√≠vel de resgate respeitam seis meses de calend√°rio. Car√™ncia
contratual pode ser maior; n√£o pode ultrapassar o vencimento. Esta regra √© usada
para aplica√ß√µes a partir de 23/05/2025; datas anteriores s√£o recusadas.

Proje√ß√£o pode ser consultada durante a car√™ncia, mas √© marcada indispon√≠vel para
resgate. Liquidez di√°ria significa possibilidade contratual ap√≥s car√™ncia, sujeita
a dias de opera√ß√£o, liquida√ß√£o e regras do emissor; n√£o √© promessa de caixa imediato.
Tesouro IPCA+ antes do vencimento: **curva, sem estimativa de venda**. A V1 n√£o
precifica venda antecipada. Selic tamb√©m √© proje√ß√£o de curva, n√£o pre√ßo garantido.

CDB/LCI/LCA podem ter FGC conforme emissor/regras: at√© R$ 250 mil por CPF/CNPJ por
institui√ß√£o/conglomerado e teto global de R$ 1 milh√£o em quatro anos. N√£o analisa
risco ou elegibilidade de emissores. Tesouro Direto n√£o possui cobertura FGC.


## ComparaÁ„o e evoluÁ„o

Dois a quatro cen·rios usam exatamente `project`, como a simulaÁ„o individual.
Valor, data inicial e horizonte s„o comuns; Ìndices tambÈm s„o comuns quando usados.
O vencimento acompanha o horizonte por padr„o e pode ser editado individualmente.
N„o h· ranking ou recomendaÁ„o autom·tica. Cada linha identifica a comparabilidade.

Se o vencimento ocorrer antes do horizonte, a sÈrie termina no vencimento, mostra
a data efetiva e n„o presume reinvestimento ou continuidade de remuneraÁ„o. Se o
resgate estiver bloqueado na data comum, o cen·rio n„o È considerado compar·vel
como caixa. IPCA+ anterior ao vencimento È curva, nunca valor de venda estimado.

SÈries incluem a aplicaÁ„o, anivers·rios mensais e a data final exata; m·ximo de
600 meses, com atÈ 601 pontos incluindo o inicial. Custos s„o provisionados dia
a dia, e IR/IOF s„o recalculados para o prazo de cada ponto; n„o se repete o imposto
final na sÈrie inteira. Resgates n„o permitidos s„o identificados. Tabela expansÌvel
com paginaÁ„o de 24 linhas; gr·ficos prÛprios, sem dependÍncias, com seleÁ„o por
ponteiro, toque ou controle de data acessÌvel por teclado. As sÈries do comparador
terminam no vencimento de cada produto. N„o se interpolam retornos ausentes.


## ValidaÁ„o da V1

- `npm run typecheck` e `npm run build`: aprovados.
- `python -m pytest -q backend/tests`: 101 testes aprovados.
- `npm run test:e2e`: 89 aprovados, 1 teste live optativo TradingView desativado.
- Renda Fixa: 27 testes matem·ticos + 8 de interface, tambÈm reexecutados isoladamente.
- Or·culos independentes: Python Decimal com precis„o 60 para CDI e multiplicador
  di·rio; fÛrmulas fechadas independentes para somas de custÛdia; identidades de
  composiÁ„o e deflaÁ„o para IPCA+. N„o usa screenshots para provar matem·tica.
- Cobertura: R$ 1.000/10.000/100.000, taxas zero e negativas, 100%/110%/90% CDI,
  LCA prefixada, IOF de 15/30 dias e tabela completa, todas as fronteiras de IR,
  custÛdia Selic com estoque adicional e cruzamento da isenÁ„o, IPCA+, carÍncia,
  comparaÁ„o de 2ñ4 cen·rios e vencimentos distintos, datas inv·lidas, anos
  bissextos, fins de mÍs, limite de 600 meses, paginaÁ„o e controles por teclado.
- Layouts 1920, 1366, 768, 390 e 320 px; temas claro/escuro; inspeÁ„o visual;
  nenhuma rolagem horizontal da p·gina (tabelas possuem rolagem prÛpria).
- Regress„o: quatro calculadoras, navegaÁ„o, cat·logo das 52 aÁıes, CVM, widgets,
  proteÁıes da brapi e Times incluÌdos na suÌte existente.
- A interface de Renda Fixa n„o faz POST nem consulta APIs externas de taxas.

N„o requer novas chaves, dependÍncias, banco ou serviÁo pago. HistÛrico opcional
n„o foi incluÌdo: os dados s„o mantidos em memÛria durante a navegaÁ„o na ·rea.
Limpar/recarregar/sair descarta os cen·rios. O tema usa a preferÍncia j· existente.

Exemplos usados **somente em testes**, n„o taxas correntes:

| HipÛtese | Resultado lÌquido independente |
| --- | ---: |
| R$ 1.000, CDI 12%, CDB 100%, 365 dias | R$ 1.099,00 |
| R$ 10.000, CDI 12%, CDB 110%, 730 dias | R$ 12.406,77 |
| R$ 10.000, CDI 12%, CDB 100%, 15 dias | R$ 10.018,09 |
| R$ 10.000, IPCA 4% e real 6%, 365 dias, custos zero | R$ 10.844,80 |
