# 2T Learn — Contrato consolidado de evidências e avaliação

**Objetivo:** remover ambiguidades entre currículo, diagnóstico, rubricas e revisão antes do início da engenharia.  
**Fonte técnica de verdade:** `frontend/public/learn/pedagogy-v1/evidence-contract.json` e `evaluation-policy.json`.  
**Status:** especificação de projeto; não há algoritmo de domínio nem avaliador semântico em produção.

## 1. A mesma palavra “acerto” não representa todas as habilidades

| Origem | Evidência permitida | Não concluir |
|---|---|---|
| Pergunta fechada do diálogo | Compreensão escrita daquela situação | Escrita autônoma, listening, conversação |
| Identificação lexical | Reconhecimento | Comunicação independente |
| Observação guiada da gramática | `practiceOnly` | Domínio de competência |
| Escrita com dicas | `guidedProduction` | Produção sem auxílio |
| Escrita em outro cenário, modelo oculto | `transfer` **com ajudas declaradas** | Memória de palavras já fornecidas, fluência oral |
| Revisão depois de dias efetivamente decorridos | `delayedRecall` + contexto e ajuda | Memória duradoura indefinida ou nível CEFR |
| Audio de diagnóstico sem gravação validada | `notAssessed` | Compreensão auditiva |
| Resposta aberta sem avaliador validado | `uncertain` ou pendente de revisão | Correta ou incorreta com certeza |

### Importante no Russo

As tarefas `ru-dir-t1`, `ru-diag-p2`, `ru-diag-t1` e revisões com hospital/museu apresentam antecipadamente a palavra do destino em cirílico. Isso pode permitir avaliar a **construção de pergunta**, mas não pode servir como prova de recuperação de vocabulário sem apoio.

O teclado fonético também é um recurso de digitação: sua disponibilidade não é, sozinha, evidência de boa pronúncia.

## 2. Estados do julgamento

- `supported`: os critérios foram observados **com avaliação adequada** (no contexto e nível de ajuda declarados).
- `partiallySupported`: houve comunicação útil, mas faltou parte essencial ou houve limitação importante.
- `notSupported`: a resposta não atende à tarefa, após avaliação apropriada.
- `uncertain`: a evidência existe, mas não permite decisão confiável; pedir reformulação/revisão.
- `notAssessed`: tarefa não realizada, indisponível ou sem instrumento válido; **não é nota zero**.

No caso de escrita aberta, um verificador de igualdade de strings pode reconhecer uma variante **cadastrada**, mas não estabelecer que qualquer outra resposta esteja errada. O motor novo deve separar resultado de correspondência com gabarito de julgamento de significado.

## 3. Contrato mínimo por observação nova

Cada evento deve ser imutável e identificável por `eventId`, `language`, `unitId`, `contentVersion`, `taskId`, `taskKind`, `evidenceKind`, `response`, `shownAssistance`, `startedAt`, `submittedAt`, `outcome`, `reviewStatus`, `assessorKind`, `feedback`, `sourceContext` e `isIndependentClaimAllowed`.

**Por que esses campos?** Para poder verificar mais tarde *o que foi pedido, o que a pessoa respondeu, qual ajuda estava visível, o que de fato foi avaliado e com base em qual versão do exercício*. Sem isso, a personalização vira suposição.

### Exemplo conceitual, não um evento gravado

```json
{
  "eventId": "uuid-idempotente",
  "language": "ru",
  "unitId": "ru-pilot-directions-01",
  "contentVersion": 1,
  "taskId": "ru-dir-t1",
  "taskKind": "transfer",
  "evidenceKind": "transfer",
  "shownAssistance": [{"kind":"lexical-cue","value":"библиотека","shownBeforeAttempt":true}],
  "outcome": "uncertain",
  "reviewStatus": "pending",
  "assessorKind": "rubricWithReview",
  "isIndependentClaimAllowed": false
}
```

O exemplo omite deliberadamente texto e timestamps para não parecer um registro completo. **Nota de escopo:** `isIndependentClaimAllowed:false` neste caso se refere à autonomia **lexical**; uma implementação poderá registrar a construção interrogativa separadamente como independente de modelo completo, desde que os subdomínios sejam explícitos.

## 4. Como lidar com contradições, lacunas e tempo

- Um acerto fechado e uma escrita incorreta não devem virar média opaca; orientar uma prática direcionada.
- Caso haja resposta aberta em revisão, **não** promover domínio até haver evidência validada.
- O estudante pode pular diagnóstico ou trilha sem perder liberdade de estudo.
- Uma revisão D+2 que não ocorreu deve ficar `notAssessed`, sem penalidade.
- Revisões D+2 e D+7 são **intervalos sugeridos** e não estão calibradas; realizar D+2 altera as condições de D+7.
- Progressão e recomendações devem poder explicar: “sugerimos esta aula porque você compreendeu a direção, mas ainda não realizou uma pergunta nova sem modelo”.
- Dados antigos continuam separados. Não transformar `Attempt.correct`, `Card.repetitions` ou a regra de três acertos em dois dias em prova de escrita espontânea.

## 5. Por que a interface pública continuará desativada

Precisamos de dois tipos distintos de validação:

**Validação técnica (Codex):** carregamento correto, estado de ajuda, respostas, persistência idempotente, migração/backups, regressão, acessibilidade e publicação.

**Validação pedagógica real (posterior):** revisão linguística independente, teste com aprendizes, análise de respostas alternativas e ajuste de dificuldade. O motor deve suportar conteúdo inativo até essa homologação, não fingir que os testes técnicos realizaram essa revisão.

**Aprovado para iniciar engenharia:** sim. **Aprovado para disponibilizar o novo método aos alunos:** não.

O arquivo `docs/learn-codex-kickoff-v1.md` estabelece a ordem exata dos incrementos; `docs/learn-pilotos-fechamento-editorial.md` especifica a jornada didática de cada idioma.
