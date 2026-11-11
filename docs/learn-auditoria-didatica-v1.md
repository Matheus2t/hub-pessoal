# 2T Learn — Auditoria didática do material existente

**Etapas:** 2.4 (lacunas e repetições), 2.5 (revisão dos pilotos), preparação da etapa 6.  
**Estado:** auditoria editorial inicial com contagens verificáveis, recomendações e material-piloto revisado internamente. **Não é homologação linguística ou certificação CEFR.**  
**Fonte:** catálogos em \`frontend/public/learn/{en,ru}.json\`. Os achados podem ser reproduzidos com \`npm run learn:quality-audit\`.

## 1. Achados objetivos

| Item | Inglês | Russo | Por que importa |
|---|---:|---:|---|
| Exercícios legados | 237 | 237 | Base existente e histórica a preservar |
| Questões de gramática repetidas em provas | 5 grupos | 5 grupos | A mesma questão não é evidência independente de aprendizagem |
| Exercícios de escrita com explicação genérica | 40 de 52 | 40 de 52 | Explicações não diagnosticam o erro concreto do aluno |
| Leituras | 15 | 15 | Quantidade não garante a progressão de compreensão |
| Questões ligadas explicitamente a leitura/gramática | 90 | 90 | Restante do material exige mapeamento por objetivo, não tags automáticas |

### 1.1 Repetições confirmadas

Os seguintes cinco grupos aparecem **em cada idioma**, trocando \`<lang>\` por \`en\` ou \`ru\`:

| Questão de gramática | Questão de teste | Tipo de repetição |
|---|---|---|
| \`<lang>-v2-grammar-001-q1\` | \`<lang>-v2-test-001\` | Mesmo enunciado e resposta |
| \`<lang>-v2-grammar-002-q1\` | \`<lang>-v2-test-002\` | Mesmo enunciado e resposta |
| \`<lang>-v2-grammar-003-q1\` | \`<lang>-v2-test-003\` | Mesmo enunciado e resposta |
| \`<lang>-v2-grammar-004-q1\` | \`<lang>-v2-test-004\` | Mesmo enunciado e resposta |
| \`<lang>-v2-grammar-005-q1\` | \`<lang>-v2-test-005\` | Mesmo enunciado e resposta |

**Consequência:** uma pessoa pode acertar no teste por reconhecimento do mesmo enunciado, sem demonstrar que consegue utilizar a estrutura fora dele. Isso é um risco de interpretação da evidência, não prova de que todos os exercícios sejam pedagogicamente ruins.

**Correção futura:** criar, validar e testar uma **tarefa diferente** de compreensão ou aplicação nas provas; manter os IDs e os resultados históricos dos exercícios anteriores. Não substituir silenciosamente enunciados sob IDs já respondidos.

### 1.2 Escrita com feedback genérico

Em ambos os idiomas, **40 de 52** exercícios de escrita usam a explicação-padrão sobre comparar a resposta com as variantes cadastradas. O texto informa corretamente que outras traduções podem ser válidas, mas não ensina por que uma resposta foi inadequada.

**Correção futura:** construir rubricas por objetivo; registrar significado exigido, variantes legítimas, erros que mudam o sentido, escolhas de registro e uma nova tentativa contextualizada. Não declarar que um algoritmo determinístico consegue julgar toda frase livre.

**Primeiro conjunto de exemplos:** \`frontend/public/learn/pedagogy-v1/feedback-casebook.json\`, a ser revisado editorialmente. O contrato está em \`evaluation-policy.json\`.

### 1.3 Rótulos A1/A2/B1 não equivalem à dificuldade validada

As leituras atuais costumam ter 39–67 palavras separadas por espaço, variando conforme idioma e nível. **Contagem de palavras não mede complexidade gramatical, densidade lexical, familiaridade ou proficiência.** Por exemplo:

- \`ru-reading-01\` (rotulada A1) utiliza \`по понедельникам\`, \`поэтому\`, \`чтобы ... не промокли\` e diversas formas flexionadas. A classificação requer revisão de dificuldade e possíveis apoios graduais; não mudar o nível automaticamente.
- \`en-reading-01\` (A1) conta uma sequência de atividades cotidianas e contém uma relação de propósito (\`to keep them dry\`). A compreensão do propósito deve ser ensinada, não apenas um quiz de tradução.
- Os textos B1 do catálogo são, em geral, mais curtos do que os A2. Isso não constitui defeito por si só; demonstra que **extensão não pode definir progressão**.

**Correção futura:** avaliação por dificuldade linguística e demanda da tarefa, revisão humana e validação com desempenho real de estudantes antes de atribuir confiança a qualquer nível.

## 2. Auditoria das unidades-piloto (preparação de qualidade)

### Inglês — primeiro contato

**Ponto pedagógico:** não só apresentar nome e profissão, mas interpretar \`What about you?\` como abertura para o interlocutor. Agora existem duas perguntas de compreensão com funções distintas: distinguir falas de personagens e perceber a finalidade comunicativa de uma expressão.

**Melhorias registradas:** microexplicações de \`I'm\`, \`I study\`, \`What about you?\` e \`Are you a student?\`; feedback específico por alternativa errada; pistas graduais; indicação de erros esperados; tarefa de transferência para reunião online com pergunta relevante.

**Revisão pendente:** linguagem natural para estudante real, alternativas de resposta livre, objetivo viável no tempo proposto, relevância do novo contexto e gravação de áudio caso a unidade passe a avaliar listening.

### Russo — orientação urbana

**Ponto pedagógico:** usar as informações do diálogo para compreender destino, sequência e ponto de referência, em vez de somente memorizar \`налево\` = esquerda.

**Melhorias registradas:** explicações contextuais de \`Извините\`, \`где\`, \`находится\`, \`рядом с аптекой\`; diferença de registro ao abordar desconhecidos; feedback por alternativa errada; erro de destino separado de ortografia; transferência para \`библиотека\`; tratamento do teclado fonético como apoio.

**Revisão pendente:** checagem linguística independente de naturalidade, casos e pronúncia; testes de compreensão do texto; escolha de áudio; variantes válidas; uso efetivo do teclado fonético no motor futuro.

### Regras de ativação

As aulas continuam com \`runtimeEnabled:false\` e \`editorialReview.preventRuntimeUntilApproved:true\`. O validador \`learn:validate-pedagogy\` exige finalidade por etapa, explicações, correção de distratores e portões de revisão.

**Uma revisão automatizada estruturada não substitui uma revisão linguística por pessoa competente no idioma.** Não declarar "100% de qualidade", "proficiência" nem "oralidade avaliada" apenas porque o CI passou.

## 3. Plano de correção enxuto, sem reescrever o catálogo

| Prioridade | Trabalho | Quem | Critério de aceite |
|---|---|---|---|
| P0 | Revisar e validar os dois pilotos em uso real | ChatGPT + revisão linguística e teste com aprendiz | Tarefas compreensíveis, respostas legítimas previstas, transferência observável |
| P0 | Impedir contagem das 10 duplicações como evidência independente | Codex (motor de evidências) | Repetir um mesmo item não aumenta a competência transferida |
| P1 | Melhorar feedback dos exercícios de escrita usados em pilotos | ChatGPT: rubricas; Codex: apresentação | Correção contextual e possibilidade de nova tentativa |
| P1 | Avaliar dificuldade das leituras atuais | ChatGPT + especialista | Ajustar ajuda e sequenciamento sem apagar histórico |
| P1 | Mapear conteúdos remanescentes para objetivos aprovados | ChatGPT | Mapa de IDs revisado, sem associação por palavra-chave cega |
| P2 | Substituir futuramente provas repetidas por tarefas novas | ChatGPT cria; Codex integra e testa | Avaliação em situação diferente da prática |
| P2 | Construir registros e recomendações por evidência | Codex | Não confundir reconhecimento, produção, transferência e retenção |

**Não adicionar novos exercícios em massa.** Primeiro corrigir qualidade da evidência nas atividades já planejadas.

## 4. Verificação automatizada

O arquivo \`frontend/public/learn/pedagogy-v1/quality-baseline.json\` registra **apenas os problemas conhecidos e contáveis**, sem promover um número de acertos a indicador de qualidade.

\`\`\`bash
npm run learn:quality-audit
node scripts/audit-learn-teaching-quality.mjs --json
npm run learn:validate-pedagogy
npm run learn:validate-diagnostics
\`\`\`

A auditoria reprova **novas questões exatamente repetidas** (mesmo enunciado + primeira resposta) e aumento de explicações genéricas além da base conhecida. Uma duplicação conhecida que for corrigida não causa erro. Ajustes legítimos ao catálogo devem vir com revisão do baseline e comprovação pedagógica.

**Limite do detector:** paráfrases, traduções mal formuladas, erros culturais e questões semanticamente equivalentes com redação diferente exigem revisão humana.

## 5. Etapas restantes

A etapa 2 tem agora inventário, currículos preliminares, mapeamento inicial de IDs e auditoria de qualidade. O mapeamento **não é completo**: foram vinculadas 71 referências de suporte entre as duas línguas, e a auditoria não afirma que os outros itens foram analisados individualmente para todos os objetivos.

Antes de construir o motor, faltam aprovação pedagógica efetiva das unidades, revisão de conteúdo e definição operacional de avaliações abertas. A implementação do motor, histórico de evidências, diagnóstico e revisão adaptativa segue reservada ao Codex, conforme \`docs/learn-handoff-codex.md\`.
