# Renda Fixa V1

Rota: `#/renda-fixa`. Lit/TypeScript/SCSS/esbuild existentes. Cálculos puros em
`frontend/src/fixed-income.ts`, executados exclusivamente no navegador. Sem API,
login, histórico remoto, banco adicional ou dependência nova. Todas as taxas são
hipóteses manuais constantes. Nenhum valor é apresentado como taxa de mercado.

## Escopo e referência normativa

Verificação: **31/10/2026**. Pessoa física residente no Brasil, aplicação única,
sem aportes, sem cupons. Regras congeladas na data de referência, inclusive em
projeções futuras; não reproduz mudanças legislativas nem apura o IRPF global.

Fontes oficiais consultadas:

- [Receita: rendimentos do capital](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/rendimentos/rendimentos-do-capital).
- [IN RFB 1.585/2015](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=67494), tributação regressiva e isenções de LCI/LCA para PF.
- [Decreto 6.306/2007](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm), art. 32 e anexo do IOF.
- [CMN 5.215/2025](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=5215&tipo=Resolu%C3%A7%C3%A3o+CMN).
- [B3: prazo mínimo LCI/LCA](https://www.b3.com.br/data/files/63/43/8C/0B/43FF69106B8BCB69AC094EA8/CE%20016-2025-VPC%20PLATAFORMA%20NOME%20BALCAO%20B3_LCA_LCI.pdf).
- [Tesouro: regras e regulamento](https://www.tesourodireto.com.br/sobre-o-tesouro/regras-e-regulamento), impostos, custódia, isenção Selic e marcação a mercado.
- [FGC: material oficial](https://www.fgc.org.br/documents/d/guest/fgc_material-de-apoio-ao-atendimento), limites de cobertura.

## Taxas, capitalização e datas

Datas ISO em UTC, sem efeitos de fuso ou horário de verão. Prazo fiscal em dias
corridos exatos, excluída a data inicial. Meses de calendário preservam o dia
inicial quando possível, limitando ao último dia do mês. Limite de 600 meses.

- CDB e LCI/LCA CDI: `d = expm1(log1p(CDI/100)/252)`,
  `G(t) = P * (1 + d * percentualCDI/100)^(t*252/365)`.
  Dias úteis aproximados proporcionalmente: **DU = DC × 252/365**; não conta
  fins de semana ou feriados individualmente. Não multiplica a taxa anual pelo
  percentual do CDI. Hipótese de CDI constante.
- LCI/LCA prefixadas: `G(t) = P * (1 + taxa/100)^(t/365)`.
- Selic: `G(t) = P * [(1+Selic/100)*(1+adicional/100)]^(t/365)`.
  Composição aproximada dos fatores anuais; não soma taxas. Não precifica ágio,
  deságio, VNA, spreads de negociação ou preço de uma LFT.
- IPCA+ sem cupons: fator anual `(1+IPCA/100)*(1+real/100)`; acumulação em `t/365`.
  Inflação constante, sem modelar defasagens do índice ou preço unitário oficial.
- Retorno acumulado líquido: `L/P - 1`. Anualização: `(L/P)^(365/DC)-1`.
  Se `L <= 0`, anualização não é definida e assim aparece na interface.
- Poder de compra IPCA+: `L/(1+IPCA/100)^(DC/365)`, em reais da data inicial.
  Retorno real líquido: `poderDeCompra/P - 1` (depois de custos e impostos).

Usa log1p/expm1 e IEEE-754 sem arredondar saldos diários. Moeda arredondada apenas
na apresentação, em centavos. Projeções acima de `MAX_SAFE_INTEGER/100` são
recusadas para preservar precisão monetária. Não é extrato fiscal de uma corretora.

## Impostos e custos

IR sobre `max(rendimento positivo − IOF, 0)`, nunca sobre o principal. Faixas em
dias: até 180: 22,5%; 181–360: 20%; 361–720: 17,5%; a partir de 721: 15%.
LCI/LCA: isentas para a PF contemplada na V1; não extrapola a isenção para PJ.

IOF dos dias 1–30, em % do rendimento: 96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0.
Somente CDB e Tesouro, se o resgate estiver permitido; não aplica em LCI/LCA.
Perdas e rendimento nulo não geram IR/IOF. Custos não abatem a base do IR.

Custódia padrão: 0,20% a.a., editável. Taxa da instituição: hipótese inicial zero,
editável. Provisão diária estimada: `baseDoDia * taxaAnual/100/365`, somada até a
data consultada e descontada no resgate projetado. Base: saldo bruto ao fim do
dia; não desconta custos diariamente da capitalização. Estimativa ACT/365, sem
calendário de liquidação D+1 ou preços de mercado: pode diferir da cobrança real.

Selic: base incremental = `max(0, saldo − max(0, 10000 − outrosSelic))`. O estoque
de outros títulos informado permanece constante e não é somado ao resultado da
aplicação simulada. Zero/em branco: **cenário isolado**, não uma declaração de
isenção de todo o patrimônio do CPF. A instituição cobra sobre todo o saldo;
a isenção aplica-se somente à custódia B3. IPCA+: custódia sobre todo o saldo.

## Liquidez, limites e garantias

LCI/LCA suportam somente CDI ou prefixadas, sem indexação a preços. Vencimento
e primeira data possível de resgate respeitam seis meses de calendário. Carência
contratual pode ser maior; não pode ultrapassar o vencimento. Esta regra é usada
para aplicações a partir de 23/05/2025; datas anteriores são recusadas.

Projeção pode ser consultada durante a carência, mas é marcada indisponível para
resgate. Liquidez diária significa possibilidade contratual após carência, sujeita
a dias de operação, liquidação e regras do emissor; não é promessa de caixa imediato.
Tesouro IPCA+ antes do vencimento: **curva, sem estimativa de venda**. A V1 não
precifica venda antecipada. Selic também é projeção de curva, não preço garantido.

CDB/LCI/LCA podem ter FGC conforme emissor/regras: até R$ 250 mil por CPF/CNPJ por
instituição/conglomerado e teto global de R$ 1 milhão em quatro anos. Não analisa
risco ou elegibilidade de emissores. Tesouro Direto não possui cobertura FGC.


## Compara��o e evolu��o

Dois a quatro cen�rios usam exatamente `project`, como a simula��o individual.
Valor, data inicial e horizonte s�o comuns; �ndices tamb�m s�o comuns quando usados.
O vencimento acompanha o horizonte por padr�o e pode ser editado individualmente.
N�o h� ranking ou recomenda��o autom�tica. Cada linha identifica a comparabilidade.

Se o vencimento ocorrer antes do horizonte, a s�rie termina no vencimento, mostra
a data efetiva e n�o presume reinvestimento ou continuidade de remunera��o. Se o
resgate estiver bloqueado na data comum, o cen�rio n�o � considerado compar�vel
como caixa. IPCA+ anterior ao vencimento � curva, nunca valor de venda estimado.

S�ries incluem a aplica��o, anivers�rios mensais e a data final exata; m�ximo de
600 meses, com at� 601 pontos incluindo o inicial. Custos s�o provisionados dia
a dia, e IR/IOF s�o recalculados para o prazo de cada ponto; n�o se repete o imposto
final na s�rie inteira. Resgates n�o permitidos s�o identificados. Tabela expans�vel
com pagina��o de 24 linhas; gr�ficos pr�prios, sem depend�ncias, com sele��o por
ponteiro, toque ou controle de data acess�vel por teclado. As s�ries do comparador
terminam no vencimento de cada produto. N�o se interpolam retornos ausentes.
