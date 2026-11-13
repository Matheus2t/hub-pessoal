# 2T Learn — auditoria de qualidade dos 474 exercícios legados (13/11/2026)

**Escopo:** textos de enunciados, gabaritos/variantes, explicações, ligação a leituras e gramática, distribuição por nível/idioma e segurança das atividades auditivas do catálogo já publicado em `frontend/public/learn/en.json` e `ru.json`. A fonte de autoria dos ajustes é `scripts/learn/catalog-editorial-overrides.json`; a integridade é preservada pelo gerador `build-catalogs.py` e pelo inventário `docs/learn-revisao-itens-474.csv`.

**Natureza:** segunda auditoria de qualidade **interna**, sobre a base já revista anteriormente na V2–V8, combinando inspeção por modalidade e verificação programática de todos os 474 itens. Não representa revisão humana independente de falantes nativos, aferição de nível CEFR, escuta de áudio, nem garante que todas as traduções livres válidas foram catalogadas.

## 1. Escopo coberto

| Modalidade legada | Inglês | Russo | Total | Condição de correção |
| --- | ---: | ---: | ---: | --- |
| Listening (texto e síntese de voz do navegador) | 30 | 30 | **60** | Sem gravação aprovada, não produzir nota auditiva |
| Ditado (texto e síntese de voz do navegador) | 30 | 30 | **60** | Texto canônico coincide com estímulo textual; sem avaliação auditiva validada |
| Escrita / tradução | 52 | 52 | **104** | Reconhecer variantes explícitas; forma não cadastrada deve continuar incerta |
| Leitura e compreensão | 45 | 45 | **90** | Referência correta a texto, idioma e nível; compreensão livre exige análise humana |
| Gramática | 45 | 45 | **90** | Verificar relação entre enunciado, unidade e resposta prevista |
| Testes | 35 | 35 | **70** | Não confundir acerto pontual com domínio ou nível CEFR |
| **Total** | **237** | **237** | **474** | **IDs históricos inalterados** |

A inspeção cruzada encontrou **zero** grupos de enunciado+gabarito idênticos, **zero** alternativas literalmente equivalentes após normalização efetiva, **zero** exercícios sem gabarito/explicação, **zero** referências de unidades inválidas e **zero** explicações genéricas de escrita que usam o antigo aviso `Outras traduções podem ser válidas`.

São achados técnicos: **zero erros estruturais não é o mesmo que zero erros linguísticos**.

## 2. Defeitos e ajustes de qualidade feitos nesta rodada

| ID | Problema verificado | Correção implementada |
| --- | --- | --- |
| `ru-writing-074` | O enunciado `Meu colega de trabalho fala russo` tinha só a forma `говорит по-русски`, embora `говорит на русском языке` seja uma formulação natural no mesmo registro de pessoa e sentido | Adicionada a variante completa `Мой коллега говорит на русском языке.`; **não** incluída a forma feminina `моя коллега` porque o enunciado especifica `meu colega` |
| `ru-writing-084` | `Sua resposta está correta` só aceitava possessivo de tratamento `Ваш`, sem contexto exigindo registro formal | Aceitas `Твой ответ правильный.` e `Твой ответ верный.`; explicação compara `Ваш` e `твой` |
| `ru-writing-097` | `Pode me mostrar no mapa?` só aceitava `Можете`/tratamento formal; não havia registro obrigatório no enunciado | Aceita `Можешь показать мне на карте?` como variante informal singular |
| `en-listening-018` | A explicação de `parents` pressupunha `mãe e pai`, embora não se possa inferir a composição familiar apenas da palavra | Explicação atualizada para `pais ou responsáveis parentais`, sem alterar respostas antigas |
| `ru-listening-018` | A glosa de `родители` fazia pressuposição equivalente | Explicação contextualizada, distinguindo `родители` e `родственники` |

**Quatro alternativas completas** foram acrescentadas aos 104 exercícios de escrita; dois feedbacks de Listening foram esclarecidos. Os ajustes estão versionados **simultaneamente** no manifesto de decisões editoriais e nos catálogos finais, mantendo a geração determinística.

## 3. Qualidade das modalidades e limites identificados

