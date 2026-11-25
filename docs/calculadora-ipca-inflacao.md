# IPCA e Inflação — calculadora 2T

A rota `#/ipca` utiliza a **série oficial do número-índice IPCA** do IBGE/SIDRA (tabela 1737, variável 2266). O backend consulta a fonte, valida cada mês desde junho/1994, rejeita lacunas ou valores inválidos, usa cache em memória por 6 horas e oferece a série através de `/api/ipca/series`. Se a consulta oficial falhar e não houver cache, a tela mostra indisponibilidade sem inventar resultado.

## Convenção do período

A data inicial e a data final são **meses fechados incluídos**. A metodologia adotada segue a calculadora do IPCA publicada pelo IBGE:

`fator = numero_indice[mes_final] / numero_indice[mes_anterior_ao_inicial]`

`inflacao_acumulada = (fator - 1) * 100`

`valor_corrigido = valor_inicial * fator`

`poder_de_compra_sem_reajuste = valor_inicial / fator` (expresso em reais de poder de compra do mês inicial).

Exemplo solicitado pelo usuário: `07/1995` até `01/2026`, inclusive, contém 367 meses.

A calculadora distingue duas **leituras da mesma série**, não dois indicadores diferentes:
1. **Correção pelo IPCA:** quantos reais no mês final compram uma cesta equivalente à do mês inicial;
2. **Inflação:** alta dos preços e perda de poder de compra caso a quantia nominal não seja reajustada.

Valores históricos anteriores a julho/1994 envolveriam mudanças de moeda; por isso a calculadora só permite datas a partir de julho/1994. O primeiro valor guardado (junho/1994) serve de índice de referência para o cálculo do mês inicial julho/1994.

Dados de meses sem publicação oficial não podem ser simulados. Sem arredondamento mensal intermediário: o fator usa diretamente os números-índice oficiais; apenas resultados apresentados são arredondados.

Fonte: https://sidra.ibge.gov.br/tabela/1737
Explicação e metodologia IBGE: https://www.ibge.gov.br/explica/inflacao.php

Limitações: correção de poder de compra média da cesta do IPCA, não significa remuneração financeira, preço específico de produto nem cláusula contratual específica; não considera juros ou impostos.

## CDI x Dólar

No mesmo PR a ferramenta CDI x Dólar mantém sua fórmula de rendimento e tributação, mas coloca o gráfico em painel expansível sob o resultado, reduzindo a densidade visual inicial. A tabela e os encargos detalhados também continuam opcionais.
