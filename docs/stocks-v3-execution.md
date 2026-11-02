# Ações V3 — execução

Base: main b924b1c. Branch codex/2t-stocks-v3-operation. Checkpoint original preservado.

| Frente | Estado atual |
|---|---|
| Proventos | 28 registros reais FRE 2022, cinco emissores; 17 dividendos, 11 JCP. Total por classe, não por ação. Interface e importador implementados; homologação em andamento. |
| Calendário | Lista/mês, filtros, datas desconhecidas e fontes conectados aos 28 registros. |
| Simulador histórico | Bloqueado para esta fonte: FRE não informa valor unitário, data-com/ex ou confirmação independente de liquidação. Não se divide montante por número de ações presumido. |
| TTM | Ainda sem janela aprovada; investigação deve continuar sem publicar aproximação. |
| DY | Simulação manual implementada separadamente, com preço/período/data informados pelo usuário; não é DY de mercado. |
| Vínculos/TIMS3 | TIMS3 tem DFP 2025 consolidada zerada, mas individual com receita 26624721 MIL e lucro 4311984 MIL. Revisar escopo explicitamente. |
| 50 emissores | Ainda 25; expansão em lote deve aguardar o primeiro marco de proventos. |
| Visual/performance | Novo módulo JS separado e carregado sob demanda; capturas geradas nos dois temas e cinco larguras. |

Fontes verificadas: CVM FRE com ODbL declarada (https://dados.cvm.gov.br/dataset/cia_aberta-doc-fre).
FRE 2026 não traz os arquivos de distribuição antigos. FRE 2022 contém montante
por espécie/classe e pagamento, não valor unitário. WEG RI possui tabela unitária,
mas https://ri.weg.net/termos-de-uso/ reserva os direitos e não fornece licença aberta;
não copiada. Um registro PETR4 de tipo Outros foi excluído com a linha original
preservada na cobertura. Nunca afirmar que os 28 registros completam os anos.

Comandos: python scripts/cvm_distributions.py; npm run build;
python -m pytest backend/tests -q --basetemp=.vercel/pytest-operation;
npx playwright test --output=.vercel/operation-regression.

Testes direcionados iniciais: nove Python e sete Playwright aprovados. Nova
validação integral obrigatória antes de merge. Nenhuma nova funcionalidade ainda
publicada nesta branch. Próximo comando: build, suíte integral e revisão visual.

Marco seguinte em desenvolvimento: sete parcelas unitárias de cinco emissores,
provenientes de cinco avisos IPE conferidos visualmente. Curação factual com
identidade, versão, datas e SHA dos PDFs, sem republicar seu texto/arte.
Simulador calcula somente programação declarada e uma base de elegibilidade
por emissor. Não comprova liquidação. Tests dirigidos: 11 Python de dados e 13
Playwright aprovados. Fonte/decisão de uso e exclusão do dividendo Vale ainda
provisório documentadas em stocks-v3-sources.md. Próximo comando: regressão
integral da branch codex/2t-stocks-v3-unit-events antes de publicar o marco.

Marco anterior publicado: PR #8, main 89910277ff236e5e22e08798970d2861917e9d42,
deployment matheus2t-1nlhkrg16-matheus2ts-projects.vercel.app. Sete testes dirigidos
executados no domínio oficial e aprovados. A suíte integral local após hospedar
Geist localmente teve 202 aprovados e um opcional ignorado; Python 162 aprovados.
