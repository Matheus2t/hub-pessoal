# Acoes V3 — resultados parciais

## Entrega inicial A (parcial)

Implementados auditoria inicial, plano, fontes e reconciliador reproduzivel de
identidades. Registro de 52 ativos: 47 emissores conciliados; BPAC3, CMIN3,
CSNA3, CEAB3 e KLBN3 sem vinculo ativo unico no ultimo FCA do cache consultado.
Isso nao significa que deixaram de negociar; requer investigacao documental.
Fontes exatas identificadas por SHA-256; cache nao equivale a refresh atual.
ISIN/subsetor nao confirmados permanecem null. Modelo de eventos pendente.

## Cobertura publicada (inalterada)

Cinco emissores com fundamentos: ITUB4, PETR4, VALE3, WEGE3, TOTS3.
Tres exercicios anuais (2023–2025); ITR 2025–2026 conforme snapshot existente.
Nenhum ano, demonstrativo ou indicador novo incorporado nesta entrega.
Zero empresas com proventos verificados; zero eventos processados.
ROE/ROA, margens, crescimentos e demais indicadores anteriores preservados.
Precos proprios, DY, P/L, P/VP, proventos, TTM e reinvestimento real continuam
indisponiveis. Nao presumidos pagamentos, aliquotas ou precos.

## Validacao

25 testes Python aprovados: 18 testes existentes de CVM e sete casos de
conciliacao (classes, cadastro inativo, documento antigo, encerramento,
ambiguidade, conflitos e duplicatas). Typecheck e build aprovados.
Nenhum arquivo frontend/backend de runtime alterado. Nao executado Playwright
nesta entrega de pipeline offline; nenhum novo fluxo de interface publicado.
Bundle principal permanece 160114 bytes; Learn 94927 bytes (mesmo build).
Nao medido desempenho de navegacao nem declarada otimizacao.

## Publicacao e pendencias

Branch codex/2t-stocks-v3. Checkpoint remoto checkpoint/2t-before-stocks-v3,
base 8d458a346be7fa274a5b6765d87316e16d3aa7ee.
Entrega salva em branch para revisao, sem merge/main nem deploy de producao.
Vercel continua com a versao anterior; nao validado novamente nesta entrega.

A V3 NAO esta concluida. Faltam modelo de eventos, expansao validada a 15/25
emissores, mais anos, trimestre/TTM conciliado, importacao de proventos com
documentos, precos licenciados, calendarios, simulador historico, comparacao
historica, rankings ampliados, pipeline expandido e validacao de interface.
Nao foi demonstrado bloqueio externo definitivo: essas tarefas permanecem
trabalho de implementacao/auditoria, nao dependencias automaticamente exigidas
do usuario. Nenhum servico pago, credencial ou banco novo foi criado.


## Fase 1 — expansao funcional (2026-11-02)

Snapshot 11a5a375004fb041: 15 emissores, 45 demonstracoes anuais de
2023–2025, mais periodos ITR 2025–2026. Dez novos emissores: ABEV3, B3SA3,
RENT3, LREN3, SUZB3, EGIE3, CPFE3, VIVT3, VBBR3 e PRIO3. Disponiveis nas
paginas individuais, comparador de quatro empresas e rankings existentes.
Nao foram adicionadas formulas: ampliada a cobertura das metodologias ja
validadas. Manifest e arquivos por emissor mantem fontes, versoes, escalas,
contas originais e evidencias. Acesso aos dados continua sob demanda.

TIMS3 foi excluido desta expansao: lucro/PL zerados no documento consolidado
selecionado exigem investigacao; nao contabilizado como cobertura util. Cinco
vinculos FCA anteriormente pendentes continuam pendentes. Nao foram criadas
classes alternativas por inferencia. Contas industriais nao foram aplicadas a
novos bancos; apenas Itau mantem tratamento bancario previamente validado.

