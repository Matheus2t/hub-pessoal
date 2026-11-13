# 2T Learn — parecer editorial interno final V14 (13/11/2026)

**Natureza:** leitura e revisão editorial interna dos 32 textos de ditado da V14, cruzadas com a sequência V12 e com o contrato da integração técnica #145. Não houve escuta humana de arquivo, revisão por especialista independente nem piloto com aluno. **Este parecer não atesta competência CEFR nem libera publicação**.

## 1. Integridade editorial e técnica

| Controle | Evidência | Resultado |
| --- | --- | --- |
| Inventário | 16 scripts EN (8 A2/8 B1) + 16 RU (8 A2/8 B1) | 32/32 presentes |
| IDs e chaves | `en-dict-v14-01..16` e `ru-dict-v14-01..16` | Únicos e estáveis |
| Vínculo curricular | Cada `linkedStageNodeId` existe na V12 do mesmo idioma e tem nível coerente | Sem vínculo incompatível observado |
| Texto canônico | Inspeção de transcrições, segmentação, elementos protegidos, sujeito, negação, flexões e conectores | Sem erro gramatical evidente identificado nesta revisão textual |
| Variantes | EN: 6; RU: 6 alternativas explícitas completas | 12 registradas; nenhuma conversão global `ё/е`, numérica ou de contrações |
| Exercícios legados | Fontes V14 não substituem os 474 IDs de exercícios do catálogo | Preservados |
| Áudio V19 | PR #145 documenta auditoria técnica de 32 arquivos privados, com hashes e metadados | **Aprovação auditiva humana pendente** |
| Comparação do PR #119 com `main` | Blobs editoriais EN/RU têm SHA idêntico aos já integrados no PR #145 | **Não regravar fontes, para preservar pin de origem dos MP3s** |
| Estados públicos | `publicRelease:false`, revisão de professor pendente, avaliação auditiva desabilitada | Preservados |

**Risco importante:** os campos `audioStatus:no_audio_produced_or_reviewed` e `audioProductionStatus:script_only_no_audio` são **fotografia histórica do pacote editorial**. A existência dos MP3s privados está registrada no [relatório técnico V14](./learn-dictation-v14-implementation.md). Alterar esses campos dentro dos JSONs trocaria o hash de origem de que depende a validação V19, sem tornar o áudio aprovado.

## 2. Inglês — análise item a item

| ID | Nível | Etapa V12 | Competência proposta | Critério e observação editorial |
| --- | --- | --- | --- | --- |
| `en-dict-v14-01` | A2 | `en-path-05` | Pergunta `do` e sujeito plural | Preservar `Do` e não acrescentar `-s` a `work` |
| `en-dict-v14-02` | A2 | `en-path-06` | Possessivos e objeto plural | Preservar `her`, `keys` e `keeps`; não confundir com `his` |
| `en-dict-v14-03` | A2 | `en-path-07` | Referências de lugar e tempo | Preservar `outside`, `on Friday morning` |
| `en-dict-v14-04` | A2 | `en-path-08` | `There are` e número | Variante completa `three/3` explicitamente registrada |
| `en-dict-v14-05` | A2 | `en-path-09` | Presente contínuo | Preservar `am waiting`; não aceitar tempo simples por equivalência |
| `en-dict-v14-06` | A2 | `en-path-10` | Passado simples | Preservar final `-ed` e marcador `last weekend` |
| `en-dict-v14-07` | A2 | `en-path-07` | Horário, oposição e negação | Três variantes completas para seis/sete; manter `not` e a ordem |
| `en-dict-v14-08` | A2 | `en-path-10` | Passado negativo e causa | Preservar `did not take` e `because`; `it` remete ao ônibus/contexto |
| `en-dict-v14-09` | B1 | `en-path-11` | Experiência/duração no Present Perfect | Preservar `have lived`, `for`; variante `three/3` |
| `en-dict-v14-10` | B1 | `en-path-12` | First Conditional | `if` + presente, consequência `will`; nenhum sinônimo automático |
| `en-dict-v14-11` | B1 | `en-path-13` | Passiva e justificativa | `was cancelled`/`was canceled` explícito; manter `was closed` |
| `en-dict-v14-12` | B1 | `en-path-14` | Oração relativa identificadora | Preservar `who` e o passado `gave` |
| `en-dict-v14-13` | B1 | `en-path-15` | Past Continuous interrompido | Preservar `was checking`, `when`, `went out` |
| `en-dict-v14-14` | B1 | `en-path-11` | Experiência negativa e concessão | `never` e `although` não podem desaparecer |
| `en-dict-v14-15` | B1 | `en-path-12` | Condição com modal | `can` é possibilidade, não obrigação; preservar today/tomorrow |
| `en-dict-v14-16` | B1 | `en-path-15` | Duas frases relacionadas | Preservar `were waiting`, `announced`, `sent`; extensão deve ser testada na escuta |

## 3. Russo — análise item a item

