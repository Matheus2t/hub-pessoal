# 2T Learn — auditoria técnica e de regras da V17 (13/11/2026)

**Escopo:** somente a avaliação formativa V17, progressão A1–B1, armazenamento/backup e autorização local de revisão, no estado da `main` após o PR #118. A V14 segue sob desenvolvimento independente do Codex; nenhum arquivo da V14 foi alterado nesta auditoria.

**Natureza:** revisão de código, contratos e testes automatizados. Não é revisão de respostas reais por professor, avaliação independente, escuta humana, piloto nem certificação de proficiência CEFR.

## 1. Cobertura e conclusões

| Risco examinado | Resultado da inspeção | Limites |
| --- | --- | --- |
| Estudo legado confundido com domínio | `stageStudyProgress` contabiliza apenas IDs distintos submetidos no idioma correspondente; `studySnapshotV17` mantém desempenho `not_assessed` | O estudo não certifica A1/A2/B1 nem bloqueia acesso às 15 etapas |
| Respostas abertas aceitas automaticamente | `makeV17Attempt` começa em `uncertain` e `awaiting_review`; a classificação posterior requer revisão humana registrada | O revisor é autenticado apenas localmente; qualidade linguística depende de humanos |
| Ajuda confundida com produção independente | Consulta aos critérios antes do envio é registrada, e `recommendV17` pede outra prática independente | A classificação humana ainda descreve a tarefa observada |
| Revisores discordantes | **Corrigido:** empate 2 × 2 não forma consenso; resultado continua incerto, pendente de terceiro voto decisivo (quinto revisor, nesse caso) | Não é consenso institucional nem garantia contra adulteração local |
| Avaliação inválida ou tardia | **Reforçado:** nota global fora de 0–3, quatro critérios inválidos, e cronologia regressiva são rejeitadas antes de persistir | Correção semântica é humana, não automática |
| Backup v1/v2/v3 | Validação local preservada; **corrigido:** registros v3 legados com empate indevidamente marcado `reviewed` são aceitos para restauração **mas rebaixados a incertos nas recomendações e na interface** | Os backups não são assinados nem provas invioláveis |
| Troca rápida de etapa | **Corrigido:** rascunho pendente é enviado à fila de gravação antes da mudança de etapa/nível; seleção de nível mantém contexto original durante o flush | Falhas do navegador ou perda de energia antes da gravação ainda são possíveis |
| Inglês/Russo | Dados V17 armazenados em `v17:en` e `v17:ru`; IDs e validação dos registros exigem o idioma correto | A conta de revisor continua restrita ao navegador |
| Publicação, áudio, CEFR | `isLearnAssessmentV17PreviewEnabled` exige loopback e parâmetro local; V17 não atribui nível. Listening sem gravação aprovada não vira competência demonstrada | Não libera V13/V14/V17 para alunos, nem substitui auditoria do deploy oficial |

## 2. Defeito comprovado: falso consenso

**Antes:** a função escolhia o *primeiro* valor de nota com duas avaliações iguais. Em quatro revisões independentes `3, 1, 3, 1`, o código podia tratar a primeira dupla de notas `3` como consenso e recomendar próxima atividade, apesar do empate exato de `2 × 2`.

**Depois:** a contagem considera somente a avaliação mais recente de cada revisor, exige um único grupo com a maior contagem **e ao menos dois revisores**. Empates entre dois grupos com dois votos cada são disputas, não apoio à tarefa. Revisores já envolvidos não podem arbitrar uma disputa com uma nova avaliação da própria conta. Uma quinta pessoa pode desempatar.

**Compatibilidade:** os registros antigos permanecem restauráveis. Ao carregá-los, as funções de recomendação, os resumos e o painel de revisão detectam o empate pelas avaliações reais e não exibem a classificação `reviewed` como resultado válido.

## 3. Recomendações e progressão

As recomendações permanecem determinísticas, específicas à última tentativa, vinculadas ao conteúdo SHA-256 e à proposta editorial aceita. Respostas pendentes ou empatadas não são computadas como erros, nem promovem a próxima atividade. Resultados com assistência levam a nova prática independente; estudo legado é identificado como cobertura, não domínio.

As 15 etapas por idioma continuam navegáveis — **a V17 não implementa bloqueios de nível**; "avançar" é somente sugestão de uma próxima atividade, jamais aprovação CEFR.

## 4. Escopo da regressão

A regressão acrescenta casos para:

- quatro avaliações humanas com empate de 2 × 2, um quinto revisor e correções de revisor;
- recusa de nota e rubricas estruturalmente inválidas;
- restauração v3 de uma disputa atual e leitura conservadora de empate legado;
- recomendações e resumos após empate; mudança rápida de nível com rascunho pendente.

O workflow `.github/workflows/learn-v17-assessment-regression.yml` roda `npm ci`, validador V17, TypeScript, build e `learn-progress-v17.spec.ts` no Chromium para futuras alterações pertinentes. **Resultados concretos devem ser lidos nos checks do PR e do merge**, não inferidos deste documento.

## 5. Riscos que permanecem fora da aprovação técnica

1. Revisão humana de qualidade do conteúdo, rubrica pedagógica e teste com alunos reais.
2. Autenticação institucional/autoria verificável e política de privacidade/retenção, se a avaliação for usada fora do navegador local.
3. Verificação de deployment por SHA e revisão do bloqueio de produção antes de qualquer ativação.
4. Escuta e aprovação humanas dos arquivos V19, incluindo os da V13/V14; nenhuma evidência auditiva sem arquivo aceito.
5. Revisão da V14 **depois** de o Codex finalizar sua implementação, para não duplicar esforços.

**Decisão:** pode-se integrar a correção técnica na `main` após CI aprovado **sem publicar a V17 como experiência acessível a estudantes**. Não há autorização para certificação, nota automática de respostas abertas ou liberação de áudio.
