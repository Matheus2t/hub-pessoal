# Análise Financeira 2T — CVM

## Arquitetura e atualização

`python scripts/cvm_financials.py --refresh` baixa DFP dos três exercícios completos anteriores e ITR do ano anterior/atual, além de cadastro ativo e FCA do ano atual. Python padrão, sem dependências novas, banco, preços ou credenciais. ZIPs ficam em `.vercel/cvm-cache-v2` ignorado pelo Git; não são enviados ao visitante. Sem refresh o cache local permite reproduzir os mesmos arquivos. A janela atual é 2023–2025 DFP e 2025–2026 ITR. Falta de arquivo de um novo exercício é erro explícito, preservando o snapshot publicado.

O pipeline verifica ZIP, CRC, limite de download/descompressão, moeda, escala e números finitos. Só acessa URLs fixas oficiais. Identidade é verificada por ticker no FCA valor_mobiliario, CNPJ e código CVM no FCA geral e cadastro ATIVO. Mapeamentos iniciais: ITUB4/19348/60.872.504/0001-23; PETR4/9512/33.000.167/0001-01; VALE3/4170/33.592.510/0001-54; WEGE3/5410/84.429.695/0001-11; TOTS3/19992/53.113.791/0001-22. Não se inferem emissores pelo nome. Novas classes devem apontar ao mesmo CNPJ e ser deduplicadas na comparação.

Saída em `frontend/public/financials`: manifest com cobertura por empresa/período e JSON por companhia em diretório de snapshot identificado por SHA-256. Build copia para dist, servido estaticamente pelo projeto existente. Não há ingestão, banco ou gravação persistente em funções Vercel. O manifest só troca atomicamente após todos os emissores passarem; erros são registrados no cache e não alteram a publicação válida. Atualização que removesse períodos ou valores antes disponíveis falha para revisão manual. Snapshots anteriores são preservados. Hashes iguais não reescrevem o manifest. Retificações com valores diferentes geram novo snapshot; comparação com o anterior permite auditoria.

Workflow semanal prepara artefato para revisão, somente em repositório público, sem permissão de escrita. Não publica automaticamente números sem conferência. Para publicar: baixar/gerar os dados, executar testes e build, revisar o diff e commit/push no fluxo existente. Nenhum recurso pago é criado. Anos solicitados, novos códigos ou quedas de cobertura exigem revisão. A rotina falha preservando o último conjunto quando arquivos oficiais estiverem indisponíveis.

## Regras contábeis

Maior VERSAO do documento por emissor/data, sem mistura de versões entre demonstrações; consolidado é padrão se disponível, individual explicitamente identificado quando não há consolidado. Conta duplicada idêntica é deduplicada; valores conflitantes interrompem publicação. Não há fallback silencioso a versão inferior. Metadados guardam ID, data de recebimento, referência, URL do documento e do ZIP. Evidência por métrica guarda conta, demonstração, escala original, valor original, início/fim e ordem do exercício. Escala MIL multiplica por 1000; UNIDADE mantém, usando Decimal. Outras moedas/escalas são rejeitadas.

Resultados usam contas fixas DRE 3.01/02/03/05/06/11. Lucro é consolidado total, incluindo não controladores. No Itaú, 3.09 é lucro, 2.08 é PL e 1.01 é caixa. Receita/margens industriais e empréstimos industriais ficam indisponíveis para o banco. Não se publica EBITDA.

BPA 1 é ativo; BPP 2.03 é PL para não bancos. A conta 2 intitulada Passivo Total na CVM inclui PL: a 2T apresenta passivos exigíveis como ativo menos PL, evitando confundi-los. Empréstimos são 2.01.04 + 2.02.01 apenas com descrição adequada. Essa medida não representa dívida financeira completa. Dívida líquida fica indisponível por falta de reconciliação de arrendamentos, outros passivos financeiros e caixa restrito. Não há P/L, P/VP de mercado nem dividend yield próprios.

ITR: períodos explicitamente informados na DRE com início/fim exatos de trimestre civil são trimestres isolados. Acumulados maiores são separados como YTD. Não se somam acumulados. Balanços são posições na data e nunca somados. DFC indireto 6.01/02/03 só entra quando o início/fim exato corresponde à seleção: trimestral ausente não é inferido do YTD. DFC direto não foi incorporado nesta versão. Não há Q4 derivado: a compatibilidade de critérios entre documentos não foi provada. Campos ausentes são null, não zero.

Margens = lucro/receita ou operacional/receita × 100; exigem receita positiva. ROE/ROA anuais = lucro consolidado / média do saldo inicial/final, usando comparativo PENÚLTIMO no mesmo documento; média deve ser positiva. Não se anualiza trimestre nem se publica ROE trimestral estimado. Crescimento anual = (atual/comparativo - 1) × 100, com base positiva; lucro negativo atual pode gerar queda maior que 100%, base negativa/anterior zero gera null. Empréstimos/PL não é passivo total/PL. Crescimento e saldos comparativos são do mesmo documento para reduzir mistura de versões. Ainda pode haver mudanças de perímetro, aquisições e critérios; não representam necessariamente crescimento orgânico.

Comparação usa dois/três emissores únicos e exercício anual comum. Mostra escopo, datas e versões. Receita/margens bancárias são indisponíveis, sem equivalência artificial com indústrias; setores distintos recebem aviso. Valores absolutos não são recomendações de investimento.

## Conferência e testes

Amostra independente transcrita dos CSV oficiais DFP consolidados 2025, ÚLTIMO, escala MIL:

| Ticker | Lucro original | PL original |
|---|---:|---:|
| ITUB4 | 45.849.000 | 215.076.000 |
| PETR4 | 110.605.000 | 417.587.000 |
| VALE3 | 11.811.000 | 188.926.000 |
| WEGE3 | 6.775.958 | 18.553.364 |
| TOTS3 | 920.742 | 5.443.457 |

Todos multiplicados por mil na base JSON, confrontados por testes de regressão. Receita PETR4 de 497.549.000 MIL e resultado operacional de 145.628.000 MIL foram conferidos no mesmo DRE. As contas bancárias foram verificadas separadamente. Testes cobrem negativos, escala, nulos, base zero/negativa, versões/escopos, duplicatas conflitantes, trimestre explícito vs YTD, PL médio e identidade FCA inconsistente. Conferência é contra CSV oficial estruturado, não uma auditoria independente dos demonstrativos em PDF.

Relatório de cobertura: `financials/manifest.json`, com todos os períodos, campos presentes/ausentes, mapeamentos e data de processamento. Cobertura inicial somente cinco empresas; as demais 47 exibem indisponibilidade. Interfaces e gráficos devem ser inspecionados com os JSON reais, nos dois temas e em celular, além dos testes automatizados.

## Fontes, dicionários e licença

- https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp
- https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr
- https://dados.cvm.gov.br/dataset/cia_aberta-doc-fca
- Dicionários oficiais: `DOC/DFP/META/meta_dfp_cia_aberta_txt.zip`, `DOC/ITR/META/meta_itr_cia_aberta_txt.zip`, `DOC/FCA/META/fca_cia_aberta.zip` no portal.

Base derivada publicada sob ODbL 1.0, com atribuição CVM e acesso aos JSONs e metodologia. Licença em `frontend/public/financials/LICENSE.txt`. A licença da base não relicencia automaticamente o código da aplicação. Não são extraídos dados dos widgets TradingView; brapi permanece bloqueada.
