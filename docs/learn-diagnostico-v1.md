# 2T Learn — Diagnóstico pessoal de competências (especificação v1)

**Etapa do cronograma:** 3.1 (diagnóstico inicial) — **projeto pedagógico preparado, implementação pendente**. Este documento orienta o Codex; não habilita diagnóstico na interface.

**Objetivo:** descobrir o que a pessoa já consegue compreender e produzir em cada idioma, para oferecer uma primeira recomendação **sem confundir acerto em exercícios com nível CEFR**.

## 1. Contrato de funcionamento

1. Oferecer diagnóstico curto e opcional por idioma. Permitir `Pular`, `Não sei`, revisão e repetição posterior, sem travar conteúdo.
2. Identificar capacidades observáveis, **não personalidade, estilo de aprendizagem, QI ou "fluência"**.
3. Inglês e Russo são independentes, inclusive histórico, diagnóstico, progressão e recomendações.
4. Reaproveitar material aprovado e acrescentar tarefas novas só quando uma competência não for observável com exercícios existentes.
5. O relatório deve distinguir `não avaliado`, `observado parcialmente`, `evidência suficiente para uma recomendação provisória` e `revisar resposta`.
6. Se não houver voz disponível, não há nota de listening, nem penalização. Pronúncia e fala permanecem **não avaliadas** até haver uma prova válida.
7. Não exigir nome real nem dados sensíveis no teste; exemplos podem usar identidades fictícias.
8. Recomendações são orientações, nunca bloqueios. Sempre permitir escolher uma unidade livremente.

## 2. Matriz de competências (MVP)

| Dimensão | Evidência observável | O que **não** pode ser concluído |
|---|---|---|
| Compreensão escrita | Entender informação explícita e inferir ideia simples em texto **novo** | Que consegue falar ou escrever sobre isso |
| Compreensão auditiva | Entender mensagem curta sem transcrição antes da tentativa; fonte audível verificada | Que fala bem ou entende conversas longas |
| Produção escrita | Responder de maneira compreensível a uma situação com rubrica e revisão | Que fala fluentemente; que uma tradução exata é a única resposta |
| Reconhecimento do sistema da língua | Identificar letras, formas e relações gramaticais em contexto | Que dominou gramática inteira ou tem proficiência alta |
| Retenção | Reproduzir/usar conhecimento em outro dia, com novo enunciado | Que um acerto imediato prova retenção |
| Transferência | Aplicar estrutura a cenário e vocabulário alterados, sem modelo visível | Que repetir exercício conhecido prova transferência |
| Produção oral | **Não avaliada no MVP** | Nada sobre pronúncia, espontaneidade ou fluência oral |

No Russo, considerar leitura cirílica como **pré-requisito funcional com suporte**, mas não exigir domínio prévio de todos os casos gramaticais. O teclado fonético pode ajudar na escrita; seu uso deve ser registrado como auxílio, sem transformar digitação romanizada em prova de leitura independente.

## 3. Sequência inicial proposta

**Não é uma prova de 30 questões.** Idealmente entre 8 e 12 tarefas para o primeiro contato, dependendo do nível observado e de recursos disponíveis. Este número é hipótese de produto, a calibrar nas unidades-piloto.

1. **Leitura (2–3 tarefas):** texto curto novo; reconhecer propósito e informação; uma pergunta exige inferência.
2. **Reconhecimento do idioma (1–2 tarefas):** identificar expressão usada em situação concreta. No Russo, incluir sinais e letras cirílicas; no Inglês, atenção a padrões úteis de pergunta e sentido.
3. **Compreensão auditiva (2–3 tarefas, condicional):** áudio validado e sem transcrição inicial; responder sobre a mensagem. Voz indisponível ⇒ `não avaliado`.
4. **Produção escrita (2 tarefas):** uma resposta curta com suporte e outra em cenário diferente sem modelo. Se a correção automática não tiver rubrica validada, registrar como `revisão necessária`.
5. **Escolha do caminho inicial:** apresentar evidências concretas, lacunas e sugestão de unidade. Nunca converter resultado em "A2 certificado".

**Regra de interrupção:** se houver dificuldade consistente no início, reduzir complexidade e oferecer uma unidade introdutória; não forçar conteúdos acima da capacidade demonstrada.

