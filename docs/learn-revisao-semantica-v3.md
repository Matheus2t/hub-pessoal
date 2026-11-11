# 2T Learn — revisão semântica, pragmática e de gabaritos (v3)

**Data da passagem:** 11/11/2026  
**Origem:** catálogos legados `frontend/public/learn/{en,ru}.json` após PRs #104–#106.  
**Natureza:** revisão editorial interna assistida, não homologação externa de Inglês/Russo nem certificação CEFR.

## Escopo, método e números

Foram confrontados gabaritos com enunciados, exemplos de vocabulário, fontes das leituras A1–B1 e restrições do motor de comparação literal. Esta etapa focalizou falsos negativos, nuances de registro, gênero gramatical, ambiguidades de relativas e feedback de produção escrita.

- **71 exercícios alterados neste lote:** 38 de Inglês e 33 de Russo, além de **quatro verbetes** de vocabulário e **um texto** de leitura em russo.
- **74 novas respostas literais** aceitas pelos exercícios, com **três respostas removidas/substituídas** por decisão editorial (2 de cumprimentos e 1 do cumprimento em outro idioma; ver abaixo).
- Na comparação dos catálogos com o estado anterior à revisão pedagógica (`d22b1d0`), **215 de 474 exercícios distintos** já tiveram alguma alteração editorial somando os PRs #105, #106 e este lote: 115 EN e 100 RU. Esse número mede alteração de registros, **não** quantidade de exercícios certificados ou revisão independente concluída.
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

### Desambiguação adicional de seis itens B1 em Inglês

- `en-v2-grammar-002-q1/q2`: indicar o verbo `rain` ou a forma `will` realmente solicitada na primeira condicional; do contrário, há múltiplas construções possíveis.
- `en-v2-grammar-003-q3`: indicar explicitamente o particípio de `close` na frase passiva, que aceitava muitas ações sem a pista lexical.
- `en-v2-grammar-005-q2`: exigir a forma em `-ing` de `read`; antes, vários verbos eram possíveis.
- `en-v2-test-002` e `en-v2-test-005`: explicitar `leave` e `cook` nos respectivos exercícios, evitando penalizar respostas igualmente gramaticais.

### Registro individual

O arquivo [`learn-revisao-itens-474.csv`](learn-revisao-itens-474.csv) traz **todos os 474 IDs**, idioma, habilidade, nível, indicação de alteração desde a primeira revisão e tipo de validação pendente. **215 registros tiveram mudança editorial; 259 não exigiram mudança nesta passagem. Nenhum dos 474 está certificado por revisão independente.** O CSV funciona como registro de acompanhamento, não como nota ou selo de qualidade.

## Regra de avaliação e limites

- O avaliador legado normaliza **pontuação, caixa e espaços**, mas não corrige livremente **paráfrases, sinonímia, morfologia ou semântica**. Cada variante acrescentada foi examinada como candidata de tradução/contexto; **isso não torna a correção de respostas livres completa**.
- Em ditado, diferenças de `ё/е` são potencialmente relevantes à forma escrita ensinada; não devem ser apagadas globalmente.
- A auditoria de áudios continua **textual**. O sistema usa síntese do navegador em atividades legadas; não há gravações validadas nem prova de pronúncia ou compreensão oral.
- Para eventual uso avaliativo, observar direitos de uso do áudio, transcrições, rubricas, revisão independente por idioma e evidência de aprendizagem com estudantes.

## Risco técnico para o Codex — reconciliado

Após os PRs #104–#107, a divergência foi medida contra duas execuções isoladas de `scripts/learn/build-catalogs.py`: 241 registros diferiam da geração-base (222 exercícios e 19 registros de vocabulário, expressões, leituras e lições), sem inclusão ou remoção de IDs. Os campos editoriais aprovados foram consolidados em `scripts/learn/catalog-editorial-overrides.json` e agora são aplicados pelo próprio gerador.

`npm run learn:check-catalogs` gera cada catálogo duas vezes em diretórios temporários e compara o resultado estruturado com os JSON versionados e com o inventário de 474 IDs. O comando também é executado pelo workflow `verify-site.yml`. Para alterar conteúdo, editar a fonte autoral ou a camada editorial versionada e regenerar; não corrigir apenas os JSON publicados. Essa reconciliação técnica não representa aprovação linguística independente.

## Acompanhamento

- Executar todas as verificações CI do PR antes da integração.
- Prosseguir com revisão contextual item a item, especialmente respostas abertas e leituras com múltiplas paráfrases.
- Submeter exportação congelada por idioma a revisor externo qualificado e documentar parecer por versão/hash; **nenhuma aprovação humana independente é declarada**.
- Não liberar publicamente C1–C5 apenas com aprovação dos checks; exigir decisão explícita de lançamento.

## Homologação técnica da consolidação — 2026-11-11

- A camada de overrides cobre 241 registros divergentes entre a geração-base e os catálogos publicados: 222 exercícios e 19 palavras, expressões, leituras ou lições. O inventário editorial dos PRs #104–#107 marca 215 exercícios com mudanças; são recortes diferentes, pois a comparação do gerador inclui divergências anteriores ao intervalo editorial registrado. Nenhum ID foi criado ou removido.
- O build do Learn aplica os overrides como última etapa. `npm run learn:check-catalogs` executou o gerador duas vezes em diretórios temporários, comparou as duas saídas aos catálogos versionados e confirmou os 474 IDs.
- Build e typecheck aprovados; os 12 validadores do Learn aprovados; regressão Playwright completa do Learn: 120/120 aprovada no Chromium, cobrindo inglês, russo, C1–C5, backups, persistência, acessibilidade e telas de 320 a 1920 px. Uma captura em 320 px expirou numa primeira execução sob carga, mas passou isoladamente e na suíte integral repetida.
- Respostas não reconhecidas de escrita livre ficam `uncertain`, não aumentam erros nem reduzem acurácia. Variantes cadastradas continuam determinísticas; os registros históricos sem `assessmentOutcome` preservam sua interpretação anterior. Backups v1/v2 continuam legíveis e v3 preserva o novo campo opcional.
- Síntese usa voz compatível disponível no navegador e continua identificada como prática. O manifesto tem 124 entradas, nenhuma gravação validada e avaliação auditiva desabilitada.
- As prévias C1–C5 permanecem desativadas publicamente e restritas ao loopback. Esses resultados são validação estrutural e automatizada, não certificação linguística ou homologação com estudantes.
