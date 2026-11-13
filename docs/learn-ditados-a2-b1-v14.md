# 2T Learn V14 — Ditados A2/B1 (Inglês e Russo)

**Estado:** material editorial, sujeito à homologação linguística, pedagógica e de áudio. `publicRelease: false`. **Não há áudios gerados ou homologados.** Nenhum ditado V14 deve aparecer para estudantes nem ser usado como evidência certificadora de proficiência CEFR.

## 1. Escopo

São **32 ditados inéditos**, 16 por idioma, distribuídos em 8 A2 e 8 B1 para cada idioma. Cada ditado contém transcrição canônica, objetivo pedagógico, segmentação de apoio **apenas para o professor**, anotação dos elementos essenciais para a correção, variantes ortográficas explícitas, vínculo curricular provisório à trilha V12 e sinalização de revisão pendente.

| Idioma | A2 | B1 | Total |
| --- | ---: | ---: | ---: |
| Inglês | 8 | 8 | 16 |
| Russo | 8 | 8 | 16 |
| **Total** | **16** | **16** | **32** |

Arquivos: [ditados EN](./learn-ditados-v14-en.json), [ditados RU](./learn-ditados-v14-ru.json); validador estrutural: `scripts/learn/validate-dictation-v14.mjs`.

A V14 é independente da [V13, pacote de Listening em revisão](./learn-listening-a2-b1-v13.md), que está no PR #118, e das 24 atividades-ponte V11 em revisão (PR #116). Não é obrigatório integrar esses PRs antes de continuar o planejamento técnico, mas as propostas permanecem sujeitas à homologação independente.

**Preservações:** nenhum dos **474 exercícios legados**, backups v1–v3, IndexedDB ou progressão guiada V12 é modificado. Ditados V14 não contam automaticamente como progresso, conclusão de etapa ou domínio demonstrado.

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

## 3. Produção e homologação do áudio (etapa posterior)

- Revisão independente das **32 transcrições** por especialistas em cada idioma, incluindo naturalidade, casos, conjugação, prosódia e adequação linguística.
- Para cada item, gravar ou sintetizar um áudio com direitos de uso/hospedagem claros; TTS não substitui revisão do **arquivo final**.
- Produzir uma **primeira audição integral** em velocidade adequada ao nível; segmentação e repetição somente como recursos pedagógicos/auditivos claramente indicados. Evitar síntese desnaturalmente lenta ou sobre-articulada. Se houver reprodução segmentada, assegurar que os trechos não mudam a pronúncia e o sentido da gravação integral.
- Verificar pronúncia de `-ed`, diferenciação `did not`, conectivos e marcação temporal no Inglês; no Russo, tonicidade, redução vocálica, finais de caso, `ё` e vozeamento.
- Na execução do aluno, mostrar somente instrução, player e campo de resposta; o texto correto só deve ser exibido depois da avaliação/revisão apropriada.
- Testar interface móvel, teclado cirílico, acessibilidade, velocidade/pausas, repetição, falha de áudio e comportamento off-line definido pelo produto; não adicionar tentativas ao histórico se não houver áudio efetivamente reproduzido.
- Realizar piloto com alunos, revisão de erros recorrentes e ajuste de dificuldades antes da publicação; não inferir níveis CEFR de scores de ditado.

### Checklist de saída

- [ ] Revisão docente independente dos 32 roteiros, variantes, alinhamento e critérios.
- [ ] Áudio autorizado, produzido, auditado e vinculado ao item correspondente.
- [ ] Teste real com transcrições ocultas e sem vazamento de gabaritos.
- [ ] Correção contextual (morfologia, negação, variantes ortográficas) validada.
- [ ] Acessibilidade, dispositivos móveis e restauração de progresso testadas.
- [ ] Ativação de flag e publicação decididas explicitamente, após homologação.

## 4. Status do GitHub

Este PR deve ser mantido **draft editorial**. Integração futura pelo Codex deve preservar o catálogo e os históricos existentes, manter a V12 em modo de prévia e impedir a liberação das propostas V11/V13/V14 sem revisão.

## Revisão interna V18 e fluxo de liberação sem equipe externa

**Escopo revisado em 12/11/2026:** 32 ditados. A revisão feita neste projeto por ChatGPT é **editorial interna**; não houve parecer linguístico independente, validação com turma, certificação CEFR nem revisão de gravação inexistente.

**Equipe real:** ChatGPT prepara e revisa editorialmente, Codex implementa e testa, e o dono do site decide o aceite e a publicação. Não existe obrigação de contratar especialistas externos para oferecer **prática pessoal não certificadora**; revisão externa só seria necessária se o projeto quisesse alegar validação independente ou classificação formal de proficiência.

O dono precisa conferir cada áudio e suas transcrições em inglês e russo; variantes desconhecidas seguem `uncertain` e não erro automático. Sem gravações de voz, não há ditado auditivo aplicável.

**Controle de publicação:** não alterar `publicRelease:false` nem expor materiais de draft só porque a revisão textual foi concluída. O aceite explícito do dono, testes de integração, revisão dos áudios aplicáveis e verificações de produção continuam pendentes. Status: **revisão interna concluída; liberação ainda não autorizada**.
