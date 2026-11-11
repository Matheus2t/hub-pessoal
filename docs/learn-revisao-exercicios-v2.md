# 2T Learn — revisão dos 474 exercícios: primeira passagem

**Data:** 2026-11-11  
**Estado:** primeira revisão editorial interna com correções propostas; **não** é aprovação independente, certificação CEFR, avaliação auditiva nem autorização de lançamento.  
**Base:** `main` em `d22b1d0f62861af367146035316c0222f8109077`, catálogos `frontend/public/learn/en.json` e `ru.json`.

## Cobertura da primeira passagem

Foram enumerados e inspecionados os campos de pergunta, resposta e explicação dos **474 itens legados** dos dois idiomas. Isso serve como triagem de consistência e levantamento de oportunidades de melhoria. Uma inspeção textual inicial **não equivale a conferir individualmente todos os estímulos contra suas fontes**, nem comprova que todas as alternativas semanticamente corretas estejam cadastradas.

| Modalidade | Inglês | Russo | Total |
| --- | ---: | ---: | ---: |
| Listening (texto para síntese local) | 30 | 30 | 60 |
| Ditado | 30 | 30 | 60 |
| Escrita e tradução (A1–B1) | 52 | 52 | 104 |
| Leitura (A1–B1) | 45 | 45 | 90 |
| Gramática (A1–B1) | 45 | 45 | 90 |
| Testes (A1–B1) | 35 | 35 | 70 |
| **Total** | **237** | **237** | **474** |

Os textos-fonte das leituras 03 e 09 foram verificados diretamente nos dois idiomas ao resolver problemas específicos; o cotejo detalhado das **demais leituras** com seus 90 gabaritos ainda requer outra passagem. Os áudios não foram ouvidos nem validados: o catálogo não contém gravações homologadas.

## Alterações propostas nesta passagem

- **76 exercícios distintos alterados:** 42 de Inglês e 34 de Russo; **dois textos de leitura** também receberam correção contextual. Não houve renomeação, remoção ou reordenação de exercício.
- **42 novas variantes literais** de respostas inseridas, com **quatro respostas anteriores substituídas** quando as perguntas de leitura foram reformuladas. As novas variantes não significam correção semântica automática para respostas livres.
- **Leitura 03, EN/RU (`*-reading-03-q2`):** a pergunta anterior era causal (`por que?`), mas a passagem não explicava a motivação; foi transformada em pergunta factual (`o que fazem depois da primeira leitura?`) com gabaritos e feedback correspondentes.
- **Leitura 09, EN/RU:** a restrição alimentar passou a referir **laticínios**, inclusive ingredientes de molhos, em vez de apenas `beber leite`. O queijo permanece servido separadamente. A narrativa não é aconselhamento médico/alimentar.
- **Inglês B1 (`en-v2-grammar-001-q1/q2/q3`):** explicações passam a distinguir experiência de vida, resultado ligado ao presente e passado com tempo definido; a versão anterior generalizava indevidamente o Present Perfect.
- **Avaliações `*-test-01, 09–12, 19–25, 27–29`:** substituídas explicações que misturavam regras de Inglês e Russo na mesma resposta, agora centradas no idioma efetivamente avaliado.
- **Produção escrita:** adicionadas variantes sustentáveis por contexto (por exemplo, `coworker/colleague`, `traffic light/lights`, `job/position`, `We finished the work on time`, `Какая следующая станция?`) e feedback mais instrutivo.
- **Feedback genérico nos exercícios de escrita:** reduzido de **40 para 20** itens em Inglês e de **40 para 23** em Russo, mas **43/104** itens de escrita continuam com feedback genérico.

## Verificação de integridade realizada

Foi feito cotejo programático entre `main` e a branch de revisão para cada arquivo: ambos ainda possuem 237 exercícios e 15 textos; as sequências de IDs, idiomas, níveis e modalidades foram preservadas; todas as respostas permanecem não vazias e sem duplicatas após normalização de caixa, espaços e pontuação. O cotejo reportou **zero violações** dessas invariantes. Esta verificação não substitui `npm run learn:audit`, `npm run learn:quality-audit`, demais validadores, typecheck, build e testes Playwright, que devem rodar em CI após a abertura do PR.

## Pendências para revisão completa

1. **43 explicações de escrita** ainda precisam de feedback contextual e de adjudicação de variantes de tradução (20 EN, 23 RU).
2. **Conferir as 90 perguntas de leitura contra os 30 textos originais**, especialmente os textos B1 e inferências que podem sustentar respostas diferentes. As correções das leituras 03 e 09 não concluem essa conferência.
3. **Revisar a intenção e a precisão dos testes e exercícios B1** com rubricas e exemplos de alternativas aceitas, sem atribuir proficiência pelo percentual de acertos.
4. **Rever nuances do Russo**, como `ru-listening-001` (`здравствуйте` formal vs. variante coloquial `oi`), gênero nas falas de ditado (por exemplo `ru-dictation-054`), diferença `ё/е` e naturalidade contextual. Não alterar silenciosamente gabaritos históricos nesses casos sem decisão fundamentada.
5. **Listening/ditado:** 120 atividades dependem de áudio produzido por síntese local; a validação de gravações, pronúncia, sotaque e transcrição permanece pendente. Não usá-las para nota auditiva.
6. **Correção de respostas abertas:** o avaliador atual compara texto normalizado a listas de respostas exatas; respostas semanticamente corretas não cadastradas podem ser recusadas. Preservar o estado `uncertain` onde não houver revisão humana.
7. **Homologação independente:** revisor qualificado por idioma, com versão/hash e parecer; sessões reais consentidas com estudantes; revisão de privacidade e acesso seguro à Vercel antes de qualquer ativação pública.

## Próximo trabalho

Prosseguir com o cotejo **item a item das leituras**, revisar o restante das explicações de escrita e auditar em contexto as alternativas de avaliações/gramática. Registrar novas decisões por ID e executar a suíte de validação antes de integrar cada lote.

**Critério de conclusão:** somente marcar `474/474 revisão final` após revisar estímulo, objetivo, pergunta, gabarito, variantes, feedback e nível de **cada exercício**, com confirmação posterior por especialista independente. Esta passagem **não** satisfaz esse critério.
