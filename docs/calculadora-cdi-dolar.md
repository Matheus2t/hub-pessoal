# CDI x Dólar — hipóteses da calculadora 2T

Ferramenta `#/cdi-vs-dolar` (sem API, sem cotação automática). Compara duas alternativas de referência:

- **CDI:** investimento em BRL remunerado por um percentual da taxa CDI anual **constante e informada manualmente**. Capitalização estimada pelo fator diário equivalente ao CDI anual, com 252 dias úteis teóricos por ano e conversão `252 * dias_corridos/365,25`. Não usa fixações históricas reais, feriados nem curva futura.
- **Dólar:** comprar dólares no início com o mesmo montante em reais e manter a quantidade em USD, sem juros. A cotação final é **hipotética** e definida pelo usuário. A trajetória no gráfico é interpolada geometricamente entre cotação inicial e final.
- **Tributação:** se selecionado CDB/RDB com IR, alíquota aplicada **somente sobre lucro** no resgate simulado (22,5% até 180 dias; 20% de 181–360; 17,5% de 361–720; 15% acima de 720). Alternativa isenta supõe rendimento sem IR; o usuário precisa ajustar o percentual do CDI ao produto. Prazo limitado de 30 a 3.650 dias para excluir IOF.
- **Dólar de equilíbrio:** `cambio_inicial * (saldo_CDI_liquido / capital_inicial)`. É o preço hipotético de USD no vencimento em que as duas alternativas têm o mesmo valor em BRL.
- **Retorno em USD:** `(saldo_CDI_liquido/cambio_final)/(capital_inicial/cambio_inicial)-1`.

**Limitações importantes:** não há hedge garantido, proteção bancária cambial, spread de câmbio, IOF-câmbio, ganhos cambiais tributáveis, taxas de custódia, dividendos, investimento em moeda estrangeira, novas aplicações/aportes ou risco de crédito. A taxa DI real varia diariamente.

Referências:
- B3 — metodologia da Taxa DI: https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/di/metodologia-de-calcudo-acumulado-de-di/
- Receita Federal — tributação 2026: https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
- CAIXA — CDB pós-fixado e incidência de IR/IOF: https://www.caixa.gov.br/voce/poupanca-e-investimentos/cdb/cdb-flex/paginas/default.aspx

## Interface simplificada (2026-11)

O prazo padrão pode ser escolhido diretamente: **6 meses, 1, 2, 3, 5 ou 10 anos** (anos tratados como 365 dias corridos neste modelo) ou **personalizado em dias**. A escolha usa o mesmo campo `days` do motor, sem mudar a fórmula financeira. Os quatro campos principais ficam visíveis; percentual do CDI e tributação foram movidos para **Opções avançadas**. Resultados destacam o câmbio de equilíbrio, diferença entre CDI e dólar, enquanto a memória de cálculo e a tabela mensal ficam acessíveis por expansão. O detalhamento mensal continua permitindo salto por ano.