123 testes Python completos aprovados. Typecheck/build aprovados. Cinco testes
novos Playwright cobrem os dez emissores novos, comparador e rankings em
1920/1366/768/390/320, ambos temas, sem overflow. Capturas reais inspecionadas
em desktop/celular. Tres testes existentes de analise CVM tambem aprovados.
Regressao Playwright completa: 188 aprovados, um teste live opcional ignorado.
Os cinco testes novos foram executados separadamente e aprovados.
Bundle principal permanece 160114 bytes; Learn 94927. Nenhuma biblioteca nova.
Os snapshots rejeitados de desenvolvimento nao sao publicados.

Esta e a primeira entrega funcional da V3, nao sua conclusao integral.
Cinco/dez exercicios, novos bancos, trimestre derivado/TTM, novos indicadores,
comparador historico avancado e proventos permanecem por implementar.
Zero proventos incorporados; DY e tributacao liquida nao foram inferidos.
Proxima fase: ampliar janela DFP de tres para cinco exercicios, validar contas
por emissor/ano e introduzir comparacao historica com periodos comuns. So
entao avancar no importador documental de proventos e sua proveniencia.


## Continuacao — cinco anos e 25 emissores (2026-11-02)

Branch codex/2t-stocks-v3-history a partir da main 71204fe; checkpoint original
preservado. Commit funcional inicial 162fe82. PR #5.
Snapshot dce27807f46d3059: 25 emissores; 125 registros anuais utilizaveis
2021–2025, 126 trimestres explicitamente informados e 76 acumulados ITR.
Novos emissores: CPLE3, EQTL3, CMIG3, GGBR3, MGLU3, ASAI3, FLRY3, HYPE3,
DXCO3 e CYRE3. Identidades verificadas novamente por FCA/CAD no pipeline.
DFP 2021/2022 obtidos diretamente dos ZIP oficiais CVM, com hashes nas fontes.
As demonstracoes anteriores permanecem disponiveis nos snapshots preservados.

Interface: filtros de 3/5 anos/historico disponivel; series adicionais de ROA,
caixa e fluxo operacional; comparador historico de ate quatro emissores com
tabela, linhas monocromaticas distintas e indice base 100 opcional. Somente
periodos anuais com inicio/fim e escopo compativeis entram na comparacao.
Lacunas quebram as linhas; normalizacao exige primeira base positiva comum;
indice contabil nao e retorno da acao. Nao calculado CAGR sobre bases negativas.
Rankings agora oferecem seis indicadores: ROE, ROA, margem liquida, margem
operacional e crescimento anual de receita/lucro. Mantida separacao por setor,
exercicio/escopo, denominador positivo e amostra parcial declarada.

133 testes Python aprovados antes da revisao visual. Build/typecheck/diff-check
aprovados. Capturas do comparador em 1920/1366/768/390/320 e ambos temas;
inspecao corrigiu selecao inicial, checkbox e contraste de datas do grafico.
Regressao completa: 191 aprovados, duas falhas por seletor ambiguo de tabela
no teste de paleta, um live opcional ignorado. Apos escopar o seletor, seis
testes de analise/paleta aprovados. Cinco testes de historico/normalizacao e
novos emissores aprovados separadamente apos revisao visual.
Dados separados por emissor, total do snapshot 1435995 bytes, sem descarga de
fundamentos na homepage. Bundle inicial era 160114 bytes; novo tamanho registrado
na entrega: 163628 bytes (+2,2%). Nenhuma dependencia adicionada; nao alegada melhoria de performance.

Pendencias reais: nao ha trimestres derivados entre documentos nem TTM novo.
A compatibilidade de criterios/reapresentacoes entre DFP e ITR ainda precisa de
politica implementada e testes; nao foi presumida apenas por igualdade do codigo
CVM. Os 126 trimestres sao periodos explicitos, nao somas de acumulados.
Cinco vinculos FCA continuam sem conciliacao; TIMS3 ainda nao validado.
Nenhum provento incorporado nesta continuacao: importador documental, captura
de eventos oficiais com direitos verificados e historico ainda NAO implementados.
Calendario, DY, simulador historico e tributacao liquida continuam pendentes.
Isso e trabalho restante, nao prova de indisponibilidade geral de fontes gratuitas.
Proxima tarefa exata: implementar derivacao auditavel com reconciliacao das bases
comparativas do mesmo ITR, evidencia dos operandos e testes de revisao/escala/
escopo; habilitar TTM somente para janelas completas comprovadas. Depois iniciar
importador documental de dividendos/JCP e incorporar eventos reais verificaveis.
Esta entrega nao conclui integralmente a V3.

