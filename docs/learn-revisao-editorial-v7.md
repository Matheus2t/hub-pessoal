# 2T Learn — revisão editorial v7 dos 146 exercícios ainda sem alterações

**Data de trabalho:** 11/11/2026  
**Base:** `main` após PR #111. Comparação histórica com `d22b1d0f62861af367146035316c0222f8109077`.  
**Natureza:** triagem textual e correção editorial interna; não é parecer independente, validação auditiva, teste de desempenho nem certificação CEFR.

## Escopo e decisão

Foram enumerados os **146 exercícios cujos registros permaneciam idênticos à base anterior às rodadas editoriais** (69 EN, 77 RU). O foco foi verificar pistas suficientes para gabaritos objetivos, fidelidade entre estímulo e feedback e respostas em português que possam ter formas equivalentes.

**Resultado da triagem:**
- **78 exercícios anteriormente intactos receberam alterações fundamentadas:** 44 Inglês e 34 Russo.
- **40 explicações de ditado** foram tornadas específicas, em vez de apenas repetir a tradução (24 EN e 16 RU).
- **15 questões gramaticais** receberam enunciados menos ambíguos ou explicações mais precisas (8 EN e 7 RU).
- **15 testes** tiveram gabaritos de compreensão ampliados ou feedback/enunciados esclarecidos (8 EN e 7 RU).
- **6 questões de Listening** receberam explicações pragmáticas/lexicais (3 EN, 3 RU).
- **2 perguntas de leitura** receberam variantes que expressam o motivo textual por extenso (1 EN, 1 RU).
- **40 respostas literais acrescentadas**, 20 por idioma, sem exclusão de alternativas antigas.
- Os **68 exercícios restantes (25 EN, 43 RU)** foram mantidos sem edição, pois esta triagem não encontrou uma correção editorial objetiva suficiente para justificar mudança. Eles **não estão certificados** por especialista e continuam sujeitos à homologação.

**Total acumulado de exercícios distintos com alteração editorial desde a base histórica: 406 de 474 (212 EN + 194 RU).** Esse valor mede modificação de registros, não porcentagem de qualidade, domínio, completude ou certificação pedagógica.

## Problemas e decisões linguísticas específicas

### 1. Lacunas e pistas pedagógicas suficientes

- `en-grammar-03-q3`: passa a pedir explicitamente o artigo definido `the`, e não qualquer determinante possível.
- `en-grammar-06-q1..q3`: pronome possessivo referenciado a `sister`, `we`, `they`, em vez de lacuna que também poderia receber outras palavras.
- `en-grammar-07-q1..q3`: distinguir contato com superfície (`on`), preposição para dia da semana (`on Friday`) e horário exato (`at six`).
- `en-v2-grammar-003-q1` e `en-v2-test-003`: os enunciados solicitam a forma de `be` no **passado simples passivo**, distinguindo `was` e `were` sem permitir outras construções passivas fora do objetivo.
- `ru-grammar-07-q1/q3`: pedir explicitamente partícula negativa, em contraste com formas afirmativas de aspecto/tempo, e explicar `не` versus `нет`.
- `ru-grammar-02-q3`, `03-q3`, `05-q3`, `09-q3`, `10-q2`: feedback detalhado de polidez, gênero de substantivos terminados em `-ь`, grafia de `моё`, nominativo versus acusativo e `две` com substantivo feminino.

### 2. Pergunta factual com referência temporal ambígua

- Antes: `Nina studies before dinner and rests afterwards` / `Нина занимается до ужина, а потом отдыхает`.
- Problema: `afterwards`/`потом` podem indicar apenas **depois de estudar**, sem estabelecer inequivocamente **depois do jantar**, que era a pergunta avaliada.
- Depois: `Nina studies before dinner and rests after dinner` / `Нина занимается до ужина, а после ужина отдыхает`.
- IDs `en-test-18` e `ru-test-18` e gabaritos foram preservados.

