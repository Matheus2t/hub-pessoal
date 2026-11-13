# 2T Learn V14 — Ditados A2/B1 (Inglês e Russo)

**Estado em 13/11/2026:** revisão editorial interna consolidada e implementação V14 integrada à `main` no PR #145, **somente para prévia local autenticada**, `publicRelease: false`. Os **32 MP3s privados foram produzidos e inspecionados tecnicamente** pela V19, mas **nenhum recebeu aprovação humana de escuta, nem está liberado publicamente**. Os campos `audioStatus` e `audioProductionStatus` dos JSONs registram o estágio histórico de **origem editorial**, não o inventário atual das gravações. Nenhum ditado V14 pode gerar evidência de proficiência CEFR ou nota de competência sem nova homologação.

## 1. Escopo

São **32 ditados inéditos**, 16 por idioma, distribuídos em 8 A2 e 8 B1 para cada idioma. Cada ditado contém transcrição canônica, objetivo pedagógico, segmentação de apoio **apenas para o professor**, anotação dos elementos essenciais para a correção, variantes ortográficas explícitas, vínculo curricular provisório à trilha V12 e sinalização de revisão pendente.

| Idioma | A2 | B1 | Total |
| --- | ---: | ---: | ---: |
| Inglês | 8 | 8 | 16 |
| Russo | 8 | 8 | 16 |
| **Total** | **16** | **16** | **32** |

Arquivos: [ditados EN](./learn-ditados-v14-en.json), [ditados RU](./learn-ditados-v14-ru.json); validador estrutural: `scripts/learn/validate-dictation-v14.mjs`.

