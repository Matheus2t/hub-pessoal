# 2T Learn — V18: revisão editorial integrada de V11 a V17

**Data:** 12/11/2026  
**Tipo:** auditoria **interna** de Inglês/Russo, feita por ChatGPT com conferência de textos, questões, gabaritos, evidências, variantes, rubricas e vínculos à trilha.  
**Conclusão:** material editorial preparado para **aceite do dono e integração em ambiente de teste**. **Não** representa revisão linguística independente, calibração CEFR, validação de fala/áudio, piloto de aprendizagem ou autorização automática de publicação.

> **Decisão de equipe:** o projeto é conduzido pelo dono, ChatGPT e Codex. Para disponibilizar material como prática não certificadora, não é obrigatório contratar especialistas; o dono decide o aceite editorial após testes. Não alegar homologação externa, proficiência CEFR oficial nem avaliação auditiva sem gravações.

## 1. Inventário auditado

| Versão | PR | Revisão de conteúdo | Quantidade | Situação |
| --- | --- | --- | --- | --- |
| **V11** | [#116](https://github.com/Matheus2t/hub-pessoal/pull/116) | Atividades-ponte A1→A2 e A2→B1 | 24 tarefas (4 delas auditivas) | Corrigida na branch, ainda **draft** |
| **V12** | [#117](https://github.com/Matheus2t/hub-pessoal/pull/117) | Referência de progressão / IDs e etapas | 15 estágios por idioma | Integrada, prévia local sem liberação pública |
| **V13** | [#118](https://github.com/Matheus2t/hub-pessoal/pull/118) | Scripts de Listening e gabaritos | 32 roteiros, 80 questões | Corrigida na branch, sem áudio, **draft** |
| **V14** | [#119](https://github.com/Matheus2t/hub-pessoal/pull/119) | Ditados, transcrições e variantes | 32 ditados | Corrigida na branch, sem áudio, **draft** |
| **V15** | [#120](https://github.com/Matheus2t/hub-pessoal/pull/120) | Infraestrutura técnica de áudio | Manifesto com zero gravações homologadas | Integrada; não equivale à produção dos áudios |
| **V16** | [#121](https://github.com/Matheus2t/hub-pessoal/pull/121) | Leitura e interpretação B1 | 10 textos, 40 perguntas, 10 tarefas escritas | Corrigida na branch, **draft** |
| **V17** | [#122](https://github.com/Matheus2t/hub-pessoal/pull/122) | Critérios de progresso/avaliação | 30 cenários, 6 checkpoints, 16 casos sintéticos | Critérios revisados, **draft** |

Os **474 exercícios legados (237 EN + 237 RU)** foram preservados, assim como a separação entre progresso de estudo e evidência de domínio. A V18 também não modificou o frontend/backend, schema de IndexedDB, backups v1/v2/v3 nem as flags de publicação.

## 2. Correções materiais aplicadas nas próprias branches

### V11 — quatro IDs corrigidos
- **`en-bridge-v10-02`**: a fonte dizia `work at nine`, que não implica necessariamente **começar** às nove, apesar do enunciado. Agora a fonte declara `start work` e o gabarito exige horários de início coerentes.
- **`en-bridge-v10-11`**: `It's raining tomorrow` foi substituído por `It might rain tomorrow`, deixando a chuva como hipótese apropriada à condicional.
- **`ru-bridge-v10-03`**: a pergunta se dizia de inferência mas exigia só localizar `дома`. Agora o aluno precisa avaliar e justificar a afirmação equivocada de que Anna lê **apenas** na biblioteca. Não concluir que ela nunca vai à biblioteca.
- **`ru-bridge-v10-06`**: substituído pedido de nome próprio real por **nome fictício**, evitando coleta desnecessária de dados pessoais.

### V13 — correção de coerência de uma gravação futura
- **`ru-listen-v13-16`**: o aviso mencionava a feira somente às sextas, mas depois tratava a segunda-feira como fechamento especial. O roteiro passou a especificar funcionamento **de terça a sexta**, com extensão de horário nas sextas; a pergunta de segunda permanece coerente.
- Conferidos os **32 scripts/80 itens** e as chaves das alternativas. No B1, respostas abertas continuam sujeitas a revisão humana ou `uncertain`.
- **Nenhum áudio foi ouvido, produzido, validado ou autorizado por esta revisão.** Os scripts são instruções para produção futura.

### V14 — rubricas russas refinadas
- **`ru-dict-v14-01`**: eliminado texto híbrido `предметos`, explicitando concordância dos possessivos e adjetivos.
- **`ru-dict-v14-04`**: descrição de concordância em `ближайшая аптека` uniformizada em Português.
- **`ru-dict-v14-06`**: uso de numerais explicitado na rubrica.
- **`ru-dict-v14-07`**: corrigidos `curto curto` e o objetivo gramatical: `короткое письмо` exemplifica concordância no neutro, não é boa evidência de mudança visível para acusativo.
- **`ru-dict-v14-11` e `ru-dict-v14-12`**: uso de `мне/сестре`, `неё/нее` e instrumental com `с` descrito com precisão.
- Todas as **32 transcrições** mantiveram suas formas canônicas, variantes explícitas e regra `uncertain` para formas não verificadas. Sem áudio, ditado ainda não é atividade auditiva avaliável.

### V16 — narrativa sem gênero inferido
- **`en-reading-b1-v16-04`**: a pessoa narradora não declara gênero no texto em Inglês. Perguntas e respostas passaram a usar **pessoa que narra**, sem inferir gênero. O foco também passou de "prática de leitura" para **participação nas discussões**, como o texto realmente descreve.
- Os dez textos/40 perguntas possuem trechos de evidência efetivamente presentes na passagem. Gabaritos objetivos são válidos como candidatos editoriais; respostas abertas e escrita não devem ser avaliadas por igualdade de string.

### V17 — aprovação interna sem ficção de especialistas
- Ajustado o contrato de aprovação de material para **aceite editorial pelo dono**, caso o lançamento seja uma plataforma **não certificadora de prática**.
- Diferenciadas explicitamente revisão interna e validação CEFR externa, não realizada.
- Preservadas as sete dimensões, os 30 cenários, seis checkpoints, 16 casos e a regra de que resposta `uncertain`, TTS de navegador e falta de evidência não podem gerar domínio.
- Não autorizar indicador global de "fluente", "A1/A2/B1 certificado" ou domínio derivado de percentual. Resultados devem descrever apenas a tarefa/competência efetivamente observada.

## 3. Verificações executadas

A inspeção cruzou os JSON das **cinco branches**, os catálogos legados da `main` e o manifesto V12.

| Verificação estrutural/editorial | Resultado |
| --- | --- |
| JSON válido, quantidades por idioma e item | **Conforme** |
| IDs de proposta únicos e sem colisão com catálogo legado | **Conforme** |
| Vínculo às etapas e níveis A1/A2/B1 da V12 | **Conforme** |
| Trechos citados nas 40 questões V16 presentes nos respectivos textos | **Conforme** |
| Alternativas objetivas V13/V16 com gabaritos existentes e opções distintas | **Conforme** |
| Distribuição das respostas corretas de Listening V13 por idioma | **8 A / 8 B / 8 C** |
| Distribuição das respostas corretas de leitura V16 por idioma | **4 A / 3 B / 3 C** |
| Separação de idiomas e 474 exercícios legados | **Conforme** |
| Flags editoriais: não publicado / sem certificação CEFR | **Preservadas** |
| Casos sintéticos V17 | **16 revisados**; representam política proposta, não resultados de alunos |

**Limite da auditoria:** as verificações cruzadas foram feitas sobre dados do GitHub, com processamento em JavaScript durante a revisão. **Não foi executada a suíte completa de validadores Node, Playwright, Pytest ou CI nesta V18**, nem observada a interface funcionando. O resultado de zero inconsistências estruturais no escopo inspecionado **não significa ausência garantida de erros linguísticos ou bugs**.

O [manifesto de revisão V18](./learn-revisao-integrada-v18.json) registra os PRs, commits e inventário conferidos, para comparação posterior.

## 4. Áudios — quantidade real para o escopo total

A conta anterior de **64 áudios** considerava apenas V13 e V14.

| Origem | Necessidade potencial |
| --- | ---: |
| 32 roteiros Listening V13 | 32 |
| 32 ditados V14 | 32 |
| 4 atividades-ponte de Listening V11 | 4 |
| **Total, se todas tiverem gravação própria** | **68** |

Isso é um **inventário**, não uma promessa de que 68 arquivos serão obrigatórios: se alguma atividade reutilizar com segurança uma gravação de mesma transcrição/contexto, o número de arquivos físicos pode ser menor. Na versão observada da V15 existiam **zero gravações homologadas**. Nenhum roteiro sem voz revisada deve contar como evidência real de Listening ou ditado.

### Fluxo operacional com a equipe real

**ChatGPT:** revisão de instruções, frases, variantes, perguntas, limites de correção e rastreabilidade. Não fingir escuta de um áudio não produzido.  
**Codex:** gerar/armazenar gravações com direitos de uso adequados, integrar os arquivos e reproduzi-los nos navegadores; executar testes e preparar deploy.  
**Dono:** ouvir amostras — idealmente **todas as gravações antes da ativação** —, avaliar naturalidade e inteligibilidade, apontar ajustes e **autorizar explicitamente** a liberação como material de estudo não certificado.

Nas respostas livres, manter `uncertain` quando não for possível julgamento confiável; não implementar um classificador frágil só para produzir notas.

## 5. O que impede a liberação imediata?

**Não é a ausência de uma equipe externa de especialistas.** Para lançar a plataforma como material próprio de estudo, o dono pode aceitar a revisão editorial interna. Mas ainda faltam **trabalho técnico e testes reais**:

1. Aceite do dono das correções e critérios revisados. Não converter esse aceite em certificado de qualidade independente.
2. Produção e conferência das gravações aplicáveis, com licença, voz natural, correspondência ao texto e modo de escuta apropriado.
3. Integração separada dos PRs editoriais aprovados, mantendo os 474 IDs e compatibilidade de backup.
4. Implementação segura de rubricas/avaliação: abertas como `uncertain` ou realmente revisadas, sem inventar nota; ajuda e transcrição antecipada reduzem independência da evidência.
5. Testes de reprodução, celular, cirílico, acessibilidade, persistência, CI e regressão completa.
6. Publicação somente com `publicRelease` explicitamente aprovada e deployment correto confirmado.

**Situação desta V18:** revisão interna concluída e registrada; **não publicada**. Não fazer merge automático de #116/#118/#119/#121/#122 por causa deste relatório.