| ID | Nível | Etapa V12 | Competência proposta | Critério e observação editorial |
| --- | --- | --- | --- | --- |
| `ru-dict-v14-01` | A2 | `ru-path-05` | Possessivos e gênero | `моя новая` versus `мой старый`; concordância essencial |
| `ru-dict-v14-02` | A2 | `ru-path-06` | Rotina presente | `читаю` e `после работы`; caso lexical recebe apoio |
| `ru-dict-v14-03` | A2 | `ru-path-07` | Negação e contraste | `не` imprescindível; não inverter café e chá |
| `ru-dict-v14-04` | A2 | `ru-path-08` | Pergunta de localização | `ближайшая` pode exigir glossário; preservar concordância |
| `ru-dict-v14-05` | A2 | `ru-path-09` | Objeto direto e lugar | `хлеб и молоко`, `покупаю`, `в магазине` |
| `ru-dict-v14-06` | A2 | `ru-path-10` | Numerais e genitivo | Três variantes 2/5; diferenciar `две книги` e `пять карандашей` |
| `ru-dict-v14-07` | A2 | `ru-path-06` | Presente e substantivo neutro | `пишет` e `короткое письмо`; concordância é apoio adicional |
| `ru-dict-v14-08` | A2 | `ru-path-07` | Negação de existência | `нет урока` antecipa genitivo B1; apoio lexical necessário |
| `ru-dict-v14-09` | B1 | `ru-path-11` | Aspecto verbal | Contraste `писал/написал` e conectivo `а` |
| `ru-dict-v14-10` | B1 | `ru-path-12` | Genitivo e tempo | `нет свободного времени`; hoje versus amanhã |
| `ru-dict-v14-11` | B1 | `ru-path-13` | Dativo e explicação | `мне`, `сестре`, `потому что`; variante explícita `неё/нее` |
| `ru-dict-v14-12` | B1 | `ru-path-14` | Instrumental de profissão e interlocutor | `врачом`, `с пациентами`; sem equivalência automática de casos |
| `ru-dict-v14-13` | B1 | `ru-path-15` | Movimento habitual/atual | Contraste `езжу/иду`, oposição `но` |
| `ru-dict-v14-14` | B1 | `ru-path-11` | Aspecto e duração | `смотрели/досмотрели`; variante numérica `два/2` |
| `ru-dict-v14-15` | B1 | `ru-path-12` | Genitivo após `после` | `после отмены поезда`; revisar semanticamente `ждали новой информации` |
| `ru-dict-v14-16` | B1 | `ru-path-15` | Movimento, passado e consequência | `шёл`/`шел` explícito; `начался` e `вернулся` |

## 4. Pontos de atenção pedagógica

**1. `ru-dict-v14-08` (A2):** `нет урока` contém genitivo antes da etapa formal de caso B1. Tratar como construção lexical contextualizada e oferecer exemplo de apoio; não usar a falta de domínio do genitivo como evidência contra o aluno A2.

**2. `ru-dict-v14-04` e `ru-dict-v14-07`:** `ближайшая` e `короткое письмо` adicionam vocabulário/concordância ao objetivo principal. Isso é aceitável como ditado contextualizado com preparação, mas deve ser verificado com aprendizes.

**3. `en-dict-v14-16`:** duas frases, vários eventos e conectores aumentam a demanda de memória de trabalho. Registrar como prática B1 com possibilidade de repetição; não confundir desempenho de ditado com fluência B1.

**4. Variantes de audição:** a aceitação de `canceled/cancelled`, `ё/е` e números por extenso está restrita a **formas completas explicitamente listadas**, não normalização geral. Contrações/expansões como `didn't/did not` não foram autorizadas, pois a equivalência depende do áudio final e de sua percepção.

**5. Fonte e MP3:** o texto é uma referência escrita; a auditoria técnica de hash, decodificação e silêncio não revela se a voz pronunciou exatamente as palavras. A escuta em inglês e russo, incluindo tonicidade russa, finais de caso e contraste entre os aspectos verbais, segue pendente.

## 5. Verificações de produto confrontadas com a implementação #145

A implementação usa servidor HTTP de prévia **somente em loopback** com sessão local e remove transcrição/segmentação do catálogo entregue ao navegador antes do envio. O endpoint retorna o texto esperado somente após o envio e uma evidência de reprodução. A avaliação mantém `uncertain` enquanto a aprovação auditiva estiver pendente. Dados e rascunhos V14 ficam separados por idioma no IndexedDB v3; backups v1/v2/v3 permanecem compatíveis.

**Fonte dessas constatações:** inspeção dos arquivos `scripts/learn/dictation-v14-core.mjs`, `frontend/src/learn/dictation-v14-page.ts`, `frontend/src/learn/dictation-v14-storage.ts`, `frontend/src/learn/backup.ts`, relatório da V14 técnica e testes do PR #145. Os testes automáticos devem ser executados novamente no PR #119 reconciliado; esta revisão não afirma que áudios foram ouvidos.

## 6. Decisão editorial e responsabilização

**Revisão textual/editorial interna:** concluída, com observações localizadas acima. Sem defeito textual incontroverso que justifique mudar os 32 roteiros nesta rodada. O nível A2/B1 é **planejamento**, não aferição independente.

**Não aprovados por esta etapa:** revisão linguística independente, audição humana/aceite e direitos de uso dos 32 MP3s, teste de compreensão real, julgamento de proficiência, publicação pública e autenticação institucional. O proprietário do site decidirá sobre esses gates.

**Encerramento do PR #119:** trazer apenas documentação de reconciliação, validador atualizado e checagens, sem reintroduzir a versão antiga do contrato nem copiar fontes já presentes na `main`. O fechamento do PR editorial **não ativa avaliações ou áudio público**.