A V13 [teve seu PR editorial #118 integrado](https://github.com/Matheus2t/hub-pessoal/pull/118). A V11 oferece **20 atividades não auditivas** de prática, com quatro roteiros auditivos aguardando aprovação; a V14 é independente dessas duas trilhas. A V14 técnica já foi integrada à `main` pelo [PR #145](https://github.com/Matheus2t/hub-pessoal/pull/145), e a proteção V16/V17 do bundle público pelo [PR #147](https://github.com/Matheus2t/hub-pessoal/pull/147).

**Preservações:** os **474 exercícios legados** e a progressão V12 foram preservados; a implementação técnica adicionou registros `v14:en`/`v14:ru` ao IndexedDB v3 sem quebrar os backups v1–v3. Tentativas V14 permanecem `uncertain` e não comprovam conclusão de nível, domínio ou proficiência. A reconciliação editorial #119 **não modifica os JSONs**, seus IDs ou seus blobs Git, porque a cadeia de proveniência dos MP3s técnicos V19 aponta para esses blobs.

## 2. Critérios pedagógicos e limites

A divisão A2/B1 é um **planejamento curricular** alinhado, em termos amplos, às habilidades descritas no [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions), especialmente recepção oral e controle ortográfico. **Ditado combina percepção auditiva com escrita; seu acerto isolado não comprova compreensão oral, produção espontânea nem proficiência A2/B1.**

- **A2:** um enunciado curto, vocabulário cotidiano, perguntas, local, rotina, posse, negação, números e passado simples / presente verbal em contextos previsíveis. Verificar escuta de palavras funcionais e reconhecimento básico de formas.
- **B1:** encadeamento de informações, conectivos, razões, estruturas de tempo passado/composto e, no Russo, formas de caso, aspecto verbal e deslocamento. O item exige perceber como partes da fala se relacionam. O rótulo B1 não substitui validação com estudantes e docentes.
- O professor precisa conferir se qualquer vocabulário ou estrutura aparece antes na trilha; em especial, **ru-dict-v14-08** antecipa um exemplo lexical com `нет + genitivo` no A2, que pode exigir apresentação guiada antes de ser adequado.

### Correção de transcrição

1. A resposta esperada é **o que foi falado no idioma-alvo**, não tradução, paráfrase ou resposta de compreensão em português.
2. Variantes automáticas devem ser **explicitamente autorizadas** na rubrica do item; ignorar só espaços excedentes, pontuação final e capitalização quando não alterarem a identidade lexical.
3. No Inglês, variantes ortográficas convencionais como `cancelled/canceled` são aceitas quando listadas; contrações e expansões não devem ser equivalentes sem verificação do áudio.
4. No Russo, `ё/е` é frequentemente uma variação ortográfica legítima, mas **não substituir automaticamente em todos os contextos** porque algumas distinções semânticas dependem da forma; há alternativas autorizadas para `неё` e `шёл`. Outras são avaliadas por humano ou marcadas `uncertain`.
5. Números por extenso vs. algarismos (`three/3`, `две/2`) só podem receber equivalência direta quando a **forma completa** alternativa estiver explicitada no arquivo.
6. Uma diferença de negação, sujeito, marcador temporal, flexão gramatical ou verbo pode mudar o sentido e exige análise específica; não usar similaridade de strings como comprovação de acerto.
7. O corretor automático deve classificar **apenas casos previstos e validados**; caso contrário, marcar `uncertain` ou encaminhar para avaliação humana, sem declarar erro com base somente na não coincidência literal.
8. Dar feedback de fonética/ortografia depois da tentativa. Não exibir a transcrição, as pistas de segmentação ou o gabarito antes da escuta no modo avaliativo.

## 3. MP3s produzidos privadamente; homologação auditiva ainda pendente

- Revisão independente das **32 transcrições** por especialistas em cada idioma, incluindo naturalidade, casos, conjugação, prosódia e adequação linguística.
- Os 32 MP3s já foram sintetizados/gerados e auditados tecnicamente no inventário **privado V19** (IDs, SHA-256, formato e integridade). **Ainda faltam** autorização/licenciamento para o contexto de distribuição, escuta do arquivo final, conferência de roteiro, pronúncia, inteligibilidade e naturalidade. A geração técnica não equivale à aprovação sonora.
- Produzir uma **primeira audição integral** em velocidade adequada ao nível; segmentação e repetição somente como recursos pedagógicos/auditivos claramente indicados. Evitar síntese desnaturalmente lenta ou sobre-articulada. Se houver reprodução segmentada, assegurar que os trechos não mudam a pronúncia e o sentido da gravação integral.
- Verificar pronúncia de `-ed`, diferenciação `did not`, conectivos e marcação temporal no Inglês; no Russo, tonicidade, redução vocálica, finais de caso, `ё` e vozeamento.
- Na execução do aluno, mostrar somente instrução, player e campo de resposta; o texto correto só deve ser exibido depois da avaliação/revisão apropriada.
- Testar interface móvel, teclado cirílico, acessibilidade, velocidade/pausas, repetição, falha de áudio e comportamento off-line definido pelo produto; não adicionar tentativas ao histórico se não houver áudio efetivamente reproduzido.
- Realizar piloto com alunos, revisão de erros recorrentes e ajuste de dificuldades antes da publicação; não inferir níveis CEFR de scores de ditado.

### Checklist de saída

- [ ] Revisão docente independente dos 32 roteiros, variantes, alinhamento e critérios.
- [x] Gravações privadas produzidas e vinculadas tecnicamente aos 32 IDs; não publicadas.
- [ ] Revisão auditiva, origem/licença e aceite humano de cada arquivo.
- [x] Testes técnicos de ocultação dos gabaritos, servidor local com sessão, restrição de origem e build público sem materiais V14.
- [ ] Teste real com alunos, escuta humana e transcrições ocultas no dispositivo final.
- [x] Normalização conservadora, variantes completas explícitas e `uncertain` técnico implementados.
- [ ] Aceite pedagógico externo da interpretação das respostas em avaliações reais.
- [x] Testes automatizados de mobile, entrada cirílica, prévia e persistência/backup executados na integração técnica.
- [ ] Homologação de usabilidade com pessoas e dispositivos reais.
- [ ] Ativação de flag e publicação decididas explicitamente, após homologação.

## 4. Status do GitHub

O [PR técnico #145](https://github.com/Matheus2t/hub-pessoal/pull/145) já incorporou as mesmas 32 fontes editoriais à `main`. O **PR editorial #119** é encerrado como reconciliação de documentação e contrato de regressão sobre a `main` atualizada: não deve reintroduzir o validador antigo nem gerar novas cópias dos roteiros. Os 474 IDs existentes permanecem intactos; V12/V14 continuam restritos às suas prévias previstas. Nenhum merge editorial autoriza liberação aos estudantes.

## Revisão interna V18 e fluxo de liberação sem equipe externa

**Escopo revisto em 12–13/11/2026:** 32 ditados conferidos em leitura editorial interna, com contrato de referência cruzada ao V12. A revisão feita por ChatGPT **não é parecer linguístico nativo independente**; não houve validação com turma nem certificação CEFR. **Há MP3s privados tecnicamente verificados**, mas não ouvidos/aprovados nesta revisão.

**Equipe real:** ChatGPT prepara e revisa editorialmente, Codex implementa e testa, e o dono do site decide o aceite e a publicação. Não existe obrigação de contratar especialistas externos para oferecer **prática pessoal não certificadora**; revisão externa só seria necessária se o projeto quisesse alegar validação independente ou classificação formal de proficiência.

O dono precisa ouvir cada MP3 final e conferir sua correspondência com a transcrição em inglês ou russo, a articulação de formas protegidas, a naturalidade, as variantes e os termos de uso. Respostas não reconhecidas seguem `uncertain`, não erro automático. Sem áudio aprovado, a atividade permanece **prática privada não avaliativa**.

**Controle de publicação:** não alterar `publicRelease:false` nem expor materiais de draft só porque a revisão textual foi concluída. O aceite explícito do dono, testes de integração, revisão dos áudios aplicáveis e verificações de produção continuam pendentes. Status: **revisão interna concluída; liberação ainda não autorizada**.

## 5. Reconciliação editorial final #119 (13/11/2026)

O relatório [learn-v14-final-editorial-review-2026-11-13.md](./learn-v14-final-editorial-review-2026-11-13.md) registra a verificação **individual dos 32 itens**: objetivo, idioma, nível proposto, etapa curricular verdadeira, transcrição, variantes, negação/tempo/casos e limites dos áudios. Não se constatou divergência de ID ou de texto entre os blobs editoriais do PR #119 e os usados no PR #145.

**Ressalvas pedagógicas contextualizadas:** (1) o `ru-dict-v14-08` usa `нет + genitivo` antes do ensino formal do caso; fornecer apoio lexical, sem reclassificação automática; (2) `ru-dict-v14-04` contém `ближайшая`, forma lexical a antecipar com glossário; (3) `ru-dict-v14-07` adiciona concordância neutra além da conjugação central da etapa; e (4) `en-dict-v14-16` tem duas frases relacionadas e duração maior, adequada como desafio B1, não como critério isolado de nível. Esses pontos não são prova de erro gramatical nem justificam alterar transcrições após a geração de áudio.

**Regra de fonte imutável:** os arquivos `docs/learn-ditados-v14-en.json` e `docs/learn-ditados-v14-ru.json` não foram regravados. A V19 usa SHA do blob para garantir que o MP3 veio exatamente do roteiro fixado. Se algum roteiro precisar de correção futura, será necessária nova versão editorial, regeneração de áudio, verificação de integridade e nova escuta, nunca mutação silenciosa.

**Decisão:** revisão editorial interna **concluída para prévia local**; revisão linguística independente e homologação auditiva/publicação **não concluídas**. Preservar `publicRelease:false`, avaliação desabilitada e autenticidade local até as aprovações reais.
