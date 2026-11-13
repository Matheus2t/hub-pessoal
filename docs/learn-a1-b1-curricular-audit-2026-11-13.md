# 2T Learn — auditoria curricular A1–B1 (13/11/2026)

**Escopo:** inglês (EN) e russo (RU), 15 etapas de estudo por idioma na V10/V12, suas lições e leituras reais, seis questões por etapa e transição para prática formativa V17. **Não altera V14**, que segue com o Codex. Não altera IDs, gabaritos, traduções, textos legados, niveis declarados, histórico ou backups.

**Decisão editorial:** sequência-base preservada e **30 alertas de pareamento individualizados** na fonte `docs/learn-progressao-a1-b1-v10.json` e no manifesto da prévia `frontend/public/learn/progression-v12.json`. A V12 já exibe o alerta no painel expansível "Sobre o pareamento desta etapa". O alerta deixa de ser genérico e orienta o apoio antes de exigir produção autônoma. Estes avisos são **apoio didático**, não correção da leitura nem certificado de domínio.

## 1. Rastreabilidade do currículo atual

| Indicador auditado | Inglês | Russo | Total |
| --- | ---: | ---: | ---: |
| Etapas A1 | 4 | 4 | 8 |
| Etapas A2 | 6 | 6 | 12 |
| Etapas B1 | 5 | 5 | 10 |
| Etapas curriculares | 15 | 15 | **30** |
| Questões de gramática vinculadas | 45 | 45 | 90 |
| Questões de leitura vinculadas | 45 | 45 | 90 |
| Exercícios legados preservados | 237 | 237 | **474** |

O cotejo dos **180 vínculos** de questão não encontrou referência inexistente, questão de outro idioma, nível ou unidade, nem reutilização de ID dentro da trilha. As etapas seguem a ordem 4 A1 → 6 A2 → 5 B1; os pré-requisitos são sugestões sequenciais e não bloqueios de acesso. Esses resultados demonstram **integridade de mapeamento**, não alinhamento pedagógico de conteúdo.

## 2. Achados e ajustes prioritários

| Etapa | Achado baseado no texto real | Tratamento incluído na prévia |
| --- | --- | --- |
| `ru-path-01` (A1, cirílico) | `ru-reading-01` já contém movimento `едет/идёт` e a finalidade `чтобы они не промокли`, estruturas além de identificar letras | Apresentar leitura com glossário e apoio, sem cobrá-la como requisito de entrada A1 |
| `ru-path-04` (A1, plural) | `ru-reading-04` contém `к бабушке` (dativo) e `чтобы`, antes das etapas de casos B1 | Praticar plurais em frases selecionadas, sem avaliar dativo/movimento |
| `en-path-01` (A1, *be*) | `en-reading-01` contém `works`, `while` e `is raining`; Present Continuous só será sistematizado em `en-path-09` | Separar leitura compreensiva com apoio da verificação independente de *be* |
| `en-path-03` (A1, artigos) | `en-reading-03` contém `do not`, que só ganha ensino formal na etapa A2 `en-path-05` | Trabalhar `a/an/the` em exemplos próprios e não exigir domínio de `do not` |
| `en-path-06` (A2, posse) | `en-reading-06` usa `is writing` e orações temporais em vez de praticar prioritariamente possessivos | Acrescentar exemplos de posse; oferecer glossário para a leitura |
| `en-path-10` (A2, passado simples) | `en-reading-10` narra a história no **presente** (`Amir notices`, `he asks`), portanto não ilustra a estrutura central da lição | Exigir um relato separado sobre ontem para trabalhar passado simples e `did not` |
| `en-path-11` (B1, Present Perfect) | `en-v2-reading-001` usa narrativas passadas, inclusive `had become`, em vez de uma demonstração inequívoca de present perfect | Acrescentar contrastes cronológicos com experiência presente e fato datado |
| `ru-path-08` (A2, perguntas) | `ru-reading-08` inclui `без письменного стола` (genitivo) e comparação, embora o genitivo seja sistematizado em B1 | Perguntas curtas `кто/где/когда` como saída da etapa; leitura global com apoio |
| `ru-path-13` (B1, dativo) | A leitura `ru-v2-reading-003` é uma viagem narrativa, sem prática suficiente de `мне/тебе/сестре` | Introduzir cenário próprio de destinatário e experienciador |
| `ru-path-14` (B1, instrumental) | `ru-v2-reading-004` é sobre estudo, não exemplifica claramente profissão/instrumental | Acrescentar `работаю врачом` e `говорю с другом` |
| `en-path-15` (B1, Past Continuous) | `en-v2-reading-005` descreve iluminação e eventos no passado simples, não a interrupção de uma ação no passado contínuo | Criar narrativa de interrupção separada, sem reclassificar o texto |
| `ru-path-15` (B1, movimento) | `ru-v2-reading-005` trata de lâmpadas e energia, não distingue deslocamento habitual e atual | Trabalhar `идти/ходить` e `ехать/ездить` em um novo contexto de viagem |

