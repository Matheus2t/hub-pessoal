# 2T Learn — V16 | Leitura e interpretação B1 (EN/RU)

**Estado:** proposta editorial **não publicada** e **não homologada por docente independente**. Data: 12/11/2026. O rótulo B1 descreve a **intenção curricular**, não uma certificação CEFR nem equivalência psicométrica demonstrada.

## Reconciliação com a implementação da V16 (13/11/2026)

A prévia local da V16 foi integrada anteriormente à `main`, com os 10 textos, 40 questões e 10 tarefas de escrita em `frontend/src/learn/reading-b1-v16-content.ts`. Esta entrega editorial **não recria a interface** e não altera o catálogo legado.

Na conferência interna foram comparados os títulos, os textos originais, os 40 enunciados, as opções, as respostas editoriais, os trechos de evidência, as explicações e as 10 rubricas de escrita entre os bancos deste PR e a implementação. Todos os valores materiais coincidiram; a prévia usa valores vazios explícitos (`null` ou `[]`) nos campos que não se aplicam a cada tipo de questão. Os SHAs dos catálogos e do manifesto V12 continuam iguais aos registrados nos JSON.

O novo validador estrutural também verifica essa **paridade editorial/runtime**. Um workflow específico executa o contrato no PR e nas alterações posteriores da `main`, para detectar divergências futuras. Essas verificações são **técnicas**, não testes com estudantes nem homologação de proficiência.

O estado de lançamento não muda: `publicRelease:false`, `cefrCertified:false`, todas as propostas `public:false`; nenhuma resposta aberta recebe correção por comparação literal. A V16 permanece restrita à prévia de estudo, sem nota, sem alegação CEFR e sem liberação pública automática. Revisão independente e piloto continuam pendentes para validação pedagógica; o responsável pelo projeto pode decidir separadamente sobre uso como prática formativa não certificadora.

## 1. Diagnóstico e decisão

O catálogo da `main` contém 237 exercícios por idioma, 474 no total. Cada idioma possui **5 leituras B1 legadas com 3 perguntas predominantemente literais** (15 por idioma, 30 ao todo). Os textos B1 originais são curtos em relação a A2: cerca de **46–49 palavras em Inglês** e **39–41 em Russo**, segundo a auditoria V5. O comprimento não define, sozinho, o nível; o problema principal é que localizar um nome/horário não exige interpretar argumento, consequência ou ressalva.

A [proposta B1 V7](./learn-propostas-b1-v7.md) já oferece perguntas de inferência sobre os textos legados. **A V16 não a substitui nem duplica sua finalidade como avaliação:** acrescenta **passagens inéditas** em novos contextos para praticar leitura e interpretação mais exigente. Temas reaparecem por continuidade curricular, mas textos e evidências são novos; isso não garante independência diagnóstica.

**Decisão para preservar dados:** não alterar texto, resposta, ID, tópico, nível ou `unitId` dos **474 exercícios existentes**. Não substituir silenciosamente a leitura originalmente apresentada a um estudante. A V16 fica em arquivos `docs/` e aguarda revisão e integração explícitas.

## 2. Entregáveis

| Material editorial novo | Inglês | Russo | Total |
|---|---:|---:|---:|
| Textos B1 novos | 5 | 5 | **10** |
| Perguntas de interpretação | 20 | 20 | **40** |
| Tarefas de transferência/escrita | 5 | 5 | **10** |

- [Banco Inglês](./learn-leitura-b1-v16-en.json): textos de **125–139 palavras** em aproximadamente dois parágrafos.
- [Banco Russo](./learn-leitura-b1-v16-ru.json): textos de **102–111 palavras**, com diferentes gêneros e relações causais.
- Cada novo texto vincula-se a uma leitura B1 legada **sem reutilizar seu ID** e à etapa B1 correta da [trilha V12](./learn-progression-v12.md).
- As **4 perguntas** por texto seguem o padrão: (1) ideia central, objetiva; (2) inferência fundamentada, aberta; (3) limite/detalhe relevante, objetiva; (4) síntese de duas informações, aberta.
- Cada leitura inclui uma proposta **distinta de escrita/transferência no idioma-alvo**. Essa tarefa não mede automaticamente compreensão escrita e não deve compor nota de leitura sem rubrica independente.
- Todas as perguntas apresentam **trechos de evidência** que devem corresponder a texto efetivamente contido na passagem, além de uma explicação para revisão após a tentativa.
- Há glossário **somente para docentes/apoio opcional**: não revelar tradução ou explicações antes da resposta em modo avaliativo.

## 3. Competências trabalhadas

**Inglês:** decisão organizacional, horário experimental de biblioteca, reaproveitamento responsável de computadores, feedback em discussão de leitura, avaliação cautelosa de alegações sobre iluminação. Estruturas conectam fatos, limitações, narrativas, condições e justificativas.

