# 2T Learn — protocolo operacional de homologação pedagógica v9

**Data:** 12/11/2026. **Status:** preparação editorial concluída para solicitar revisões; nenhuma revisão independente ou sessão com estudantes foi realizada nesta rodada.

**Escopo congelado:** 474 exercícios (237 EN + 237 RU), distribuídos em 272 A1, 108 A2 e 94 B1. **Modalidades (ambos idiomas):** 60 Listening, 60 ditados, 104 escritas, 90 leituras, 90 gramáticas e 70 testes. O catálogo do Learn em uso é o conteúdo aprovado em `main` após o PR #113. Fonte congelada por blob SHA no campo `catalog_blob_sha` da matriz.

## Artefatos preparados

1. `docs/learn-homologacao-matriz-v9.csv` — 474 linhas de revisão, uma por exercício, com idioma, nível, modalidade, critérios de enunciado, resposta e feedback, bloqueio público e referência exata ao catálogo por SHA de blob Git. **Todas as linhas começam como `awaiting_independent_review`, com `release_gate=hold`.**
2. `docs/learn-b1-casos-calibracao-v9.csv` — 80 respostas **sintéticas**, quatro por cada uma das 20 propostas B1 da v8: modelo, alternativa plausível, resposta parcial e resposta incompatível/suposição. Todos os `expected_automated_outcome` são `uncertain`: são amostras para calibrar avaliadores humanos, não gabaritos de uma IA em produção.
3. `docs/templates/learn-independent-review-v9.json` — ficha **vazia** de revisão independente, sem identidades, resultados ou dados pessoais.
4. O dossiê `docs/learn-b1-dossie-docente-v8.md` e as 20 propostas `docs/learn-b1-tarefas-rascunho-v8.csv` continuam **separados do catálogo público**.

## Procedimento de revisão independente dos 474 itens

### Etapa 1 — Congelar a versão

- Enviar aos revisores os catálogos e a matriz do **mesmo blob SHA**, evitando revisar arquivos que mudam durante o trabalho. Especificar idioma, modalidade e faixa A1/A2/B1.
- Não incluir nome de aluno, dados de navegação, respostas reais ou identificadores de navegador. Os arquivos versionados desta etapa **não** contêm participantes.
- Se o texto, o gabarito ou a explicação de qualquer exercício mudar durante a revisão, marcar o parecer anterior daquele ID como **desatualizado**; refazer a avaliação do item no novo snapshot.

### Etapa 2 — Dois julgamentos independentes

- Dois revisores com proficiência e experiência pedagógica no **idioma-alvo** devem revisar cada item, sem consultar a decisão um do outro durante o julgamento inicial.
- Cada revisor verifica: precisão factual e gramatical, naturalidade, registro, ambiguidade do enunciado, equivalência das respostas, clareza do feedback, adequação à tarefa e plausibilidade da classificação A1/A2/B1.
- Para itens de Listening e ditado, **não aprovar a parte auditiva sem ouvir áudio efetivo e autorizado**. Texto correto e TTS de navegador não comprovam pronúncia, sotaque, velocidade nem inteligibilidade. Revisor de áudio pode ser pessoa distinta do revisor do conteúdo.
- Para escrita, leitura e testes abertos, revisar tanto a resposta registrada como variantes que não foram previstas; não concluir que uma string não reconhecida é erro.
- Para B1, verificar se a demanda comunicativa é compatível com o objetivo e **não** somente o comprimento do texto ou a etiqueta CEFR.

### Etapa 3 — Calibrar respostas abertas

- Rodar a matriz de 80 exemplos sintéticos da v9 com os dois revisores, sem mostrar `illustrative_case_type` como “nota correta” na primeira passada. Usar esses rótulos **apenas para provocar discussão**.
- Na segunda passada, comparar discrepâncias na interpretação, nos requisitos comunicativos, nas informações inferidas e na força de cada evidência textual.
- Registrar **escores por dimensão** (0–3), justificativas e alternativas aceitas; caso permaneça plausível mas indeterminado, usar `uncertain` **fora** da escala numérica, sem penalização automática.
- Distinguir erros de gramática que dificultam entendimento daqueles que não impedem compreensão do sentido. Evitar automatizar julgamentos sem dados confiáveis de concordância entre pessoas.

### Etapa 4 — Adjudicação e estados

Status propostos por item:

| Estado | Significado | Liberação |
|---|---|---|
| `awaiting_independent_review` | Nenhum parecer independente concluído | Bloqueado |
| `in_review` | Pelo menos um parecer em andamento | Bloqueado |
| `needs_adjudication` | Divergência ou caso duvidoso | Bloqueado |
| `revise_item` | Defeito demonstrado, corrigir e revisar novamente | Bloqueado |
| `rejected` | Item inadequado, requer redesenho/retirada por decisão explícita | Bloqueado |
| `content_reviewed` | Revisores concordaram com texto/gabarito/feedback e evidências foram registradas | **Ainda não liberado** |
| `ready_for_controlled_pilot` | Conteúdo revisado + privacidade/áudio/protocolo aplicáveis liberados pelo responsável | Apenas piloto autorizado |

