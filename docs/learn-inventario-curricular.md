
# 2T Learn — Inventário curricular e arquitetura de progressão

**Data-base:** 10/11/2026. **Origem:** `frontend/public/learn/en.json`, `frontend/public/learn/ru.json`; contado pelo script `scripts/audit-learn-curriculum.mjs`.

**Escopo do cronograma:** 2.1 (auditar) concluído tecnicamente; 2.2 (currículos independentes) iniciado; 2.3 (vincular competências a atividades) preparado, não implementado.

## 1. Estado real do conteúdo

| Indicador | Inglês | Russo |
|---|---:|---:|
| Vocábulos | 162 | 162 |
| Expressões | 62 | 62 |
| Leituras | 15 | 15 |
| Lições de gramática | 15 | 15 |
| Exercícios | 237 | 237 |
| Listening | 30 | 30 |
| Ditado | 30 | 30 |
| Escrita | 52 | 52 |
| Compreensão de leitura | 45 | 45 |
| Gramática | 45 | 45 |
| Avaliações (questões) | 35 | 35 |
| Níveis marcados A1 / A2 / B1 (exercícios) | 136 / 54 / 47 | 136 / 54 / 47 |
| Vinculados explicitamente a unidade | 90 | 90 |
| Não vinculados a unidade | 147 | 147 |
| Temas distintos de exercícios | 42 | 42 |
| Respostas esperadas em português | 87 | 91 |
| Respostas esperadas na língua-alvo | 150 | 146 |

**Limites:** são contagens de ativos e metadados, não de qualidade, cobertura CEFR nem tempo real de estudo. Correspondências de idioma da resposta foram inferidas segundo `answerLanguage` em `content.ts`. Não foi realizada revisão humana de naturalidade/tradução dos 474 exercícios.

### Como o produto opera hoje

- `content.ts`: catálogos `Curriculum`, `Exercise`, `Reading`, `Lesson`; integridade e idioma da resposta.
- `path.ts` e `path-page.ts`: trilha formada por **nível + tema**; "domínio" condicionado a 3 de 4 acertos em 2 dias diferentes. **Não** testa competência comunicativa transferível.
- `selection.ts`: escolhe revisão/novidade/erro com heurísticas de frequência e recência.
- `planning.ts` e `daily.ts`: plano diário por modalidade, prioridade, cards e tentativas; não há seleção por pré-requisito/competência.
- `units.ts`: conteúdo de leitura ou gramática e suas 3 perguntas; ainda são experiências separadas.
- `session.ts`, `assessment.ts`, `engine.ts`: tentativa e validação predominantemente determinística; resposta aberta pode receber falso negativo quando expressa a mesma ideia de outra forma.
- `storage.ts`/`backup.ts`: persistência local de tentativas, cartões e planos, com formatos 1/2. Toda migração futura deve preservar dados anteriores.
- `phonetic-editor.ts`: teclado russo fonético para respostas em cirílico; manter.

**Lacunas pedagógicas relevantes:**
1. Falta mapeamento explícito "objetivo comunicativo → evidências → atividades → revisão".
2. A produção oral não é mensurada; reprodução TTS no navegador não avalia fala do estudante.
3. Feedback de respostas livres ainda não tem avaliação semântica ou rubrica contextual suficientemente ampla.
4. Falta uma avaliação inicial por competências para determinar o ponto de partida.
5. A conclusão da trilha descreve domínio de *itens* conforme algoritmo atual, e não competência comunicativa.
6. Áudios sintéticos não garantem variedade de locutores, ritmo natural ou negociação real de significado.

## 2. Esqueleto do currículo por competência

**Não transformar a ordem abaixo em bloqueio rígido.** Diagnóstico e retomada poderão dispensar etapas já demonstradas. A referência CEFR é orientativa; nenhuma lista equivale a certificação.

### Inglês — primeiro recorte de objetivos

| Faixa proposta | Situação | Evidência mínima de aplicação |
|---|---|---|
| Início/A1 | Apresentar-se e conhecer alguém | Responder/solicitar nome, ocupação e origem em contexto diferente do modelo |
| A1 | Falar de rotina e horários | Descrever rotina própria e compreender uma rotina nova |
| A1–A2 | Pedir informações, fazer compras e viajar | Fazer pergunta clara e entender indicação/resposta contextual |
| A2 | Contar acontecimentos e planos | Relatar fato passado e intenção futura sem copiar roteiro |
| A2–B1 | Explicar estudo, trabalho e tecnologia | Formular perguntas, explicar processo e pedir esclarecimento |
| B1 | Interpretar e defender decisões simples | Identificar ponto principal e justificar preferência com exemplos |