**Russo:** troca comunitária de livros, desvio de ônibus e incerteza de horário, reutilização de bicicletas com condições de segurança, progressão em clube de conversação, verificação de dados antes de expandir iluminação. Os textos exigem leitura de concessões, hipóteses prudentes, prazos, condições, limites e causas.

**Limite pedagógico:** perguntas em Português medem compreensão sem impor resposta escrita obrigatória em Inglês/Russo. A tarefa de transferência avalia escrita no idioma-alvo separadamente. O material não garante que o estudante lê qualquer texto B1 real sem suporte; isso requer revisão especializada e piloto.

## 4. Rubricas — não automatizar respostas abertas por igualdade textual

### Múltipla escolha (ideia central e limite/detalhe)
- 3 opções exclusivas, uma chave editorial.
- Distratores devem ser examinados pelo docente; a chave só pode ser ativada depois de aprovação independente.
- A resposta não certifica proficiência por si só; recolher evidência de qualidade do item em aplicação piloto.

### Resposta aberta (inferência e síntese)
- **3 — sustentada:** responde à questão, conecta todas as evidências decisivas e evita hipóteses não afirmadas.
- **2 — parcial:** informa o núcleo pertinente, mas omite uma relação essencial.
- **1 — fragmentária:** recupera um fato isolado sem resolver a interpretação.
- **0 — incompatível:** contradiz o texto ou ignora a pergunta.
- **`uncertain` — julgamento inconclusivo:** paráfrase plausível não reconhecida; exigir revisão humana, não atribuir zero automaticamente.

Os exemplos de resposta nos JSON são **ilustrativos, não lista de aceitação automática**. Não usar matching exato de strings para inferências, intenção, síntese ou escrita. A avaliação pode explicar por que certa interpretação não tem apoio, por exemplo, diferença entre *plano* e *resultado comprovado*.

### Escrita de transferência
- Avaliação humana de cumprimento da tarefa, clareza comunicativa e inteligibilidade, sem exigir texto idêntico ao modelo.
- A tarefa deve trabalhar um cenário novo; monitorar contaminação por vocabulário ou soluções memorizadas.
- **Não contar pontuação de escrita como prova isolada de Reading B1.**

## 5. Segurança de integração

Os arquivos possuem `publicRelease:false` e todos os itens `public:false`. Nenhum áudio, interface pública, catálogo, histórico ou mecanismo de avaliação foi alterado na V16. Os PRs editoriais V11 (#116), Listening V13 (#118) e Ditados V14 (#119) são independentes; não integrá-los automaticamente.

Após homologação:
1. Docentes revisam cada texto e alternativa em seu respectivo idioma (naturalidade, semântica, vocabulário, consistência e nível).
2. Revisam rubricas abertas e exemplos; distinguem evidência textual de inferências externas.
3. Um piloto com estudantes avalia compreensão, clareza das perguntas e dificuldade real; deve considerar apoio linguístico e familiaridade temática.
4. Codex implementa as atividades aprovadas em novos IDs, sem substituir exercícios legados ou migrações destrutivas no IndexedDB/backups.
5. Progressão V12 não muda automaticamente; novas atividades não se tornam requisitos nem certificam CEFR.
6. Revisar exposição de gabaritos, fluxo mobile, leitura por tecnologias assistivas, renderização de cirílico e confirmação de deploy antes da liberação.

## 6. Validação estrutural

`scripts/learn/validate-reading-b1-v16.mjs` deve verificar inventário (5/idioma, 4 questões/leitura), IDs únicos, trechos de evidência presentes, opções válidas, vínculo real com leituras legadas e etapas V12, ausência de publicação e preservação de 474 exercícios. Este teste **não substitui revisão pedagógica ou teste com estudantes**.

**Referências curriculares:** [CEFR Companion Volume do Conselho da Europa](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions); [documento de progressão V10](./learn-progressao-a1-b1-v10.md); [auditoria de leituras V5](./learn-revisao-leitura-v5.md).

## Revisão interna V18 e fluxo de liberação sem equipe externa

**Escopo revisado em 12/11/2026:** 10 textos / 40 questões / 10 tarefas de escrita. A revisão feita neste projeto por ChatGPT é **editorial interna**; não houve parecer linguístico independente, validação com turma, certificação CEFR nem revisão de gravação inexistente.

**Equipe real:** ChatGPT prepara e revisa editorialmente, Codex implementa e testa, e o dono do site decide o aceite e a publicação. Não existe obrigação de contratar especialistas externos para oferecer **prática pessoal não certificadora**; revisão externa só seria necessária se o projeto quisesse alegar validação independente ou classificação formal de proficiência.

Para lançar como **prática**, o dono aprova os itens após a revisão editorial e testes de uso, sem alegar classificação CEFR validada. Respostas abertas não revisadas permanecem `uncertain`.

**Controle de publicação:** não alterar `publicRelease:false` nem expor materiais de draft só porque a revisão textual foi concluída. O aceite explícito do dono, testes de integração, revisão dos áudios aplicáveis e verificações de produção continuam pendentes. Status: **revisão interna concluída; liberação ainda não autorizada**.
