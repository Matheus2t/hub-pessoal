# 2T Learn — Currículos por competência e unidades-piloto (v1)

**Estado:** etapas 2.2 e 2.3 **preparadas e validadas estruturalmente**, ainda sujeitas à revisão didática/linguística da etapa 6. Este pacote **não altera o Learn em produção**: a aplicação continua usando os catálogos originais e a trilha legada.

## 1. O que foi entregue

| Material | Local | Status |
|---|---|---|
| Currículo Inglês | `frontend/public/learn/pedagogy-v1/en.json` | Rascunho mapeado |
| Currículo Russo | `frontend/public/learn/pedagogy-v1/ru.json` | Rascunho mapeado |
| Aula-piloto Inglês | `frontend/public/learn/pedagogy-v1/en-pilot.json` | Roteiro original, revisão pendente |
| Aula-piloto Russo | `frontend/public/learn/pedagogy-v1/ru-pilot.json` | Roteiro original, revisão pendente |
| Validador | `scripts/validate-learn-pedagogy.mjs` | Executável e incluído na CI |

Os currículos possuem **seis objetivos comunicativos por idioma** e referências explícitas aos conteúdos existentes. Eles foram escritos independentemente: o Russo prevê leitura cirílica e localização; o Inglês, apresentação e colaboração em contextos de estudo e trabalho.

As referências `assets` indicam o motivo do reaproveitamento:
- `lexical-support`: vocábulo/expressão útil para a tarefa, **não** evidência de comunicação.
- `language-support`: estrutura ou expressão de apoio.
- `grammar-support`: explicação gramatical a consultar.
- `context`: texto/atividade contextual potencialmente aproveitável após revisão.
- `existing-practice`: exercício atual aproveitável como prática parcial; **não** substitui a avaliação comunicativa.

Uma referência válida prova que o ID existe e pertence ao idioma, **não** que o texto é natural, suficiente ou pedagogicamente aprovado. Nenhum ID do legado foi removido ou renomeado.

## 2. Sequência e dependências

### Inglês

| Ordem | Objetivo | Referência CEFR indicativa |
|---:|---|---|
| 1 | Apresentar-se e conhecer outra pessoa | A1 |
| 2 | Descrever rotina e horários | A1 |
| 3 | Pedir orientação e informações de transporte | A1–A2 |
| 4 | Fazer pedidos e compras | A1–A2 |
| 5 | Falar de compromissos e colaboração | A2 |
| 6 | Explicar um projeto e justificar decisões | B1 (indicativo) |

### Russo

| Ordem | Objetivo | Referência CEFR indicativa |
|---:|---|---|
| 1 | Reconhecer cirílico funcional | Pré-A1/A1 |
| 2 | Cumprimentar e apresentar-se | A1 |
| 3 | Pedir orientação na rua | A1–A2 |
| 4 | Falar de rotina e pessoas | A1–A2 |
| 5 | Pedir comida e resolver compras | A1–A2 |
| 6 | Explicar mudanças de viagem e movimento | A2–B1 (indicativo) |

**Importante:** esta ordem é um caminho sugerido, não um bloqueio. Pré-requisitos devem ser interpretados como orientação e ajustados pelo diagnóstico. Faixas CEFR são somente pontos de referência, não uma declaração de proficiência.

## 3. Primeiro conteúdo original para o futuro motor

As duas aulas-piloto definem o ciclo **contexto → compreensão → percepção guiada → produção com apoio → transferência → revisão posterior**. Não incluem áudio gravado nem avaliam produção oral.

**EN-PILOT:** Maya e Leo se conhecem antes de uma atividade. O estudante identifica o que Leo estuda, reconhece expressões de apresentação, responde a um novo colega e se apresenta em uma reunião de projeto.

**RU-PILOT:** visitante pergunta onde fica uma estação de metrô; recebe orientação para seguir em frente e virar à esquerda. O estudante compreende o destino e o trajeto, formula uma pergunta educada e transfere o padrão para localizar uma biblioteca.

As respostas livres incluem **exemplos e rubricas**, mas estão marcadas `rubric-review-required` porque o sistema ainda não possui verificação semântica suficiente para corrigir variantes legítimas automaticamente. Não transformar modelos de resposta em única resposta aceitável.

Na revisão posterior, a tarefa muda para outro cenário e ocorre em dias diferentes. Essa proposta de intervalo **não significa** que 2 e 7 dias sejam os melhores intervalos para todo aluno; o motor adaptativo deve calibrar isso na etapa 5/6.

## 4. Checklist pedagógico antes da ativação

- [ ] Conferir gramática, vocabulário, gênero, flexões, registro e naturalidade por idioma.
- [ ] Validar que os diálogos são compreensíveis para o estágio real do estudante.
- [ ] Conferir se cada pergunta de compreensão exige entender o sentido, não decorar uma palavra.
- [ ] Revisar rubricas e reconhecer mais de uma resposta legítima.
- [ ] Testar as unidades com um aprendiz real e registrar erros de instrução, apoio e dificuldade.
- [ ] Se houver áudio, verificar qualidade, fala natural e sincronização com o texto.
- [ ] Medir produção oral apenas quando houver captura, consentimento e instrumento apropriado.
- [ ] Comparar retenção e transferência com material equivalente; não inferir fluência por acertos.
- [ ] Definir tratamento de dados, tentativas e retomada para o motor (sem alterar backup legado).
- [ ] Habilitar a experiência ao usuário **somente** depois de revisão, testes e publicação válida.

## 5. Comandos de verificação

```bash
npm run learn:audit
npm run learn:validate-pedagogy
npm run typecheck
npm run build
```

`learn:validate-pedagogy` verifica idioma, IDs existentes, unicidade, ordenação, pré-requisitos anteriores, cobertura mínima de evidências, objetivo de cada piloto, perguntas fechadas e rubricas de perguntas abertas. Esta é uma **validação estrutural**, não uma aprovação pedagógica.

## 6. Handoff imediato para Codex

O Codex já encontra os quatro JSONs e o validador na branch `main`. A **primeira tarefa de engenharia**, após revisão dos roteiros, será criar um leitor de unidade declarativa e uma jornada de aula end-to-end sem substituir os fluxos existentes, começando pelo piloto de Inglês e depois o de Russo.

Condições obrigatórias: preservar todas as rotas, IDs, tentativas, cartões, provas, planos diários e backups; não publicar unidades marcadas `runtimeEnabled:false`; registrar ajuda recebida, tipo de evidência e feedback; não inventar medição de conversação/pronúncia; manter o estilo Lit/TS/SCSS existente.

**Não criar catálogo massivo de novos itens agora.** Primeiro provar a metodologia com os pilotos.
