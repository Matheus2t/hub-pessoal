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