## Finalizacao — WIP preservado

Branch codex/2t-stocks-v3-final, base main f6c62215fa09fd59e351e8308002f17150365771.
Criados scripts/cvm_periods.py e backend/tests/test_cvm_periods.py. Onze testes
aprovados para diferencas Q2/Q3/Q4, negativos, base/escopo/escala incompatíveis,
estoques rejeitados, TTM de quatro trimestres cruzando exercicio e lacunas.
O nucleo exige identificador explicito de revisao da base contabil; esse campo
NAO comprova compatibilidade por si so. O publisher ainda precisa obter e
validar essa evidencia documental antes de construir operandos reais.

NAO integrado ao pipeline/manifest/UI. Nenhum trimestre derivado/TTM novo
publicado. Nenhum evento de provento incorporado. Sem merge ou deploy desta
etapa. Build e Playwright nao executados neste WIP sem alteracoes de runtime.
Proxima tarefa exata: implementar a conciliacao das bases comparativas e das
reapresentacoes dos documentos CVM, registrar evidencias/operandos serializaveis,
integrar apenas derivacoes comprovadas ao snapshot e a interface, executar os
testes financeiros e a regressao integral verde antes de publicar. Importador
documental de proventos, eventos reais, calendario e simulador seguem pendentes.
A V3 continua parcial; este WIP nao representa entrega funcional de TTM.

## Integracao real PETR4 — sem publicacao

Integrado scripts/cvm_reconciliation.py ao publicador. Snapshot
eda390d81a67434b inclui derived_periods separado dos periodos historicos.
Tres trimestres PETR4 corroborados por trimestre explicito independente:
2025-04-01 a 2025-06-30 (lucro R$ 26.774.000.000),
2025-07-01 a 2025-09-30 (R$ 32.847.000.000),
2026-04-01 a 2026-06-30 (R$ 52.495.000.000).
Nao representam novos periodos cronologicos: sao derivacoes auditaveis de
periodos que tambem possuem valor explicitamente informado.

Politica conservadora: usa apenas documentos previamente selecionados na maior
versao pelo pipeline; exige igualdade de conta, descricao, escopo, escala,
exercicio, limites dos periodos e ordem ULTIMO. O trimestre de controle deve
pertencer ao MESMO documento/versao do acumulado atual. A diferenca dos
acumulados deve coincidir exatamente, em Decimal, com o trimestre de controle.
Numero de versao igual entre documentos diferentes nao prova compatibilidade.
Nao se extrapola continuidade contabil para contas sem esse controle.
O token basis_review e hash da evidencia serializavel APOS essas verificacoes,
nao uma aprovacao textual arbitraria. Evidencia preserva metadados dos dois
documentos e do controle, linhas/escala/valores originais, operandos normalizados
e operacao do nucleo derive_quarter. Manifest registra derived_coverage.

37 testes relevantes aprovados (periodos, conciliacao com dados reais e CVM).
Correcao de teste: leitura UTF-8 explicita necessaria no Windows; periodos
originais PETR4 permanecem integralmente identicos. Fontes sao os JSON oficiais
derivados do snapshot anterior com links/documentos/hashes CVM rastreaveis.
Nenhum TTM gerado: nao existem quatro trimestres consecutivos comprovados por
esta politica, em particular Q4 nao tem controle trimestral independente no
DFP anual. Nao foi invocado trailing_twelve_months com janela incompleta.
Sem alteracao de frontend, sem merge/deploy. Proxima etapa: reconciliar Q4 e
criterios entre DFP anual/ITR Q3 com evidencia contabil adicional, depois compor
janelas completas e integrar TTM a interface. Nao inventar TTM para esta meta.

## Homologacao da interface dos trimestres conciliados — PR #7

