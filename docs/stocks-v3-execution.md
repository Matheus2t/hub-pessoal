# Ações V3 — execução

Base preservada: main 2c2316ae28dc (PRs #8 e #9). Checkpoint original remoto
checkpoint/2t-before-stocks-v3 = 8d458a346be7fa274a5b6765d87316e16d3aa7ee.

| Frente | Estado verificável |
|---|---|
| Proventos | PR #8: 28 totais por classe FRE, cinco emissores. PR #9: sete parcelas unitárias IPE, cinco emissores. Bases separadas, nenhuma confirmação de liquidação presumida. |
| Calendário | Publicado: lista/mês, filtros e datas com/ex/pagamento disponíveis nos documentos. Série parcial. |
| Simulador | Publicado: programação bruta de avisos com uma base de elegibilidade por emissor. Não é histórico de liquidação ou retorno total. |
| TTM | Branch codex/2t-stocks-v3-ttm-verified: Q4 PETR4 de R$ 15.653.000.000 e três janelas completas de lucro; controles DFP/ITR/IPE e comparativos preservados. Em homologação. |
| DY | Manual publicado; automático/histórico sem preços licenciados, não implementado. |
| Vínculos/TIMS3 | Investigação continua. TIM consolidado zerado, individual possui dados: exige política explícita de escopo. |
| 50 emissores | Ainda 25 publicados; candidatos identificados em FCA/CAD para próximo marco. |
| Visual/performance | Módulo de proventos lazy; Geist local remove dependência externa de DNS. TTM revisado em 320/1366 px, capturas nos dois temas e cinco larguras. |

PR #8 merge 89910277ff236e5e22e08798970d2861917e9d42: 202 Playwright,
162 Python; sete testes de produção aprovados.
PR #9 merge 2c2316ae28dc6c54881a46ed365c7402180e9276: 208 Playwright,
163 Python aprovados antes do merge; um live opcional ignorado. Nova regressão
integral contra o domínio oficial em execução, log .vercel/pr9-production-verified.log.

TTM: 180 Python aprovados e cinco Playwright dirigidos aprovados. Typecheck/build
aprovados. Suíte Playwright integral em execução (.vercel/ttm-full-regression.log).
Os testes inicialmente impedidos por sandbox (browser/IPC) e servidor local
encerrado foram repetidos após restaurar o servidor e executar fora do sandbox.
Não foram tratados como falhas de dados. Pytest requer PYTHONPATH=backend;.
e --basetemp dentro de .vercel. Não executar duas publicações simultâneas.

Próximo: concluir a regressão TTM, publicar PR, validar domínio oficial e continuar
expansão de emissores/TIMS3/vínculos e ampliação de avisos. Não refazer PRs #8/#9.
