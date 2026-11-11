# 2T Learn — Auditoria editorial e linguística

Status desta revisão: **auditoria técnica concluída; aprovação linguística independente pendente**.  
Base: catálogos `en.json` e `ru.json`, versão 1; materiais pedagógicos C1–C5 e readiness contracts existentes.

## Escopo e cobertura

Os validadores percorreram os 491 registros de cada catálogo legado (982 no total): 162 palavras, 62 expressões, 15 leituras, 15 lições e 237 exercícios por idioma. A revisão de engenharia também conferiu as 15 notas de gramática de cada idioma e as falhas mecânicas já registradas pelo quality audit. Isso é triagem editorial automatizada/engenharia, **não** revisão de falante nativo ou certificação pedagógica.

Os validadores dos materiais C1–C5 continuam cobrindo IDs, referências, ordem curricular, gabaritos fechados, rubricas abertas, ajuda registrada e estados de publicação. Os conteúdos C1–C5 permanecem como rascunhos e fora de runtime público.

## Problemas corrigidos

1. **Dez duplicações exatas de avaliação:** em Inglês e Russo, as cinco primeiras questões do teste B1 repetiam palavra por palavra a questão inicial da lição de gramática correspondente. Os dez cenários do teste foram substituídos por situações distintas que medem o mesmo objetivo. IDs, níveis, modalidade e histórico persistido foram mantidos. O quality audit agora registra zero grupos duplicados.
2. **Regra incompleta de relative clauses:** a explicação de Inglês restringia `that` a coisas. Em orações restritivas, `that` também pode retomar pessoas. A nota foi corrigida e uma questão aceita `who` e `that` como variantes válidas.
3. **Validação estrutural:** o audit agora detecta coleções inválidas, campos obrigatórios vazios, IDs com prefixo de idioma divergente, níveis inválidos, marcadores editoriais, variantes de resposta duplicadas, referências de vocabulário/quadro inválidas, questões repetidas em unidades e exemplos ausentes. O audit falha apenas em defeitos verificáveis; sua aprovação não certifica naturalidade.

## Pendências editoriais identificadas

- **40 de 52** explicações de exercícios de escrita em cada idioma ainda usam o aviso genérico de que outras traduções podem ser válidas, enquanto a correção legada continua comparando variantes cadastradas. Esse texto não é feedback individualizado; as respostas continuam sujeitas às alternativas existentes.
- Os objetivos B1 e os testes de cada idioma ainda precisam de revisão editorial de progressão; contagem, nível e acertos não provam progressão CEFR, transferência ou proficiência.
- Os 30 itens legados de Listening e 30 de ditado por idioma têm texto associado para síntese do navegador, não gravações com licença, sotaque e validação auditiva documentados. Não contam como evidência auditiva validada.
- Naturalidade, frequência lexical, adequação CEFR, pragmática, traduções e aceitabilidade regional não podem ser decididas por regras mecânicas. Os casos devem ser revisados por especialistas de cada idioma.
- Casos como `ё/е`, gênero, aspecto, declinação e verbos de movimento requerem decisão contextual; não se deve normalizar essas diferenças em correção literal.

Não alteramos outras frases por intuição isolada. Uma sugestão linguística vira correção de catálogo somente após checagem contextual e, para a aprovação de lançamento, decisão de revisor independente.

## Processo de aprovação humana

Para cada idioma, um revisor identificado e qualificado deve receber uma exportação congelada do conteúdo. O registro deve apontar idioma, caminho e versão do artefato, SHA-256 do arquivo, commit, identificador interno do revisor, qualificação, data/hora, decisão (`approved`, `revise` ou `rejected`), achados por ID, correções requeridas e escopo aprovado. A identidade real e o comprovante de qualificação ficam no registro privado de governança; não devem ser embutidos em um JSON público.

Uma aprovação vale apenas para o hash exato revisado. Qualquer alteração nesse arquivo invalida a aprovação e exige nova revisão. Um segundo revisor adjudica divergências em gabaritos, significado ou variante regional. O arquivo [learn-editorial-review-record-template.json](learn-editorial-review-record-template.json) é apenas um formulário vazio; nenhum revisor ou aprovação foi inventado nesta entrega.

### Critérios mínimos de revisão

- Inglês: gramática, registro, colocação, preposições/artigos, variantes aceitas, naturalidade e nível do enunciado.
- Russo: casos, aspecto, concordância, movimento, ordem, gênero/ё e naturalidade da tradução e da resposta esperada.
- Ambos: coerência entre objetivo, instrução, estímulo, resposta, explicação e nível; alternativas corretas; ambiguidade; acessibilidade do texto.
- Respostas abertas: revisar casos positivos, parciais, negativos, ambíguos e assistidos. Sem acordo documentado, manter `uncertain`.

## Verificações executadas nesta entrega

- `npm run learn:audit`: aprovado sobre os dois catálogos; 491 registros por idioma.
- `npm run learn:quality-audit`: aprovado; 0 duplicações exatas; 40/52 explicações genéricas por idioma permanecem registradas.
- `npm run learn:validate-pedagogy`: aprovado estruturalmente; revisão linguística e integração runtime continuam pendentes.

Esses resultados validam estrutura e regressões mecânicas. Eles não substituem a aprovação independente nem os testes com estudantes.
