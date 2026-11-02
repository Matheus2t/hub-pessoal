## Fechamento V3 — PR #12 (2026-11-02)

O escopo principal da Ações V3 foi entregue em PRs #7–#12. A branch do PR #12 incorpora 26 eventos unitários IPE de 22 emissores, separados dos 196 registros FRE por classe (47 emissores). Calendário e simulador mantêm datas exatas distintas de prazos e inícios, usam valores brutos anunciados sem presumir liquidação e não contam IDs duplicados. Simulador possui totalizações por ano; os gráficos separam a base por data-com ou classe. O TTM continua limitado a três janelas de lucro de PETR4, e DY automático, tributação/reinvestimento e histórico integral continuam fora do escopo validado, por ausência de dados suficientes/licenciados.

Fundamentos: 56 emissores distintos, 280 demonstrativos anuais, 282 trimestres explícitos, 65 ativos no catálogo; cinco vínculos revisados e TIMS3 com escopo individual. Em cache, somente snapshots identificados por hash recebem immutable; manifestos revalidam. O Codex registrou testes finais: 225 Python, 227 Playwright aprovados, um teste live opcional ignorado, typecheck/build e git diff --check aprovados. Capturas nas cinco larguras e nos temas claro/escuro. A confirmação do merge e a verificação dos headers/domínio oficial são passos posteriores ao registro destes resultados.

Estas entregas não implicam cobertura total, DY automático ou prova de proventos liquidados. Melhorias adicionais ficam reservadas à V4. O histórico abaixo descreve etapas anteriores à conclusão; seus estados intermediários não prevalecem sobre este resumo.

---

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

Homologação TTM concluída: regressão integral local 213 aprovados, um live opcional
ignorado (3,5 min), 180 Python e build/typecheck aprovados. Nenhuma falha funcional.
Regressão integral PR #9 no domínio oficial executou todos os casos; um caso não
carregou porque seu arquivo foi editado durante a execução. Repetição a partir do
arquivo fixo de 2c2316a: dois aprovados. Demais casos da suíte de produção aprovados.
Não foi ocultado o erro de carregamento como teste aprovado na execução original.
PR #10: integração TTM. Próximo: merge após checks e testes TTM reais em produção.


TTM publicado: PR #10, main 609033f4d530d00c50deec592eba441d2a1a9dbb,
deployment matheus2t-bx5a2a34m-matheus2ts-projects.vercel.app. Cinco testes
TTM no domínio oficial aprovados. Branch atual codex/2t-stocks-v3-issuer-expansion.

Novo lote: 56 CNPJs distintos, 280 anuais (2021–2025), 282 trimestres explícitos.
Três TTM PETR4 e quatro conciliações preservados. 65 identidades no catálogo;
cinco vínculos excepcionais documentados em scripts/data/issuer-link-reviews.json,
CAD ativo + último FCA geral obrigatório, revisão expira ao mudar o documento.
TIMS3 usa escopo individual em todos os exercícios, com controle explícito da
DFP 2025: consolidado zero, receita individual 26.624.721 MIL/lucro 4.311.984 MIL.
Banco BTG usa conta bancária 3.09 e não margens industriais. Total histórico FRE
ampliado para 196 registros/47 emissores (87 dividendos, 109 JCP); 28 anteriores
integralmente preservados. Classes com letra não conciliada (ex.: RAPT4/PNA)
não entram por inferência de sufixo. Setores do catálogo são editoriais.

219 Python, build/typecheck e 20 Playwright dirigidos aprovados; regressão completa
em execução (.vercel/expanded-full-regression.log). Publicação aguarda resultado.

Após esse marco, ampliar avisos unitários: 20 PDFs públicos baixados em
.vercel/unit-pdfs, metadados em .vercel/unit-expansion-candidates.json. Nenhum
novo fato desses PDFs foi publicado ainda; exigem revisão de valor bruto, classe,
datas e eventuais retificações. Downloads paralelos sofreram truncamento;
requisições públicas normais sequenciais retornaram PDFs completos HTTP 200.
Não republicar PDFs nem converter programação em confirmação de liquidação.

Homologação do lote de emissores: 219 Python e 220 Playwright aprovados, um live
opcional ignorado, typecheck/build e diff --check aprovados. A primeira suíte
foi interrompida ao encontrar expectativa antiga de 52 ativos na navegação.
Teste atualizado para conferir o catálogo atual e regressão integral repetida
limpa (4 min). PR #11 aguarda merge/checks e validação de produção.

Próximo lote já curado em arquivo privado .vercel/ipe-expanded-reviewed.json:
25 registros unitários de 21 emissores. Dezesseis novos PDFs conferidos
visualmente; quatro exclusões motivadas. Não copiar PDFs para diretórios públicos.
Integrar com prazos-limite separados de datas exatas, preservar inícios de
pagamento e excluir datas imprecisas da simulação de janela exata. Adicionar
resumo visual dos avisos e ordenação pela natureza de data selecionada.


PR #11 publicado: main e09a8570f32c20be821610d617510f98f61eb3aa.
Sete testes no domínio oficial aprovados, incluindo todas as novas páginas.
Branch atual codex/2t-stocks-v3-proceeds-final.

Lote unitário integrado: 26 registros/22 emissores, preservando os sete originais.
Cada novo PDF publicado como fatos foi conferido visualmente; hashes/metadados
em scripts/data/ipe-reviewed-distributions.json. Nenhum PDF republicado.
CPFL inclui total unitário da AGO de abril, não uma divisão da parcela de outubro.
B3 usa somente valores ajustados da coluna Para; Grendene separa JCP/dividendo,
sem somar novamente o total. Gerdau usa linha Gerdau ON B3, não GOAU nem ADR.
Fleury conserva a antecipação da data; Vibra conserva valor unitário ajustado.
TIM/Embraer com valor provisório e Allied com condições/identidade de estabelecimento
não conciliadas ficaram excluídos dos novos avisos; suas demonstrações financeiras
continuam disponíveis. Avisos anteriores examinados de TIM/Embraer ainda contêm
cláusula de possível alteração; não foram tratados como liquidação/finalização.

Prazos-limite separados de datas, início de pagamento explicitamente qualificado.
Calendário e simulador de janela exata não convertem prazo/início em dia exato.
Simulador aceita todos os tickers do conjunto, deduplica IDs e oferece totais anuais
brutos; conserva limite de uma base de elegibilidade por simulação. Gráfico usa
bases separadas por data-com (unitário) ou anos de totais de classe (FRE), sempre
parcial; não mistura unidades. Filtros ordenam pela natureza da data selecionada.

225 Python aprovados; typecheck/build aprovados. Dirigidos iniciais aprovados,
refinamento de legibilidade do gráfico e totais anuais em nova validação visual.
Erro de localizador de teste resolvido usando o papel acessível do seletor; não
foi necessário alterar funcionamento do controle. Depois executar suíte integral
limpa, commit/PR, merge e produção.

Cache: regras Vercel limitadas aos snapshots com hash (um ano/immutable);
manifestos continuam revalidados. Backend/API e bundles sem nome versionado
não recebem cache imutável. Conferir os cabeçalhos reais após o deploy.
