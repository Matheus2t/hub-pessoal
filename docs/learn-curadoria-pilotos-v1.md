# 2T Learn — Curadoria editorial de materiais para os primeiros pilotos

**Etapa do cronograma:** 2.3 — vincular materiais reais a objetivos comunicativos; 2.4 — identificar material inadequado; preparação de 2.5 e 6.  
**Estado:** pré-seleção editorial documentada, **sem homologação linguística independente ou teste com aprendiz**. Não altera atividades atuais nem ativa os pilotos.

## 1. O que foi revisado

Foram examinados **40 itens concretos do catálogo legado** — 20 de Inglês e 20 de Russo. A decisão por ID, a justificativa e o eventual encaminhamento ficam em:

`frontend/public/learn/pedagogy-v1/pilot-asset-curation.json`

| Decisão | Inglês | Russo | Interpretação |
|---|---:|---:|---|
| `reuse` | 6 | 6 | Pode apoiar compreensão ou prática guiada no piloto, sujeito a revisão linguística |
| `support_only` | 5 | 6 | Ajuda opcional ou contraste, sem se tornar etapa obrigatória |
| `needs_revision` | 1 | 1 | Existe uma questão concreta de precisão, formato ou validade a resolver |
| `defer` | 8 | 7 | Continua disponível no Learn legado, mas não pertence ao objetivo do primeiro piloto |
| **Total revisado** | **20** | **20** | Amostra focada, não auditoria editorial dos 982 itens |

**Nenhum exercício legado pode comprovar produção independente só por ter sido vinculado a uma competência.** Flashcards, traduções isoladas e lacunas de gramática continuam sendo prática ou apoio.

## 2. Decisões que afetam o currículo inicial

### Inglês — conhecer uma pessoa

**Selecionado para apoio:**
- `en-word-071` — *work*, necessário para distinguir profissão e estudo na fala de Maya;
- `en-word-072` — *office*, presente no diálogo;
- `en-grammar-01-q1` — `I ___ a student`, útil apenas como prática guiada da forma `I am`.

Os três IDs receberam vínculo explícito ao objetivo `en-introductions-01`, com justificativa pedagógica.

**Removido do primeiro objetivo:** `en-phrase-004` (*How do you spell your surname?*). É uma pergunta legítima, mas trata de outra tarefa e aumentaria a carga de conteúdo do encontro inicial. O item permanece no catálogo legado com ID e histórico intactos.

**Revisão pendente:** `en-word-075` associa genericamente *job* a “cargo”. Em contextos diferentes, *job* pode significar “emprego”, “trabalho” ou “função/cargo”; a tradução deve ser contextualizada antes de reutilizar o item. **Não foi alterada a tradução ativa**, para evitar modificar um item histórico sem um plano de revisão.

### Russo — pedir orientação na rua

**Selecionado para apoio:**
- `ru-word-004` — `спасибо`, agradecimento que encerra o diálogo;
- `ru-test-02` — reconhecimento de `аптека`, ponto de referência mencionado na orientação; continua sendo prática lexical, não prova que o estudante compreendeu o trajeto.

Os dois IDs receberam vínculo explícito a `ru-directions-03`.

**Apoio opcional:** `направо` contrasta com `налево`; a frase `Где ближайшая аптека?` pode demonstrar outro destino, mas não deve ficar visível enquanto a pessoa tenta responder sem ajuda.

**Adiado:** perguntas sobre compra de bilhetes, descrição de ruas tranquilas e um texto A2 sobre mudança de plataforma. São materiais legítimos para outros objetivos, mas não para a tarefa inicial.

**Revisão pendente:** `ru-dictation-056` usa `Наш дом рядом с парком`, expressão de localização potencialmente útil; porém, ditado com áudio não revisado não deve virar evidência auditiva do novo método. Se a frase for reaproveitada em contexto diferente, criar nova tarefa devidamente validada e preservar o ID histórico.

## 3. Critérios de entrada no motor de aulas

Os itens `reuse` são permitidos **somente** como trechos de input, glossário ou exercício guiado, com ajuda registrada. `support_only` não deve aparecer automaticamente na tela de aplicação independente. `defer` não deve compor o primeiro objetivo, mesmo quando seu tópico parece próximo. `needs_revision` requer decisão editorial explícita antes de qualquer novo vínculo.

Para respostas abertas, seguem necessárias rubricas de significado, alternativas legítimas e possibilidade de `uncertain` quando a avaliação não for confiável. O código do novo motor não deve confundir essas decisões de curadoria com observações sobre domínio do estudante.

## 4. Verificação automatizada

```bash
npm run learn:validate-curation
npm run learn:validate-pedagogy
npm run learn:coverage
```

A verificação de curadoria confere IDs reais, idioma, justificativa, tipo de uso, vinculação de itens selecionados ao objetivo correto, exclusão de itens adiados e manutenção da regra **não contar prática como competência independente**.

Esse teste detecta erros estruturais; **não substitui** revisão de naturalidade de Inglês/Russo, medição com estudantes nem validação das rubricas.

## 5. O que ainda falta concluir

- Avaliar individualmente os demais candidatos de maior utilidade, sem perseguir artificialmente cobertura de 100%.
- Revisar as duas aulas-piloto com falantes competentes e testar clareza e dificuldade com aprendizes.
- Quando necessário, criar uma tarefa nova com ID próprio, em vez de reclassificar uma tradução antiga como comunicação.
- Implementar motor declarativo, persistência de evidências e avaliação com ajuda — trabalho de engenharia reservado ao Codex.
- Só publicar as novas aulas aos estudantes quando os critérios de qualidade pedagógica, funcionamento e dados estiverem satisfeitos.

**Regra permanente:** melhor aproveitar poucos itens contextualizados e avaliados corretamente do que adicionar dezenas que apenas aumentam a contagem de acertos.