### 3. Significado em português e respostas equivalentes

Nos testes de significado/pequenos trechos, aceitam-se variantes textualmente sustentadas, como `farmácia/farmacia`, `amanhã/amanha`, `pais/pai e mãe`, `porque está chovendo/porque chove`, `vão a pé/andando`, `na mesa/em cima da mesa` e `descansa depois do jantar`.

Na leitura `*-reading-07-q3`, foram adicionadas respostas sobre Sara ter pouco tempo/quinze minutos, explicitamente relatados na passagem; isso fundamenta a decisão de não comprar lanche. Alternativas inferenciais não sustentadas não foram incluídas.

### 4. Ditado — feedback linguístico, não afrouxamento

Nos 40 ditados cuja explicação ainda era apenas `Sentido da frase: …`, o feedback passou a destacar, conforme cada caso:

- Inglês: presente simples para rotina, presente contínuo, substantivos não contáveis, pronomes e possessivos, expressões de tempo e localização, preposições, estrutura negativa, imperativo e passado de verbos irregulares.
- Russo: `в этом году`, `каждое утро`, concordância de adjetivos com gênero, formas curtas `готов/закрыт`, prepositivo `на тарелке`, instrumental `рядом с парком`, construções de horário e localização.

**Os ditados não ganharam respostas alternativas:** o áudio continua correspondendo ao texto esperado. Não houve alteração de áudio, de `answers[0]`, nem relaxamento global das diferenças de `е` e `ё`.

### 5. O que foi mantido sem alteração

Os 68 registros que permaneceram idênticos contêm principalmente vocabulário A1 simples, identificação de letras e pronomes, plurais e concordâncias básicas, grafia específica de verbos, traduções curtas e cinco testes B1 de Russo. Na análise textual desta rodada, não se demonstrou um erro editorial específico que justificasse modificá-los. **Permanecer inalterado não implica homologação independente nem que a rubrica seja suficiente para inferir proficiência.**

## Progressão B1 — nova proposta, sem liberação

A proposta em `docs/learn-propostas-b1-v7.md` apresenta **10 tarefas de inferência textual e 10 tarefas de transferência comunicativa** (cinco de cada por idioma) ancoradas nas leituras B1 atuais, com rubricas humanas e limite `uncertain`.

**Essas tarefas NÃO estão no catálogo de produção, não criam IDs e não mudam os 474 exercícios existentes.** Precisam de aprovação independente e validação técnica antes de eventual implementação. Esta medida evita introduzir novos exercícios avaliados automaticamente apenas por strings, sem rubricas.

## Integridade, geração e ressalvas

- Todas as mudanças dos catálogos foram espelhadas em `scripts/learn/catalog-editorial-overrides.json`, mantendo o mecanismo determinístico adotado no PR #108.
- Sem alteração de IDs, ordem, níveis, habilidades, `wordIds`, `unitId` ou strings de áudio.
- **474 exercícios e 15 textos por idioma** preservados.
- O histórico do estudante e as restrições C1–C5 não foram alterados.
- `docs/learn-revisao-itens-474.csv` passa a distinguir as modificações v7 dos 68 registros mantidos sem mudança.
- Verificações CI devem ser registradas no PR; nenhum parecer externo ou avaliação auditiva é reivindicado.

## Próximas etapas de homologação

1. Revisores qualificados de Inglês e Russo devem julgar material e gabaritos com parecer rastreável e exemplos de respostas livres.
2. Acompanhar estudantes em tarefas independentes, sem depender apenas de acertos em vocabulário/dictado.
3. Ouvir/validar os estímulos reais, pronúncia e ritmos dos 120 itens; TTS do navegador é prática, não prova auditiva.
4. Validar as tarefas B1 propostas com rubrica e avaliadores independentes antes de ligá-las no frontend.
5. Declarar nível apenas com evidência de aprendizagem e referência aos descritores apropriados; não há certificação automática.