**Foco linguístico transversal:** pronúncia e percepção de fala conectada, uso contextual de tempos verbais, expressões frequentes e pragmática. Não presumir que o aluno está em A1 pela ordem dos arquivos.

### Russo — primeiro recorte de objetivos

| Faixa proposta | Situação | Evidência mínima de aplicação |
|---|---|---|
| Início/A1 | Reconhecer cirílico funcional em mensagens e placas | Ler sinais e reconhecer diferenças de som/forma relevantes |
| A1 | Cumprimentar e apresentar-se | Compreender apresentação curta e responder com informação própria |
| A1 | Pedir informações e localizar lugares | Perguntar por um local e compreender instrução breve |
| A1–A2 | Falar de pessoas, horários e rotina | Criar descrições em contextos variados |
| A2 | Pedir ajuda, comprar e planejar deslocamentos | Selecionar formulações adequadas à situação e ao registro |
| A2–B1 | Descrever experiências e intenções | Escolher construções/aspectos apropriados, justificando sentido |

**Foco linguístico transversal:** grafia cirílica, acento e sons, distinção entre consoantes duras/suaves, flexão nominal/casos, aspecto e movimento — **em contextos concretos**, sem antecipar regras que não sirvam ao objetivo atual.

## 3. Unidades-piloto para validar a metodologia (etapa 4)

### EN-PILOT-01 — Uma apresentação em contexto profissional

- Objetivo: iniciar uma apresentação e pedir esclarecimento sobre nome e função.
- Contexto: primeiro contato em um projeto ou curso; interlocutores e informações mudam durante a tarefa.
- Input: diálogo curto original, com apoio opcional em português e áudio quando disponível.
- Compreensão: identificar propósito, interlocutores e uma informação que não é resposta literal repetida.
- Descoberta: formas de apresentação, perguntas apropriadas e diferenças entre fala formal/informal.
- Prática com apoio: ajustar uma apresentação e formular pergunta.
- Transferência: responder a interlocutor diferente em novo cenário.
- Revisão: voltar a realizar a tarefa após intervalo, com menos pistas.
- **Não medir:** fluência oral/pronúncia sem coleta oral apropriada.

### RU-PILOT-01 — Pedir informação sobre um local

- Objetivo: formular pergunta compreensível sobre onde fica um destino e interpretar instrução simples.
- Contexto: pessoa em uma cidade procura estação; na transferência procura uma farmácia.
- Input: diálogo curto original, texto cirílico e TTS/áudio verificável com apoio gradual.
- Descoberta: padrões úteis para perguntar por localização; fonética/cirílico do material, sem exigir todos os casos.
- Prática com apoio: reorganizar uma pergunta; escrever uma versão usando teclado fonético opcional.
- Transferência: destino e referência espacial mudam; aceitar construções equivalentes corretas quando validadas.
- Revisão: outra situação em dia posterior sem a resposta exibida.
- **Não medir:** pronúncia real a partir de digitação.

**Critério para iniciar o motor de aulas:** roteiros das duas unidades revisados, matriz de objetivos, mídias, respostas, alternativas e rubricas; sem isso, o Codex não deve gerar perguntas aleatórias como substituto.

## 4. Mapa para reuso do conteúdo

Para cada unidade-piloto, produzir um mapa `existingItemIds` de exercícios/leituras/lições aproveitáveis. Não renomear nem mover IDs antigos.

Classificar cada item existente como:
- `reusar`: útil e correto no contexto.
- `adaptar`: conteúdo útil, mas precisa de melhor explicação/pergunta/contexto (novo ID se mudar significado avaliado).
- `apoio`: referência disponível sob demanda, fora da tarefa central.
- `revisar`: precisa de revisão linguística antes de compor uma aula.
- `fora_de_escopo`: permanece disponível no modo legado, sem inventar encaixe.

Não associar automaticamente por simples igualdade de palavras do tema. Vínculo com objetivo precisa de revisão pedagógica.

## 5. Critérios de aceite da etapa 2

- [x] Inventário reproduzível, não destrutivo e versionado.
- [x] Contagens por idioma, nível e habilidade conferíveis por script.
- [x] Limitações da estrutura atual documentadas.
- [x] Proposta inicial de progressão por tarefas para ambos os idiomas.
- [ ] Mapeamento revisado de IDs existentes para cada objetivo (a fazer antes do motor).
- [ ] Revisão linguística dos roteiros completos das unidades-piloto.
- [ ] Comparação dos objetivos com descritores CEFR aplicáveis, sem certificação.

**Execução:**
```bash
node scripts/audit-learn-curriculum.mjs
node scripts/audit-learn-curriculum.mjs --json
node scripts/audit-learn-curriculum.mjs --check
```

O script é somente leitura. A execução com `--check` falha em corrupção estrutural; lacunas de ensino são diagnósticos para revisão, não erros automáticos.