**Outras 18 etapas:** foram conferidas e receberam orientações individuais de gramática, contexto, vocabulário e/ou leitura no campo `linkingCaveat`. A divergência de assunto entre lição e leitura não deve ser interpretada automaticamente como erro: a leitura pode servir como **material complementar**, contanto que o aluno não seja avaliado sobre uma estrutura ainda não ensinada.

## 3. Diagnóstico pedagógico por idioma

**Inglês:** a sequência formal *be → pronomes → artigos → presente simples → do/does → posse/preposições → there is/are → presente contínuo → passado simples → estruturas B1* é defensável como roteiro introdutório. A principal fragilidade não é a ordem dos nomes das lições, mas **usar a leitura emparelhada por posição como se cobrisse o mesmo objetivo**. Algumas leituras A1 trazem formas A2; as leituras B1 nem sempre demonstram a gramática B1 da etapa. O acompanhamento deve distinguir compreensão de leitura, reconhecimento gramatical e produção em contexto novo.

**Russo:** o percurso *cirílico/pronomes/gênero/plural → posse/presente/negação/perguntas/acusativo/números → aspecto/genitivo/dativo/instrumental/movimento* é uma sequência de tópicos, mas **não é uma garantia de que os textos A1 contenham apenas estruturas A1**. As quatro primeiras leituras já recorrem a casos, subordinadas e verbos ainda não sistematizados. **Não exigir domínio dessas construções para concluir o estudo inicial**; expor glossários, fragmentos acessíveis e exemplos novos com os alvos da etapa.

**Ambos:** as leituras B1 são relativamente curtas e suas questões legadas tendem a recuperar fatos explícitos. Isso não basta para afirmar inferência, síntese, escrita independente, compreensão oral ou interação B1. V16/V17 acrescentam propostas formativas, mas permanecem sem validação externa e sem classificação certificada.

## 4. Garantias e validação automatizada

O script `scripts/learn/validate-curriculum-a1-b1-v20.mjs` verifica:

- integridade da projeção V10 → V12, 15 etapas por idioma e pré-requisitos anteriores;
- existência, idioma, nível e identidade de cada lição/leitura;
- correspondência das seis questões com **a unidade de origem real**, inclusive `exercise.unitId`, `skill`, `language` e `level`;
- 90 IDs distintos por idioma, 474 exercícios preservados, avisos individualizados em todas as 30 etapas;
- marcos textuais que motivam alertas de antecipação de conteúdo;
- `publicRelease:false`, `cefrCertified:false` e estágio não publicado.

O workflow `learn-a1-b1-curricular-audit.yml` executa o validador, o contrato V12/V17, checagem de TypeScript e build quando o currículo mudar. **Esses testes detectam vínculos quebrados e regressões de avisos; não determinam se um texto é linguística ou pedagogicamente adequado ao nível.**

## 5. Próximas decisões (não executadas nesta auditoria)

1. **Revisão didática externa e piloto:** confirmar o grau real de apoio necessário para as leituras A1, em especial russo, e o resultado com aprendizes.
2. **Preparar materiais-ponte complementares:** em vez de reclassificar o legado, criar tarefas curtas de compreensão e produção com novos IDs, critérios e respostas incertas quando necessário. Não há autorização para publicar materiais novos nesta revisão.
3. **Avaliação comunicativa:** utilizar tarefas contextualizadas V16/V17 aprovadas; questões de gramática e leitura de V12 contam apenas como estudo registrado.
4. **Áudio:** V13/V14/V19 só podem contar como evidência auditiva após revisão humana do arquivo real, licenças e autorização explícita.
5. **Integração V14:** aguardar a finalização técnica do Codex para revisar os ditados e os vínculos de uma vez, sem conflitos no trabalho em andamento.

**Status:** auditoria curricular interna e orientações de prévia prontas; nenhum exercício público renomeado, nenhuma conclusão de nível concedida e nenhuma atividade privada liberada a estudantes.
