# Calculadoras financeiras adicionais — 2T

Implementadas no navegador em `frontend/src/extended-finance.ts`, sem dependência de APIs externas e sem armazenar dados do usuário.

## Aposentadoria
Planejamento **privado**, não estimativa do INSS. Usa rentabilidade **efetiva anual** convertida para mensal por `(1 + taxa_anual)^(1/12) - 1`. Patrimônio aumenta com capitalização e aportes **no fim** de cada mês. A renda desejada informada é em reais de hoje e é inflacionada até a data da aposentadoria. Patrimônio-meta = renda mensal futura × 12 / taxa anual de retirada. Aporte necessário calculado por anuidade postecipada. Impostos, taxas, volatilidade, longevidade, sequências negativas de retornos e renda pública não integram o modelo; taxa de retirada é hipótese, não promessa.

## Aluguel x Financiamento
Usa PRICE ou SAC, taxa de financiamento anual efetiva e reajuste do aluguel **uma vez por ano**. Imóvel tem valorização composta mensal equivalente à taxa anual. Comparação patrimonial equitativa: quem aluga começa investindo o dinheiro que a compra exigiria para entrada e custos iniciais; em cada mês, a alternativa que gastar menos com moradia investe a diferença. Comprar = valor do imóvel − saldo devedor + carteira financeira do comprador. Alugar = carteira financeira do locatário. O custo extra de propriedade exclui despesas comuns às duas alternativas; saldos líquidos não incluem tributos, custos de venda nem manutenção indexada.

## Amortização
Calcula prestações PRICE e SAC, juros sobre saldo devedor, amortização principal e extras. Amortização única e recorrente é aplicada após a prestação regular do mês, até zerar o saldo. Em modo **redução do prazo**, mantém prestação PRICE ou quota de amortização SAC originais; em modo **redução das parcelas**, recalcula a prestação PRICE ou quota SAC para o saldo e prazo remanescentes. Compara cronogramas com e sem antecipação. Não considera indexadores (TR, IPCA), CET, seguro, mudanças contratuais ou tarifas.

## Custo CLT
Provisão anual = 12 salários + 13º + adicional de 1/3 de férias. **Não** adiciona um 13º salário referente a férias, pois a remuneração ordinária dos 30 dias já integra os 12 salários. Encargos patronais parametrizáveis (FGTS, INSS patronal, RAT/FAP efetivo, terceiros) calculados sobre remuneração anual de referência. Benefícios e outros custos não salariais adicionados por 12 meses, sem incidência automática. As alíquotas iniciais são exemplos e **não** substituem enquadramento tributário e FPAS da empresa. Simples Nacional em geral já inclui CPP no DAS, exceto Anexo IV. Cálculo exclui férias indenizadas, rescisão, SAT variável, adicionais de convenções, quotas e contribuições específicas, seguro, remuneração variável, faltas e desonerações.

Fontes de referência oficiais:
- FGTS 8%: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/areas-de-atuacao/fgts-fundo-de-garantia-do-tempo-de-servico
- Contribuição patronal e bases: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/contribuicoes-previdenciarias-pj
- Simples Nacional Anexo IV: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/contribuicao-previdenciaria-anexo-iv-do-simples-nacional
- Incidência no 13º e terço de férias: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/emissao-e-pagamento-de-darf-das-gps-e-dae/calculo-de-contribuicoes-previdenciarias-e-emissao-de-gps/tabela-de-incidencia-de-contribuicao

## Navegação e manutenção
- `#/aposentadoria`
- `#/aluguel-vs-financiamento`
- `#/amortizacao`
- `#/custo-clt`
- Presets editáveis e avisos estão em `extended-finance-calculator.ts`.
- Testes de regressão e responsividade: `frontend/tests/extended-finance.spec.ts`.