Revisados reconciliador, tipos e interface ja existentes na branch
codex/2t-stocks-v3-audited-quarter-ui-20261102. Typecheck/build aprovados,
152 testes Python aprovados e regressao Playwright integral verde:
195 aprovados, um live opcional ignorado. Capturas em cinco larguras e ambos
temas; secao PETR4 mostra tres periodos e nove links oficiais, com aviso
explicito de que nao representam TTM. Os periodos originais dos 25 emissores
foram comparados integralmente com o snapshot anterior e permanecem identicos.
TTM continua parcial, sem janela aprovada. Consultados os comparativos DRE
consolidados PETR4 ITR 2026: lucro YTD anterior 2025-06-30 = 62105000 MIL,
YTD atual 2026-06-30 = 85256000 MIL; igualdade numerica dos comparativos nao
foi tratada como prova suficiente da compatibilidade do Q4/criterios contabeis.
Nao incorporado TTM indicativo do PR #6. Proventos/calendario/simulador/DY e
vinculos restantes nao implementados nesta homologacao; nao alegado bloqueio
externo geral de fontes. Confirmacao de merge/deployment/testes de producao
registrada no PR e no relatorio da entrega. Checkpoint original preservado.


## Integração real TTM — 2026-11-02 (homologação)

Release Petrobras “Desempenho 4T25”, protocolo 009512IPE311220250157338344-95,
página 7, tabela 2: lucro consolidado total de 15.653 milhões no 4T25,
32.847 milhões no 3T25, 110.605 milhões em 2025. Não confundir com o lucro
atribuível aos acionistas da controladora (15.563 milhões no 4T25).
SHA e metadados em scripts/data/petr4-quarter-control.json. Revisão visual do
PDF oficial realizada; PDF/texto integral não republicados.

DFP anual menos ITR nove meses coincide exatamente com o controle Q4.
Q1+Q2+Q3 coincide com nove meses; ITRs 2026 conciliam os comparativos de 2025.
TTM lucro PETR4: jan/dez25 110.605.000.000; abr25/mar26 108.035.000.000;
jul25/jun26 133.756.000.000 reais. Cada janela tem quatro trimestres consecutivos.
Demais contas TTM permanecem nulas. Evidências/operandos/hash em ttm_periods;
periods original preservado. A interface permite consultar período, quatro
operandos, fontes, versões e JSON completo. Manifest distingue cobertura TTM.

17 testes adicionais com dados reais e incompatibilidades; suíte Python 180
aprovados. Typecheck/build e cinco Playwright dirigidos aprovados. Regressão
integral em andamento, publicação ainda não declarada neste registro.

Homologação final TTM: 180 Python, 213 Playwright (um live opcional ignorado),
build/typecheck e diff --check aprovados. PR #10 preparado.


## Expansão CVM em homologação — 2026-11-02

56 emissores distintos, 280 anuais e 282 trimestres informados. Originais dos
25 emissores comparados sem mudanças. Catálogo: 65 ativos/identidades, sem
duplicação artificial de classe para atingir a meta. Cinco vínculos (BPAC3,
CMIN3, CSNA3, CEAB3, KLBN3) resolvidos com documentos primários individualizados;
identificação não autoriza reprodução de cotações ou de tabelas B3.
CEAB3 preserva a inconsistência de fim de negociação em 2019 no FCA; prospecto,
RI atual e carteira B3 documentam a revisão, condicionada ao mesmo FCA/CAD.
Klabin: ON KLBN3 não confundida com Unit KLBN11. TIMS3 escopo individual explícito,
sem mistura com consolidado. Controle DFP 2025 v1 fixa receita/lucro; revisão
requer atualização se esse documento mudar.

FRE 2022: 196 registros/47 emissores, totais por classe; sete avisos unitários
existentes permanecem separados. Classe obtida do FCA, não do sufixo do ticker;
preferenciais com letra e classes ambíguas excluídas. Importador conserva os 28
registros originais e não considera datas ausentes iguais a pagamentos zero.
219 Python e 20 Playwright dirigidos aprovados; suíte integral em andamento.

Homologação final do lote: 219 Python, 220 Playwright (um live opcional ignorado),
typecheck/build e diff --check aprovados. Navegação adaptada ao catálogo de 65.