Um conteúdo `content_reviewed` **não** demonstra aprendizagem, proficiência CEFR ou qualidade de áudio. Não declarar aprovação global pelo número de itens editados nos PRs anteriores (406/474).

**Critério de saída da etapa editorial:** revisão e decisão por **todos os 474 IDs**, com versão do conteúdo identificável, duas opiniões independentes, divergências resolvidas, evidências/documentos de áudio quando cabíveis e zero problemas críticos pendentes. Qualquer item `revise_item`, `needs_adjudication` ou `rejected` bloqueia a liberação daquele item até decisão explícita. Esta é uma proposta de gate, sujeita à decisão do responsável do projeto.

### Etapa 5 — Piloto com estudantes: duas finalidades separadas

**A. Usabilidade/formação de expectativa**: seguir `docs/learn-student-usability-protocol.md` e a ficha `docs/templates/learn-student-session.json`, já existentes; usar exclusivamente ambiente controlado. Verificar compreensão de mensagens `uncertain`/`notAssessed`, navegador, teclado, acessibilidade, continuidade, histórico e explicações. **Não inferir efeito pedagógico desse piloto.**

**B. Evidência preliminar de aprendizagem** (novo desenho proposto, **não iniciado**):
1. Definir previamente objetivo e habilidade por idioma e faixa, e selecionar tarefas independentes não idênticas aos exemplos de estudo.
2. Obter consentimento específico e aprovação de privacidade/retenção antes de recrutar. Recrutar inicialmente adultos.
3. Aplicar tarefa inicial sem dicas; registrar apenas pontuação por dimensão e observações não identificáveis, em ambiente isolado.
4. Realizar prática guiada; depois, aplicar **tarefa diferente mas de objetivo equivalente**, sem mostrar respostas-modelo.
5. Repetir uma verificação de retenção em sessão futura apenas se prevista no consentimento e com prazo de retenção definido. Não simular intervalos D+2/D+7 como se fossem dados reais.
6. Para respostas abertas, usar dois julgamentos humanos cegos; registrar discordâncias e retificações. Comparar desempenho por habilidade; amostras exploratórias não permitem afirmar eficácia causal.
7. Registar bloqueios, erros críticos, compreensão das instruções, alterações propostas e decisão de nova rodada. Ausência de melhora não deve ser escondida.

**Sem participantes ou consentimentos coletados aqui:** nenhum ganho, duração de sessão, satisfação, porcentagem de acertos ou efeito foi medido.

## Privacidade, acesso e segurança

- Não salvar no Git nomes, e-mails, respostas literais de participantes, áudio, transcrições identificáveis, identificadores de navegador, credenciais ou consentimentos preenchidos.
- Se for indispensável ler respostas literais, obter consentimento específico e guardar temporariamente em ambiente com controle de acesso e descarte registrado, **fora do repositório**. Seguir o protocolo de retenção já existente; o responsável deve aprovar o prazo antes da coleta.
- O motor atual não oferece julgamento semântico automático confiável para produção livre; manter `uncertain` e jamais convertê-lo em erro ou nota zero.
- Não liberar C1–C5, nem abrir rotas de avaliação pública, apenas porque os documentos e CI passaram.
- Necessário confirmar deployment de produção/Vercel por SHA antes de alegar publicação no domínio.

## Próximos responsáveis/entregas

| Frente | Próxima entrega objetiva | Evidência exigida |
|---|---|---|
| Revisores de Inglês | Duas análises por item EN | Fichas preenchidas fora do Git, diferenças adjudicadas, SHA congelado |
| Revisores de Russo | Duas análises por item RU | Fichas preenchidas, análise de registro, gênero/casos/aspecto, SHA |
| Voz/áudio | Material licenciado + revisão auditiva | Manifest de fontes, consentimento/licença, escuta em aparelhos diferentes |
| Responsável por privacidade | Aprovar coleta e descarte do piloto | Versão do aviso, canal de retirada e calendário de exclusão |
| Estudantes | Pilotar usabilidade e aprendizagem separadamente | Fichas anonimizadas, problemas e mudanças; nenhum resultado inventado |
| Engenharia | Proteger eventual revisão e manter histórico e gates | CI, testes, auditoria de permissões, validação do deployment |

**Status real ao criar esta documentação:** matriz e exemplos preparados, 0 revisores externos confirmados, 0 estudantes avaliados e 0 gravações aprovadas. O pacote torna a homologação executável, mas não a substitui.