**Regra de avanço:** uma sequência de acertos pode orientar tarefas mais complexas, mas não justificar pular diretamente para B1 sem observações compatíveis em mais de uma habilidade.

## 4. Registro pedagógico mínimo — futura engenharia

Cada observação precisa identificar:

- `language`, `objectiveId`, `taskId` e versão do conteúdo;
- tipo de tarefa (`comprehension`, `guidedProduction`, `independentProduction`, `transfer`, `delayedRecall`);
- data/hora, contexto e modo de apresentação (texto, áudio, etc.);
- tipo de ajuda disponível e efetivamente usado (`none`, `hint`, `translation`, `example`, `phonetic`);
- resultado: `supported`, `not-supported`, `uncertain`, `not-assessed`;
- motivo específico da avaliação e se exigiu revisão de resposta aberta.

**Não substituir `Attempt` ou retroconverter o histórico atual.** O Codex deverá propor uma extensão aditiva de dados/backup versionada, com rollback, deduplicação e recuperação de sessão. O esquema acima é conceitual; nomes/estrutura final exigem revisão técnica.

## 5. Política de recomendação transparente (sem "IA mágica")

- Se há **somente reconhecimento** demonstrado, indicar unidade com aplicação escrita, **sem** afirmar compreensão/produção independente.
- Se compreensão escrita parece adequada e escrita está incerta, recomendar prática de produção com feedback.
- Se há erros em percepção de direções, recomendar compreensão contextual e contrastes antes de exigir produção nova.
- Se há poucos dados, exibir `evidência insuficiente` e sugerir tarefa exploratória; **não inventar porcentagens de domínio**.
- Se há contradição de evidências, escolher revisão direcionada com material diferente e explicitar incerteza.
- Se a pessoa já demonstrou capacidade avançada num objetivo, oferecer caminho acelerado **sem bloquear** unidades anteriores.
- O resultado final exibe `Por que sugerimos esta aula`, baseado em observações reais verificáveis.

## 6. Exemplos de testes de aceitação para o Codex

| Cenário | Resultado esperado |
|---|---|
| 5 traduções corretas, nenhuma situação nova | Não declarar comunicação ou transferência dominadas |
| Aluno erra leitura e acerta tradução com pista | Registrar auxílio; não chamar produção independente |
| Aluno escreve resposta alternativa válida | Rubrica ou revisão; nunca marcar errada só por não repetir frase modelo |
| Voz russa indisponível no navegador | Listening Russo = `não avaliado` |
| Inglês com histórico e Russo recém-iniciado | Não copiar nível, evidências ou sugestões entre idiomas |
| Texto inserido com teclado fonético | Registrar apoio, sem penalização automática por usá-lo |
| Usuário pula diagnóstico | Preservar estudo livre e indicar `não avaliado` |
| Restauração de backup legado | Nenhum dado antigo é tratado como competência nova |
| Armazenamento indisponível | Aviso claro; nenhuma conclusão persistida falsamente |
| Avanço após poucos acertos no mesmo dia | Evitar alegar retenção; sugerir verificação posterior |
| Tarefa aberta sem avaliador confiável | `revisão necessária`, nunca classificação automática segura |
| Diagnóstico interrompido ou página recarregada | Retomar de forma consistente sem duplicar evidências |

## 7. Portões antes da implementação

- [x] Princípios e regras de interpretação definidos.
- [x] Competências observáveis e lacunas de avaliação separadas.
- [x] Especificação mínima de tarefas e evidências escrita.
- [x] Testes de aceitação planejados.
- [ ] Criar itens diagnósticos originais e revisar o nível linguístico de cada um.
- [ ] Calibrar quantidade de tarefas, dificuldade e limites de confiança com dados de teste.
- [ ] Definir migração aditiva e interface junto ao motor de unidades (Codex).
- [ ] Validar com testes de usuário e auditoria de dados (etapa 6).

**Dependências:** `docs/learn-pedagogia-v1.md`, `docs/learn-curriculo-v1.md`, `frontend/public/learn/pedagogy-v1/{en,ru}.json`.

**Limite explícito:** o objetivo desta etapa não é simular um professor onisciente, mas construir um diagnóstico modesto, auditável e útil — e melhorar a precisão conforme o aluno gera evidências.
