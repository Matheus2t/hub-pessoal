# 2T Learn — revisão dos 474 exercícios: primeira passagem

**Data:** 2026-11-11  
**Estado:** primeira revisão editorial interna com correções propostas; **não** é aprovação independente, certificação CEFR, avaliação auditiva nem autorização de lançamento.  
**Base:** `main` em `d22b1d0f62861af367146035316c0222f8109077`, catálogos `frontend/public/learn/en.json` e `ru.json`.

## Cobertura da primeira passagem

Foram enumerados e inspecionados os campos de enunciado, resposta e explicação dos **474 exercícios legados**. Todos os **30 textos de leitura** e os **90 itens de leitura** também receberam inspeção editorial inicial em relação ao conteúdo textual. Uma primeira passagem **não** certifica que todas as respostas semanticamente corretas estejam previstas, nem a adequação CEFR; os 120 itens auditivos foram inspecionados pelo texto, **não pelo áudio**, porque não há gravações homologadas.

| Modalidade | Inglês | Russo | Total |
| --- | ---: | ---: | ---: |
| Listening (texto para síntese local) | 30 | 30 | 60 |
| Ditado | 30 | 30 | 60 |
| Escrita e tradução (A1–B1) | 52 | 52 | 104 |
| Leitura (A1–B1) | 45 | 45 | 90 |
| Gramática (A1–B1) | 45 | 45 | 90 |
| Testes (A1–B1) | 35 | 35 | 70 |
| **Total** | **237** | **237** | **474** |

## Alterações propostas nesta passagem

- **149 exercícios distintos alterados:** 77 de Inglês (43 escrita, 16 leitura, 15 teste, 3 gramática) e 72 de Russo (41 escrita, 16 leitura, 15 teste); **três registros de leituras** tiveram texto/tradução corrigido. Não houve renomeação, remoção nem reordenação de exercício.
- **67 novas variantes literais** de respostas inseridas. Quatro respostas anteriores foram substituídas quando duas perguntas de leitura mudaram de objetivo. As novas variantes não constituem um avaliador semântico.
- **Leitura 03, EN/RU (`*-reading-03-q2`):** a pergunta anterior era causal (`por que?`), mas a passagem não explicava a motivação; foi transformada em pergunta factual (`o que fazem depois da primeira leitura?`) com gabaritos e feedback correspondentes.
- **Leitura 09, EN/RU:** a restrição alimentar passou a referir **laticínios**, inclusive ingredientes de molhos, em vez de apenas `beber leite`. O queijo permanece servido separadamente. A narrativa não é aconselhamento médico ou alimentar.
- **Leituras B1, EN/RU:** as 30 explicações de perguntas de compreensão passaram a apontar evidência textual específica, em vez de reproduzir todo o texto traduzido. Questões sobre lâmpadas foram reformuladas para não pressupor localização da instalação que o texto não afirma explicitamente. Em Inglês, `community garden` passou a ser traduzido principalmente como **jardim comunitário**, sem pressupor produção de alimentos; a antiga variante `horta comunitária` foi preservada para não invalidar automaticamente respostas históricas.
- **Inglês B1 (`en-v2-grammar-001-q1/q2/q3`):** explicações distinguem experiência de vida, resultado ligado ao presente e passado com momento definido.
- **Avaliações `*-test-01, 09–12, 19–25, 27–29`:** substituídas explicações que misturavam regras de Inglês e Russo, agora centradas no idioma avaliado.
- **Produção escrita:** adicionadas variantes sustentadas pelo contexto (por exemplo, `coworker/colleague`, `traffic light/lights`, `job/position`, `We finished the work on time`, `Какая следующая станция?`) e todas as explicações padronizadas foram substituídas por feedback gramatical/contextual.
- **Explicações genéricas de escrita:** reduzidas de **40 para zero em Inglês** e de **40 para zero em Russo**, mantendo 52 exercícios por idioma. Isso melhora a informação apresentada, mas não elimina a limitação de correção por string exata.

## Verificação de integridade realizada

Cotejo programático entre `main` e a branch: **237 exercícios e 15 leituras por idioma**, mesmas sequências de IDs, idiomas, níveis e modalidades; sem respostas vazias ou duplicadas após normalização equivalente de caixa, espaços e pontuação; sem duplicações exatas de enunciado + primeiro gabarito; **zero violações** encontradas. Alterações totais: **149 exercícios**, **67 novas respostas cadastradas**, **4 respostas substituídas**, **3 registros de leitura modificados**. Esta verificação não substitui `npm run learn:audit`, `npm run learn:quality-audit`, demais validadores, typecheck, build e testes Playwright do CI.

## Pendências para revisão completa

1. **Reavaliar variantes de respostas livres** com critérios explícitos, pois comparações literais continuam suscetíveis a falsos negativos mesmo com 67 novas variantes. Feedback contextual não equivale à correção semântica.
2. **Segunda leitura aprofundada dos 30 textos, das 90 perguntas de compreensão e das demais modalidades**, com foco em inferências, pragmática e precisão das traduções, mais adjudicação independente.
3. **Revisar o nível real das atividades A1–B1** e a adequação da progressão com docentes; os testes e acertos não certificam níveis CEFR.
4. **Rever nuances do Russo**, como `ru-listening-001` (`здравствуйте` formal vs. variante coloquial `oi`), gênero nas falas de ditado (por exemplo `ru-dictation-054`), diferença `ё/е`, naturalidade de `рейс отменили` para trem e aceitabilidade regional. Não remover silenciosamente gabaritos históricos sem decisão fundamentada.
5. **Listening/ditado:** 120 atividades usam texto para síntese local; a validação de gravações, pronúncia, sotaque e transcrição permanece pendente. Não usá-las para certificação de compreensão oral.
6. **Respostas abertas:** avaliador legado usa texto normalizado contra respostas cadastradas; o estado `uncertain` deve continuar onde a avaliação exigir julgamento semântico não disponível.
7. **Homologação independente:** revisores qualificados por idioma, versão/hash e parecer; testes consentidos com estudantes; revisão de privacidade e acesso seguro ao projeto correto da Vercel antes da ativação pública.

## Próximo trabalho

Executar checagens da suíte no CI do PR e corrigir qualquer regressão. Depois, realizar a revisão semântica aprofundada dos itens que permanecem com risco de ambiguidade e submeter o conjunto a revisão independente por idioma.

**Critério de conclusão:** marcar `474/474 revisão final` somente após evidenciar verificação de estímulo, objetivo, pergunta, gabarito, variantes, feedback e nível de **cada item**, seguida de aprovação por especialista independente. Esta primeira passagem **não** satisfaz esse critério.
