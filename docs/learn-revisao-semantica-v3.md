# 2T Learn — revisão semântica, pragmática e de gabaritos (v3)

**Data da passagem:** 11/11/2026  
**Origem:** catálogos legados `frontend/public/learn/{en,ru}.json` após PRs #104–#106.  
**Natureza:** revisão editorial interna assistida, não homologação externa de Inglês/Russo nem certificação CEFR.

## Escopo, método e números

Foram confrontados gabaritos com enunciados, exemplos de vocabulário, fontes das leituras A1–B1 e restrições do motor de comparação literal. Esta etapa focalizou falsos negativos, nuances de registro, gênero gramatical, ambiguidades de relativas e feedback de produção escrita.

- **65 exercícios alterados neste lote:** 32 de Inglês e 33 de Russo, além de **quatro verbetes** de vocabulário e **um texto** de leitura em russo.
- **74 novas respostas literais** aceitas pelos exercícios, com **três respostas removidas/substituídas** por decisão editorial (2 de cumprimentos e 1 do cumprimento em outro idioma; ver abaixo).
- Na comparação dos catálogos com o estado anterior à revisão pedagógica (`d22b1d0`), **209 de 474 exercícios distintos** já tiveram alguma alteração editorial somando os PRs #105, #106 e este lote: 109 EN e 100 RU. Esse número mede alteração de registros, **não** quantidade de exercícios certificados ou revisão independente concluída.
- A contagem continua sendo **237 exercícios por idioma**, com os mesmos IDs, níveis e modalidades.
- Não houve validação auditiva nem teste com estudantes neste lote.

## Decisões principais por caso

### Inglês

1. **`en-v2-grammar-004-q1`, `q2`, `q3`:** em orações relativas restritivas, `who/that` para pessoa e `which/that` para coisa são aceitos conforme a função sintática. Os enunciados passaram a pedir *um pronome relativo* em vez de impor uma opção entre duas válidas. Na relativa de objeto, a omissão do pronome pode ser natural, mas não satisfaz a instrução que pede um pronome.
2. **`en-listening-009` e `en-word-009`:** substituir a tradução artificial *boa noite ao chegar* por **boa noite**, com orientação de uso: `good evening` cumprimenta ao encontrar alguém à noite; `good night` costuma despedir ou anteceder o sono.
3. **`en-listening-016`:** o vocábulo inglês `friend` não marca gênero; aceitar `amigo` e `amiga`.
4. **`en-listening-021/022`:** explicação explícita de `one/two` e da escolha contextual de gênero na tradução portuguesa.
5. **Produção B1 e escrita cotidiana:** admitir traduções naturais como `reliable/trustworthy`, `more/additional evidence`, `although/even though`, `every/each decision`, contração `what's` e `He bikes to work`. Explicações de modalidades destacam diferenças de força pragmática, por exemplo `should` vs `must` — não são sempre intercambiáveis fora de contexto.
6. **Leitura:** acrescentadas respostas equivalentes ancoradas em cada texto (frequência de encontros, horário, plataforma, motivo e efeito); respostas `não` também aceitam a digitação `nao` em perguntas respondidas em português.

### Russo

1. **`ru-listening-001` / `ru-word-001`:** `здравствуйте` é cumprimento polido; a variante informal portuguesa `oi` foi retirada do gabarito por não preservar o registro. `olá` continua aceito. Isso não altera tentativas históricas já armazenadas.
2. **`ru-listening-009` / `ru-word-009`:** `добрый вечер` passa a ser explicado como saudação de encontro à noite, sem a tradução artificial *boa noite ao chegar*. Contrastar com `спокойной ночи`.
3. **`ru-listening-021/022`:** `один` é numeral masculino e `два` acompanha masculino/neutro; com substantivo feminino, usar `одна` e `две`. As traduções `um/uma` e `dois/duas` foram preservadas **porque o gênero do substantivo pode mudar entre russo e português**, como `два стула` → `duas cadeiras`.
4. **`ru-dictation-054`:** `Я оставил деньги дома` possui marca de falante masculino no passado. A versão feminina seria `Я оставила деньги дома`, mas o ditado pede transcrição literal do estímulo; o gabarito original fica preservado.
5. **`ru-v2-reading-003`:** troca de `рейс отменили` por `наш поезд отменили`, mais específica para viagem de trem e coerente com pergunta e tradução; mantém o sentido da história.
6. **Escrita:** variantes de `надёжен`, `преподавательский опыт`, perguntas sobre objetivo, escolhas de imperativo polido/informal e alternativas naturais de tradução. Não equivaler variedades de aspecto, caso ou registro quando o contexto altera o sentido.
7. **Leitura:** alternativas textualmente sustentadas e entradas `não/nao` nos itens respondidos em português.

## Regra de avaliação e limites

- O avaliador legado normaliza **pontuação, caixa e espaços**, mas não corrige livremente **paráfrases, sinonímia, morfologia ou semântica**. Cada variante acrescentada foi examinada como candidata de tradução/contexto; **isso não torna a correção de respostas livres completa**.
- Em ditado, diferenças de `ё/е` são potencialmente relevantes à forma escrita ensinada; não devem ser apagadas globalmente.
- A auditoria de áudios continua **textual**. O sistema usa síntese do navegador em atividades legadas; não há gravações validadas nem prova de pronúncia ou compreensão oral.
- Para eventual uso avaliativo, observar direitos de uso do áudio, transcrições, rubricas, revisão independente por idioma e evidência de aprendizagem com estudantes.

## Risco técnico para o Codex — divergência do gerador

O arquivo **`scripts/learn/build-catalogs.py` reconstrói `frontend/public/learn/en.json` e `ru.json` a partir de TSV e scripts Python**. As decisões editoriais de PRs #104–#106 e desta passagem foram aplicadas diretamente aos catálogos JSON e **não estão todas refletidas nos arquivos-fonte do gerador**. Uma execução futura do gerador pode reverter correções! **Não executar a regeneração dos catálogos antes de reconciliar as fontes.**

A atividade técnica seguinte é fazer um só fluxo reprodutível para gerar catálogos sem perder decisões editoriais; confirmar com diff e `npm run learn:audit` / `npm run learn:quality-audit`. Isso é um handoff de implementação para Codex, não aprovação pedagógica.

## Acompanhamento

- Executar todas as verificações CI do PR antes da integração.
- Prosseguir com revisão contextual item a item, especialmente respostas abertas e leituras com múltiplas paráfrases.
- Submeter exportação congelada por idioma a revisor externo qualificado e documentar parecer por versão/hash; **nenhuma aprovação humana independente é declarada**.
- Não liberar publicamente C1–C5 apenas com aprovação dos checks; exigir decisão explícita de lançamento.
