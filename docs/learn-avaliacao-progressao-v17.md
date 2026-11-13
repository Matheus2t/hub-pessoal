# 2T Learn V17 — Critérios de avaliação e progressão A1–B1

**Estado:** política e atividades **editoriais propostas**, aguardando revisão independente e aplicação-piloto. `publicRelease:false`, `cefrCertified:false`. Nenhuma alteração na interface, na trilha V12, nos **474 exercícios** (237 EN + 237 RU), no histórico, no IndexedDB nem nos backups v1/v2/v3.

## Conciliação editorial com a V17 já integrada (13/11/2026)

A implementação de prévia formativa V17 foi integrada à `main` pelo [PR #138](https://github.com/Matheus2t/hub-pessoal/pull/138), e os oito cenários com estímulos incompletos foram corrigidos pelo [PR #139](https://github.com/Matheus2t/hub-pessoal/pull/139). Os documentos desta entrega editorial são **fonte de critérios e rastreabilidade**, não uma nova implementação de telas, nem uma autorização de avaliação pública.

Nesta reconciliação foram verificados: os **30 enunciados e critérios essenciais** contra os textos da prévia, os **180 IDs de estudo legados**, os **6 checkpoints**, as **7 competências** e o SHA do manifesto V12. A verificação agora também faz parte do script de contrato e de um workflow próprio de CI. Ela deve detectar alterações futuras na interface que não tenham sido refletidas na política editorial, ou vice-versa.

**Estado de aceite:** os materiais podem permanecer disponíveis como rascunho de autoestudo na prévia local, sem pontuação; `publicRelease:false`, `public:false`, `cefrCertified:false`. A revisão editorial interna foi concluída, mas **docentes externos, avaliação auditiva e piloto com estudantes não foram realizados**. As tarefas não passam a provas nem a decisões automáticas de A1/A2/B1 por este merge.

## 1. Por que mudar o critério?

No código da V12, `stageStudyProgress()` contabiliza **IDs distintos de tentativas submetidas**, independentemente de `correct`, `incorrect` ou `uncertain`. São 6 atividades mapeadas por etapa (3 de gramática e 3 de leitura). Isso mede **cobertura de estudo**, não domínio linguístico. O teste legado `learn-assessment` também não é uma certificação de proficiência. O sistema mantém duas formas de prática de áudio, mas **não há gravações auditivas homologadas** na infraestrutura V15, de modo que Listening avaliado permanece indisponível.

A V17 separa três indicadores:

| Indicador | Significado | Fonte | O que não significa |
|---|---|---|---|
| **Estudo registrado** | Atividades distintas respondidas por idioma | Tentativas legadas V12 | Acerto, domínio ou prontidão certificada |
| **Desempenho observado** | Resultado de **uma tarefa** independente, aprovada, devidamente revisada | Checkpoint proposto/piloto homologado | Proficiência integral A1/A2/B1 |
| **Recomendação de estudo** | Próximo exercício sugerido ou revisão formativa | Evidência disponível e lacunas explícitas | Bloqueio, reprovação de nível ou diagnóstico definitivo |

**Regra principal:** manter todas as etapas e conteúdos anteriores acessíveis, independentemente dos resultados. Os rótulos A1–B1 se referem a metas curriculares; **não há certificação CEFR**.

## 2. Referencial e limites de evidência

O [Conselho da Europa define os níveis do CEFR por diferentes atividades comunicativas e descritores observáveis](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors). A progressão A1–B1 não se limita a reconhecer regras ou acertar alternativas: envolve recepção, produção, interação e usos em contextos. **Esta V17 é uma interpretação de projeto a ser validada**, não uma rubrica oficial homologada pelo Conselho.

Separar competências e registrar **não avaliado** quando faltarem evidências:

- **Compreensão escrita:** interpretar texto **novo**, com finalidade, informação e, conforme o nível, relações entre ideias, ressalvas e inferência fundamentada.
- **Produção escrita:** produzir resposta original no idioma-alvo para uma situação comunicativa; revisão por docente quando aberta.
- **Compreensão auditiva:** ouvir gravação **efetivamente aprovada**, reproduzida sem exposição prévia da transcrição. Browser TTS, roteiro sem áudio ou voz não homologada = **não avaliado**.
- **Produção oral:** requer amostra de fala real e revisão apropriada; **não avaliada na experiência atual**.
- **Interação:** requer resposta contingente a interlocutor, não apenas frases isoladas; **não avaliada na experiência atual**.
- **Reconhecimento contextual:** observar formas gramaticais e vocabulário em contexto, sem extrapolar para produção autônoma.
- **Retenção/transferência:** tarefa com novos referentes/contexto e nova oportunidade posterior sem resposta-modelo. Repetição de enunciado idêntico não é transferência.

A presença de `assessmentOutcome:'uncertain'` e `audioEvidence` nas tentativas V15 exige que relatórios não transformem resultado incerto ou áudio não homologado em **correto** ou **incorreto**. Um exercício repetido no mesmo idioma só tem um ID único para cobertura da etapa.

## 3. Matriz de 30 etapas

O arquivo [`learn-avaliacao-etapas-v17.json`](./learn-avaliacao-etapas-v17.json) mapeia, para **cada uma das 15 etapas EN e 15 RU**, os 6 IDs legados usados pela V12, a competência-alvo, o checkpoint atual apenas proposto, um **novo cenário de observação** e **dois critérios essenciais** de evidência.

A intenção é propor uma tarefa diferente dos exercícios vistos anteriormente, **sem reusar, renomear, substituir ou reclassificar** os seus IDs e resultados. O pareamento entre lição e leitura na V12 é por nível/ordem e **não garante alinhamento temático** — isso também deve ser revisado antes de usar como prova.

Os 30 novos cenários são **rascunhos instrucionais**, não exercícios liberados. Produção em Inglês deve ser em Inglês, produção em Russo em cirílico; compreensão escrita pode receber pergunta em Português, com leitura no idioma-alvo. Evitar exigir no Russo A2 casos apresentados apenas em B1, salvo apoio explícito que não seja confundido com avaliação independente.

## 4. Checkpoints A1, A2 e B1 — dois idiomas

O arquivo [`learn-avaliacao-politica-v17.json`](./learn-avaliacao-politica-v17.json) define **6 checkpoints**, um por nível/idioma, posicionados após as etapas 4, 10 e 15. **Não são exames automáticos nem portões de acesso.**

| Saída curricular | Inglês — exemplo de evidência | Russo — exemplo de evidência |
|---|---|---|
| **A1** | Ler bilhete simples e produzir apresentação/rotina curta sem copiar exemplo | Ler cirílico e mensagem curta; identificar referentes, apresentar pessoas e objetos |
| **A2** | Compreender mudança de horário/local e escrever recado curto com motivo | Interpretar aviso prático e redigir perguntas/mensagem com tempo, lugar e quantidades |
| **B1** | Compreender ideia principal, evidência e ressalva; justificar escolha por escrito em situação nova | Sintetizar causa/decisão/ressalva em texto, e justificar decisão em escrita com estruturas do curso |

Cada checkpoint traz compreensão escrita, produção escrita e transferência. **Listening homologado, produção oral e interação continuam dimensões separadas não avaliadas** até existirem instrumentos válidos. Não exibir mensagem global de aprovação A1/A2/B1, porcentagem de "fluência" ou medidor geral de domínio.

**Observação sobre parâmetros:** não estabelecer regra "80% = B1" ou "6 acertos = nível concluído". A futura definição de quantas tarefas e de qual consistência permitem **uma recomendação** exige revisão docente, piloto e calibração por idioma/competência. Só é legítimo afirmar o desempenho observado na tarefa, com proveniência.

## 5. Rubrica provisória de resposta independente

| Categoria | Interpretação formativa |
|---|---|
| **3 — Sustentada** | Responde ao objetivo, preserva sentido e evidências necessárias, sem auxílio prévio indevido |
| **2 — Parcial** | Cumpre parte essencial, mas falta conexão, detalhe decisivo ou clareza comunicativa |
| **1 — Necessita prática** | Reproduz fatos isolados/estrutura sem atender ao propósito no contexto novo |
| **0 — Necessita prática** | Contradiz informação essencial ou não atende ao enunciado, com justificativa do revisor |
| **`uncertain` — Revisão pendente** | Resposta possivelmente válida, mas não reconhecida com segurança; **não é zero** |
| **Não avaliado** | Áudio não aprovado, modelo mostrado antes, falta de evidência elegível ou instrumento indisponível |

Os números são **rótulos editoriais de uma escala ordinal a calibrar**, não notas CEFR ou percentuais de aprovação. Podem apoiar feedback e retentativa, não certificação.

A revisão independente deve usar docente competente no idioma-alvo. Para qualquer síntese de nível, a proposta exige **dois pareceres independentes ou divergência adjudicada**, com registro da versão analisada. Resposta de escrita sem parecer confiável fica `uncertain` ou "aguardando revisão". Quando a versão do item muda, a validação editorial anterior é **desatualizada**.

## 6. Regras de recomendação — sem bloqueio

1. **Só existem tentativas legadas:** "Estudo registrado; experimente uma tarefa inédita." Não marcar domínio.
2. **Resposta aberta desconhecida:** "Aguardando revisão." Nem aprovação nem erro automático.
3. **Tarefa independente revisada e sustentada:** recomendar próximo contexto; não converter a A1/A2/B1 global.
4. **Dificuldade demonstrada:** recomendar revisão, mantendo acesso irrestrito.
5. **Enunciado repetido:** contar como prática, não como evidência independente de transferência.
6. **Listening sem gravação homologada:** marcar **não avaliado** e oferecer estudo de leitura/escrita sem penalização.
7. **Ausência de proveniência ou aprovação de versão:** preservar histórico de estudo, sem afirmar desempenho verificado.

**É permitido avançar no conteúdo independentemente da recomendação.** Ela representa orientação, não desbloqueio automático nem julgamento de capacidade cognitiva.

## 7. Casos de auditoria e contrato técnico futuro

[`learn-avaliacao-casos-v17.json`](./learn-avaliacao-casos-v17.json) contém **16 casos inteiramente sintéticos** (8 EN e 8 RU) para verificar possíveis extrapolações: repetição de ID, erro/uncertain, mistura de idiomas, áudio TTS, transcrição mostrada, tarefa editorial não aprovada, ajuda anterior, discordância entre revisores, versão vencida, transferência artificial, falta de fala ou Listening e revisão recomendada.

O validador `scripts/learn/validate-assessment-progression-v17.mjs` verifica apenas **integridade de contrato**, vínculo às 30 etapas e compatibilidade com os 474 itens em main. Não é prova linguística, não aplica nem pontua estudantes e não modifica o estado do produto.

**Esquema de proveniência mínimo para uma avaliação futura:** `language`, `taskId`, `contentVersion`, `competencyId`, `sourceType`, `submittedAt`, `assistanceBeforeSubmission`, `assessmentMethod`, `reviewStatus`, `outcome`, `independentContext`. Proveniência incompleta impede evidência de competência, **sem apagar tentativa**.

## 8. Dependências para liberar a avaliação futura

- [ ] Revisar e homologar os 30 cenários e os 6 checkpoints por docentes EN/RU, com critérios por item.
- [ ] Homologar textos B1 V16 (PR #121), atividades-ponte V11 (#116), Listening V13 (#118) e ditados V14 (#119). Não unir rascunhos automaticamente.
- [ ] Produzir/homologar as gravações necessárias e revisar reprodução efetiva com transcrição oculta.
- [ ] Projetar correção de respostas abertas com revisão humana ou `uncertain` seguro.
- [ ] Realizar piloto com estudantes, checar dificuldade real, viés, acessibilidade, ajuda e erros.
- [ ] Codex implementar componentes/contratos **aditivos** somente depois da revisão, manter backups v1/v2/v3 e os 474 IDs.
- [ ] Executar regressões e confirmar deploy sem liberar experiência não autorizada.

**Esta V17 é uma revisão editorial e de critérios.** Não autoriza publicar progressão, novas tarefas ou declarar equivalência certificadora do curso com CEFR.

## Revisão interna V18 e fluxo de liberação sem equipe externa

**Escopo revisado em 12/11/2026:** 30 cenários / 6 checkpoints / 16 casos sintéticos. A revisão feita neste projeto por ChatGPT é **editorial interna**; não houve parecer linguístico independente, validação com turma, certificação CEFR nem revisão de gravação inexistente.

**Equipe real:** ChatGPT prepara e revisa editorialmente, Codex implementa e testa, e o dono do site decide o aceite e a publicação. Não existe obrigação de contratar especialistas externos para oferecer **prática pessoal não certificadora**; revisão externa só seria necessária se o projeto quisesse alegar validação independente ou classificação formal de proficiência.

Aprovação editorial do dono basta para implementar **prática formativa não certificadora**. Respostas abertas exigem revisão humana efetiva ou `uncertain`; os checkpoints não podem declarar A1/A2/B1 certificados, e Listening/fala permanecem não avaliados quando faltam recursos.

**Controle de publicação:** não alterar `publicRelease:false` nem expor materiais de draft só porque a revisão textual foi concluída. O aceite explícito do dono, testes de integração, revisão dos áudios aplicáveis e verificações de produção continuam pendentes. Status: **revisão interna concluída; liberação ainda não autorizada**.
