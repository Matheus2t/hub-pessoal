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