**Escrita/tradução:** as 104 atividades já tinham feedback individualizado por estrutura desde as revisões anteriores. A normalização deliberadamente não aceita qualquer tradução aproximada: respostas não cadastradas são `uncertain`, não `incorrect`, na `evaluateExerciseAnswer`. O risco remanescente é o de **falsos negativos de reconhecimento**: uma frase correta pode não estar na lista. Não resolver isso adicionando variantes especulativas nem automatizando avaliação semântica a partir de distância textual.

**Leitura e gramática:** as 90 perguntas de leitura apontam para 30 textos (15 por idioma), e as 90 de gramática estão vinculadas às 30 lições correspondentes, com três questões por unidade. A primeira e a segunda revisão anteriores corrigiram ambiguidades documentadas; a inspeção nesta rodada não encontrou defeito textual incontroverso adicional que justifique reescrever os textos. Algumas leituras antecipam gramática de outras etapas, conforme [auditoria curricular A1–B1](./learn-a1-b1-curricular-audit-2026-11-13.md). Não usar a classificação A1/A2/B1 como prova de dificuldade aferida.

**Listening e ditado legado:** os 120 exercícios possuem transcrição/texto para geração de fala no dispositivo. Isso **não constitui arquivo de áudio homologado**; questões auditivas sem gravação validada não devem contar como acertos ou evidência de proficiência. V13/V14/V19 têm fluxos privados separados, não somados à base de 474.

**Testes:** 70 questões (35 por idioma) funcionam como prática pontual; não são amostra psicométrica ou certificação de proficiência. Perguntas semelhantes em modalidades distintas podem ser prática de reforço; apenas duplicações **exatas** do mesmo enunciado/gabarito foram tratadas como regressão automatizada.

**Russo:** o código conserva `ё` e `е` distintos por padrão e não converte casos, aspecto, número e gênero sem política específica. `Мой коллега` foi mantido no masculino por fidelidade ao enunciado de origem; formas com `твой` e `можешь` foram aceitas apenas onde o texto português não fixa o tratamento.

## 4. Barreiras automáticas acrescentadas

- `scripts/learn/audit-exercise-quality-v21.mjs` percorre **todos os 474 IDs**, coteja idioma, habilidade e nível com o inventário congelado, valida respostas, ausência de duplicatas após normalização, feedback, referências, três questões por lição/leitura, disponibilidade textual das 120 tarefas auditivas e gates de publicação;
- âncoras editoriais impedem que as variantes contextualizadas de `ru-writing-074/084/097` e as glosas parentais de Listening desapareçam em uma futura regeneração;
- `frontend/tests/learn-quality-v21.spec.ts` verifica aceitação das novas variantes e manutenção de resultados **incertos** para respostas de escrita não cadastradas, além de manter `ё/е` distintas sem autorização;
- `quality-baseline.json` fixa em **zero** o máximo de explicações genéricas para os 52 itens de escrita por idioma, em vez de tolerar as 40 antigas;
- `scripts/learn/check-catalog-determinism.mjs` foi corrigido para mostrar diferenças sem falhar ao tentar interpretar objetos em memória como caminhos de arquivos;
- o CI `learn-exercise-quality-v21.yml` valida estrutura, geração determinística, respostas, build e regressão.

Os checks de GitHub são a evidência da **execução** dessas regras; este relatório sozinho não atesta aprovação de CI nem deploy.

## 5. Pendências que uma auditoria interna não elimina

1. **Parecer pedagógico independente** por idioma, incluindo naturalidade das 474 questões e aceitabilidade regional das respostas livres, com versão/assinatura ou hash do material.
2. **Piloto com estudantes** para medir ambiguidades reais, taxa de respostas corretas rejeitadas como incertas, dificuldades por etapa e qualidade do feedback.
3. **Escuta e aprovação** das gravações privadas V13/V14/V19 antes de qualquer alegação de desempenho auditivo; as 120 tarefas do legado permanecem exercícios com voz sintética não homologada.
4. **Usabilidade, acessibilidade e layout mobile** em dispositivos reais; este parecer trata a qualidade textual e a lógica de correção, não a UX.
5. **Homologação integrada e autorização pública** separadas, após verificar o build oficial e cumprir os gates humanos.

**Decisão editorial:** a triagem e as correções técnicas desta rodada podem ser integradas mantendo todas as IDs, versões e histórico; **não aprova formalmente proficiência nem substitui avaliação externa**.
