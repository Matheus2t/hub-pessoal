# 2T Learn — quarta rodada de revisão pedagógica EN/RU

**Rodada:** 11/11/2026, revisão editorial interna.  
**Base de comparação:** catálogos da `main` após integração do PR #108 e catálogo pré-revisão `d22b1d0f62861af367146035316c0222f8109077`.  
**Estado:** correções fundamentadas por texto e gramática, **sem avaliação independente** de docentes, gravações ou estudantes.

## Cobertura e contagens

O escopo permanece **474 exercícios (237 EN + 237 RU)**, com IDs, níveis, modalidades, sequência e histórico preservados. Esta rodada alterou **51 exercícios distintos**: 30 EN e 21 RU, além de um verbete e um texto de leitura em Russo. Foram cadastradas **23 novas respostas aceitas** sem retirar respostas preexistentes.

Desde a base anterior à revisão, **249/474 exercícios distintos têm modificações editoriais**: 132 de Inglês e 117 de Russo. **225 exercícios não foram alterados**; isso não é medida de qualidade ou certificado. O registro `docs/learn-revisao-itens-474.csv` identifica a cobertura e continua classificando todos como pendentes de homologação linguística independente.

### Inglês — correção de ambiguidade

**20 questões gramaticais/testes passaram a explicitar o objetivo**, quando o enunciado antigo permitia outras respostas corretas:

- `en-grammar-01-q1..q3`: verbo `be` no presente.
- `en-grammar-04-q1..q3`: verbo indicado no presente simples.
- `en-grammar-05-q1..q2`: auxiliar do presente simples (antes, `do/does/did/will/can` podiam compor perguntas ou negações com significados diferentes).
- `en-grammar-08-q1..q3`: `there is/are` no presente, evitando descontextualização com `was/were`.
- `en-grammar-09-q2`: Present Continuous explícito, com `now`.
- `en-v2-grammar-001-q1..q3`: diferenciar Present Perfect, particípio de `see` e passado de `go`; os enunciados antigos não determinavam uma forma única.
- `en-test-19`, `21`, `22`, `23`: explicitar presente simples/`be`.
- `en-v2-test-004`: solicitar pronome relativo **sujeito** de `called`; antes, outras estruturas sintáticas com a lacuna também eram gramaticais.

As escolhas mantiveram os gabaritos anteriores e os objetivos do teste, deixando de penalizar inferências legítimas.

### Tradução, variantes e feedback

- `en-writing-069`: acrescentados `switch on` e posições alternativas para `please`, que já eram sugeridos pela própria explicação.
- `en-writing-064`: `beside` como sinônimo locativo de `next to`.
- `en-writing-082`: `takes forty minutes` além de `lasts forty minutes`.
- `en-test-25/26/27`: `I'm home`, `We read daily` e Present Continuous para situação temporária em `She isn't working today`.
- `en-v2-writing-006/007/010/011`: substituído feedback que apenas repetia o gabarito por explicação de possessivo, nominalização em `-ing`, passado, adjetivos e `experience`; acrescentadas paráfrases justificáveis.
- `ru-writing-069/080/085`: imperativo cortês com `пожалуйста` em posição variável, `рисунков` no genitivo plural após `много` e variação de ordem para indicar sexta-feira.
- `ru-test-26/27`: ordem de palavras alternativa conservando o mesmo enunciado.
- `ru-v2-writing-006..010`: feedback específico sobre identificação, instrumental de predicativo, genitivo, obrigação e qualificadores; acrescentadas variantes naturais sem alterar rubrica de nível.

### Russo — caso, aspecto, movimento e dado lexical

- **`ru-word-075` (`должность`) estava registrado como masculino**. Corrigido para **feminino**. O substantivo terminando em `-ь` não pode ter o gênero inferido com segurança só pela última letra.
- `ru-v2-grammar-001-q1/q2`: distinção contextual entre `читал` (processo) e `прочитал` (conclusão).
- `ru-v2-grammar-003-q1..q3`: explicações individualizadas de dativo (`другу`, `мне`, `сестре`).
- `ru-v2-grammar-004-q1..q3`: casos instrumentais de companhia e profissão (`другом`, `врачом`, `сестрой`).
- `ru-v2-grammar-005-q1..q3`: diferença entre percurso atual e hábito, a pé ou de transporte (`иду`, `хожу`, `едем`).
- `ru-reading-05`: trocado o trecho pouco idiomático `Новый час сообщают...` por `О новом времени сообщают...`, preservando a tradução, perguntas e respostas.

## Integridade e reprodutibilidade

Todas as edições de catálogos foram espelhadas no arquivo-fonte de correções `scripts/learn/catalog-editorial-overrides.json`, introduzido no PR #108. Não foram alterados IDs, classificações de nível, modalidade, ordem nem histórico do aluno.

**A aprovação da rodada depende do CI:** verificações determinísticas de geração dos catálogos, validadores Learn, typecheck, build e smoke tests. O resultado do CI/merge deve ser registrado na descrição do PR; este relatório não presume que tenham passado antes da execução.

## Pendências não resolvidas

1. **Revisão de cada alternativa livre** com docente qualificado e critérios explícitos. Mesmo com novos gabaritos, não existe correção semântica automática confiável.
2. **Auditoria auditiva dos 120 itens de listening/ditado** em vozes reais autorizadas, com exame de sotaques, ritmo e articulação.
3. **Proficiência CEFR:** adequação A1–B1 a comprovar por descritores e tarefas; conteúdo não certifica nível.
4. **Revisão de pragmática e gênero no Russo**, especialmente frases com narrador masculino, polidez, variação regional e contextos reais.
5. **Teste consentido com estudantes, validação externa e decisão explícita de lançamento**. As experiências C1–C5 seguem restritas.

Não marcar 249 como porcentagem de `conclusão pedagógica`; é o total histórico de **registros editoriais alterados**.
