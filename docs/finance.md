# Pesquisa e decisões — evolução financeira 2T

## Referências consultadas em 30/10/2026

Análise das páginas públicas e seus formulários/documentação; não representa teste manual completo dessas plataformas em dispositivos reais.

| Referência | Observação | Decisão para a 2T |
|---|---|---|
| [Mobills](https://www.mobills.com.br/calculadoras/) | Catálogo amplo, incluindo juros e PRICE | Catálogo com acesso direto e busca |
| [iDinheiro](https://www.idinheiro.com.br/calculadoras/calculadora-juros-compostos/) | Taxas mensais/anuais e prazo em meses/anos | Unidades explícitas no formulário |
| [Investidor10](https://investidor10.com.br/calculadoras/) | Ferramentas agrupadas por necessidades financeiras | Nomes claros e descrições curtas |
| [Banco Central](https://www.bcb.gov.br/pec/calculo/calc_financiamento/Default.asp?frame=1) | Quatro variáveis e exemplos de prestações fixas | Conferência independente e premissas de pagamento claras |
| [Omni](https://www.omnicalculator.com/finance/amortization) | Separa saldo, principal e juros; documenta fórmulas | Tabela de amortização e resumo separado |
| [Calculator.net](https://www.calculator.net/finance-calculator.html) | Frequências explícitas e cronograma | Taxas equivalentes e detalhamento mensal |
| [NerdWallet](https://www.nerdwallet.com/banking/calculators) | Catálogo orientado a objetivos | Acesso simples, sem exigir conta |
| [Bankrate](https://www.bankrate.com/mortgages/amortization-calculator/) | Distingue principal e juros na amortização | Exibir custo total e primeira/última parcela |

Não foram copiados código, textos, marcas ou layouts. A análise responsiva das referências é limitada ao conteúdo acessível; a 2T recebe testes reais de desktop e mobile.

## Diagnóstico e prioridades

O catálogo tinha uma ferramenta e links com nomes acessíveis repetidos; faltavam seletores de unidades. Os componentes financeiros, gráfico com mouse/toque/teclado e tabela paginada já eram reutilizáveis. A fonte presente era Helvetica/Arial, sem IBM Plex Sans nem detalhe ciano descrito no briefing.

Ordem: preservar juros compostos; introduzir unidades; entregar juros simples, PRICE e SAC com validação; ampliar catálogo com busca; ajustar densidade/identidade; validar e publicar. Porcentagem, rentabilidade, inflação e CDI ficam para entregas seguintes, com critérios e testes próprios. Nenhuma taxa de mercado é fornecida automaticamente.

## Convenções matemáticas

Taxas são percentuais informados pelo usuário; mês é o período de cálculo. Anos inteiros correspondem a 12 meses. Limite: 600 meses. Simulações nominais, sem IOF, seguros, tarifas, impostos, inflação ou CET; não são ofertas ou garantias.

- Juros compostos existente: B_t = arredondar(B_(t−1) × (1+i)) + aporte; aporte ao fim do mês. Juros arredondados mensalmente em centavos, ROUND_HALF_UP, preservando o contrato existente.
- Taxa efetiva anual para mensal: i_m = (1+i_a)^(1/12) − 1. Não dividir uma taxa composta anual por 12.
- Juros simples: J_t = C × i × t, M_t = C + J_t. Taxa simples anual proporcional: i_m = i_a/12. Sem aportes. Juros mensais da tabela são a diferença entre juros acumulados arredondados.
- PRICE: P = C × i / (1−(1+i)^−n); para taxa zero P=C/n. J_t = saldo anterior × i; A_t=P−J_t.
- SAC: A=C/n; J_t=saldo anterior × i; P_t=A+J_t.
- Financiamentos: primeira parcela após um mês, sem entrada; capital representa o valor já financiado. Juros e pagamentos em centavos ROUND_HALF_UP. Na última parcela ajusta-se a amortização ao saldo remanescente, encerrando em zero. PRICE pode ter pequeno ajuste final de centavos. Totais somam a tabela, não parcelas teóricas.

Exemplos independentes: simples C=1000, i=1% a.m., n=3 → J=30, M=1030. PRICE C=1000, i=1%, n=3 → parcelas 340,02 / 340,02 / 340,03; total 1020,07. SAC nas mesmas condições → 343,33 / 340,00 / 336,67; total 1020,00. Taxa zero deve devolver apenas o principal, com ajuste final de centavos.
