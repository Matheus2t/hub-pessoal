# Acoes V3 — plano de execucao

Base: main 8d458a346be7fa274a5b6765d87316e16d3aa7ee.
Checkpoint remoto: checkpoint/2t-before-stocks-v3. Branch: codex/2t-stocks-v3.

## Auditoria inicial

O catalogo possui 52 ativos. Fundamentos publicados: ITUB4, PETR4, VALE3,
WEGE3 e TOTS3. DFP 2023–2025 e ITR 2025–2026; demonstracoes pertencem ao
CNPJ/CVM, nao a cada classe. Comparador permite quatro emissores e periodo
anual comum. Rankings usam apenas ROE/margem com cobertura declarada.

## Entregas

A: fontes, conciliacao FCA/CAD e modelo de dados. Conciliacao implementada;
modelo de proventos e revisao individual dos emissores ainda pendentes.
B: expandir primeiro a 15, depois 25 emissores, validando contas por setor;
expandir historico, derivar trimestres/TTM apenas com bases reconciliadas.
C: eventos documentados por classe, revisoes e deduplicacao; sem imposto
liquido presumido. Nenhum evento incorporado nesta entrega inicial.
D: comparador historico, rankings e calendario; DY/reinvestimento dependem
explicitamente de fonte autorizada de precos e eventos societarios.
E: ampliar pipeline existente e preservar snapshots validos em falhas.
F: testes financeiros/UI, performance, revisao visual e publicacao progressiva.

## Restricoes

Sem scraping B3/widgets, sem novos servicos pagos. Dados ausentes sao null.
Identidade conciliada nao comprova cobertura contabil. Nao habilitar interfaces
que impliquem cobertura inexistente. Manter tributacao estimada indisponivel
ate verificacao legal e definicao de cenario. Nao alterar os outros modulos.

## Reproducao da conciliacao

`python -m scripts.cvm_registry` usa cache oficial do pipeline existente,
seleciona o FCA mais recente por CNPJ e exige vinculo no MESMO documento,
classe ainda negociada e CAD ativo. Hashes identificam exatamente as fontes.
Conflitos falham; sem vinculo unico, registra pendencia sem inferir por nome.
Saida auditavel: stocks-v3-issuers.json. Nao alimenta producao automaticamente.
