
# 2T Learn — Preparação técnica para o Codex (handoff, não é um prompt)

**Escopo:** preparar as etapas 3–5 do cronograma. O motor pode começar como **protótipo desativado** com os pilotos revisados internamente; **não habilitar publicamente antes da validação linguística e com aprendizes reais**. O trabalho está dividido para economizar a cota semanal do Codex.

## A. O que já foi decidido e não deve ser rediscutido em código

1. O currículo será organizado por tarefas comunicativas e evidências, não apenas por sequência de questões.
2. Os idiomas têm currículos independentes; `en` e `ru` não compartilham regras de pronúncia, escrita ou gramática.
3. Feedback é parte da aprendizagem, não apenas "correto/incorreto".
4. O histórico atual é verdadeiro e não pode ser reclassificado retroativamente como "dominado" sem evidências.
5. Não medir produção oral até existir instrumento que realmente a avalie.
6. Sem React/Vite/Tailwind/Django. Preservar Lit + TypeScript + SCSS + esbuild e backend FastAPI existente.
7. Qualquer mudança deve ser incremental, reversível, coberta por testes e publicada com verificação real no domínio.

**Fontes de decisão:** `docs/learn-pedagogia-v1.md` e `docs/learn-inventario-curricular.md`.

## B. Dependências: o que precisa estar pronto antes do trabalho pesado

O ChatGPT prepara e revisa:
- objetivo mensurável e descrição contextual de cada unidade-piloto;
- texto/diálogo de entrada, atividades e respostas aceitáveis (com revisão humana para casos duvidosos);
- matriz `existingItemIds` com conteúdo legado reutilizável/adaptável;
- critério de avaliação da compreensão, da produção e da transferência;
- estratégia de apoio e revisão posterior.

**Os cinco materiais já foram preparados para a primeira implementação.** Não gerar dezenas de atividades nem construir um "modelo de domínio" em pontuações arbitrárias.

## C. Trabalho apropriado para Codex, em ordem

### C1 — Motor de unidades orientadas por tarefas (etapa 4.1/4.2)

Criar suporte a uma unidade pedagógica formada por objetivo, input, prática, aplicação e feedback, com tarefas opcionais/ordem flexível. Reusar componentes atuais sem copiar `learn-session` e `learn-assessment` inteiros.

Entradas propostas (refinar nomes com o código real):
- metadados estáveis da unidade; `language`, `objective`, `scenario`;
- referências a IDs legados e a conteúdos novos versionados;
- sequência declarativa de atividades e rubricas com suporte a ajuda;
- regra explícita de "o que conta como concluído".

Saídas:
- aula retomável sem perder texto digitado;
- tentativas e evidências duráveis, separadas de eventos legados;
- histórico capaz de distinguir compreensão, produção e transferência;
- navegação acessível e responsiva; nenhuma perda da interface atual.

### C2 — Persistência e compatibilidade (etapas 3 e 7)

**Invariantes obrigatórias:**
- não alterar ou excluir `Attempt`, `Card`, `PlanSettings`, `DailyPlan` e seus IDs antigos;
- manter exportação/importação de backups existentes (v1/v2) compatíveis;
- qualquer extensão de backup exige versão nova, importação das versões antigas, checagem de integridade e rollback consistente;
- separar "evidências novas" de tentativas antigas; jamais inferir oralidade, retenção ou transferência a partir de um acerto isolado;
- dados sensíveis continuam no navegador por padrão; não introduzir endpoint externo sem avaliação de privacidade;
- duas abas, reload, falha de IndexedDB e navegação interrompida precisam de comportamento determinístico.

### C3 — Diagnóstico e recomendação (etapa 3)

Motor baseado em:
- competências que o currículo expressamente consegue avaliar;
- resultados por contexto e grau de ajuda;
- prazo da última evidência e necessidade de revisão;
- lacunas de pré-requisitos; preferências do estudante;
- tarefa futura mais útil, não simplesmente atividade com mais erros.

No início, **regras transparentes e determinísticas**, não uma pontuação opaca inventada. Se a evidência for insuficiente, indicar "não avaliado".

### C4 — Feedback didático e avaliação (etapas 4.3 e 5)

- Resposta fechada: validação determinística do conteúdo verificado.
- Resposta aberta: rubrica por significado/adequação; aceitar alternativas conhecidas, sinalizar incerteza e permitir reformulação.
- Explicar pontos fortes, erro prioritário, pista adequada e nova tentativa.
- Não confundir erros de teclado com erros conceituais.
- Registrar pistas usadas e tipos de evidência. Não fingir diagnóstico de pronúncia.
- Modelos generativos ou APIs de terceiros são opcionais e dependem de autorização, testes, custo e privacidade.

### C5 — Testes integrados e deploy (etapas 6 e 7)

Aproveitar `frontend/tests/learn-*.spec.ts` e o fluxo CI existente. Testar:
- jornada completa de cada unidade-piloto em Inglês e Russo;
- ajudas, erro, nova tentativa, transferência e revisão em dia diferente;
- persistência/recarga/duas abas, restauração de backups antigos;
- isolamento dos idiomas e do teclado fonético;
- níveis de ajuda e evidências não superestimados;
- telas 320/390/768/1366 px, tema escuro/claro, teclado e leitor de tela quando possível;
- ausência de regressão de aulas legadas;
- `main` publicada e checada em `matheus2t.com.br`.

## D. O que não delegar ao Codex neste primeiro ciclo

- Decidir sozinho quais capacidades constituem "fluência".
- Inventar respostas linguísticas, descritores CEFR ou conteúdo cultural sem revisão.
- Criar ranking de aprendizagem sem critérios.
- Expandir o catálogo em massa.
- Reescrever a aplicação inteira, criar um banco paralelo ou migrar dados em massa.
- Mudar a identidade visual, a home ou os módulos fora de Learn.
- Criar novos projetos Vercel em vez de publicar no existente.

## E. Definition of Done do primeiro incremento de engenharia

Um único piloto end-to-end, depois o segundo idioma, comprovando que:
1. O objetivo e a tarefa são claros e contextualizados.
2. O conteúdo aprovado renderiza sem depender de nuvem.
3. As atividades registram evidência com tipo e ajuda utilizada.
4. A revisão de resposta oferece explicação e oportunidade de corrigir.
5. Os registros antigos continuam acessíveis e o backup funciona.
6. CI de build, regressão Learn e nova jornada está verde.
7. A publicação existente na Vercel é verificada por acesso ao domínio real.
8. Não há afirmação de proficiência ou oralidade sem evidência.

## F. Comandos e pontos de entrada para o Codex

```bash
node scripts/audit-learn-curriculum.mjs --check
npm ci
npm run typecheck
npm run build
PW_CHANNEL=chromium npx playwright test frontend/tests/learn-*.spec.ts
```

Arquivos principais: `frontend/src/learn/content.ts`, `model.ts`, `storage.ts`, `backup.ts`, `path.ts`, `selection.ts`, `planning.ts`, `units.ts`, `session.ts`, `assessment.ts`.

**Observação:** este documento é um contrato e backlog técnico de referência, não um pedido para executar tudo de uma vez. Os incrementos devem caber em revisão e teste independentes.


---

## Atualização da etapa 2.2/2.3 — 10/11/2026

Currículos independentes, vínculos a IDs legados e roteiros originais das duas unidades-piloto foram preparados em `frontend/public/learn/pedagogy-v1/`. Consulte `docs/learn-curriculo-v1.md` para a matriz de competências, limites, critérios editoriais e integração. Execute `npm run learn:validate-pedagogy` para conferir integridade antes de iniciar engenharia. **Estado: rascunho validado estruturalmente; não publicado como experiência de estudo, sem aprovação linguística definitiva.**


## Complemento etapa 3.1 — diagnóstico pedagógico

O contrato de diagnóstico e seus cenários de teste foram definido em `docs/learn-diagnostico-v1.md`. **Antes de implementar um diagnóstico automático**, preservar o estado `não avaliado` para lacunas de evidência, rubricas que não podem ser corrigidas com segurança e produção oral. Não derivar percentuais de fluência de tentativas de tradução; manter recomendações explicáveis e não bloqueantes.


---

## Continuação pedagógica — tarefas diagnósticas e feedback (10/11/2026)

Foram preparados `en-diagnostic.json` e `ru-diagnostic.json`, com tarefas graduadas por competências, e o contrato `evaluation-policy.json` com rubricas e resultados incertos. O banco `feedback-casebook.json` contém exemplos e contraexemplos editoriais de respostas. Todos ficam em `frontend/public/learn/pedagogy-v1/` e permanecem **desativados em produção**, pendentes de revisão linguística e implementação. Consulte `docs/learn-diagnostico-feedback-v1.md` e execute `npm run learn:validate-diagnostics`.


---

## Auditoria didática incremental — novembro de 2026

A revisão documentada em `docs/learn-auditoria-didatica-v1.md` confirmou **10 grupos de perguntas repetidas** (5 por idioma) e **80 explicações genéricas de escrita** (40 por idioma). Os roteiros `en-pilot.json` e `ru-pilot.json` agora possuem justificativa por etapa, microexplicações, feedback específico para alternativas erradas e regras explícitas de apoio. O arquivo `quality-baseline.json` e o comando `npm run learn:quality-audit` acompanham possíveis regressões sem modificar o catálogo histórico. A revisão linguística independente e o teste com estudante continuam pendentes; **nenhum piloto foi ativado**.


---

## Rastreabilidade completa do material legado — novembro de 2026

O relatório `scripts/report-learn-coverage.mjs` identifica todos os 491 IDs por idioma, inclui referências a objetivos e marca os ainda não classificados. Consulte `docs/learn-rastreabilidade-v1.md` e execute `npm run learn:coverage` ou `node scripts/report-learn-coverage.mjs --json` para revisar a cobertura por modalidade. **Não transformar associação a um objetivo em evidência de competência. Não mapear conteúdo automaticamente pela presença de palavras-chave.**


---

## Leitura guiada e independência diagnóstica — 11/11/2026

Foram preparados `en-reading-guide.json` e `ru-reading-guide.json` para os textos existentes de rotina (`en-reading-01`, `ru-reading-01`). Eles usam trechos exatos dos textos, ajuda sob demanda e tarefas de compreensão e aplicação em novo contexto. O diagnóstico foi separado dos cenários do piloto para reduzir repetição da avaliação. Consulte `docs/learn-leitura-e-avaliacao-v1.md` e execute `npm run learn:validate-reading`. **Todos os guias e diagnósticos permanecem inativos; teste com aprendiz e revisão linguística independente ainda pendentes.**


---

## Curadoria por ID dos primeiros pilotos — 11/11/2026

Foi revisada uma amostra de 40 itens reais (20 por idioma) e registrada a decisão `reuse`, `support_only`, `needs_revision` ou `defer` em `frontend/public/learn/pedagogy-v1/pilot-asset-curation.json`. Cinco novos vínculos de apoio foram incluídos nos objetivos dos pilotos e uma referência fora de escopo foi retirada do objetivo inicial de Inglês; todos os itens históricos permanecem disponíveis. Consulte `docs/learn-curadoria-pilotos-v1.md` e execute `npm run learn:validate-curation`. **O parecer é editorial preliminar, não validação linguística independente; não ativar os pilotos nem derivar competências de traduções ou lacunas.**


---

## Revisão diferida dos pilotos — continuação da etapa 5

Quatro eventos de prática diferida em `frontend/public/learn/pedagogy-v1/pilot-delayed-probes.json` (D+2 e D+7 de cada idioma) incluem compreensão de texto novo e produção escrita em contexto diferente, com rubrica e exemplos ocultos até a tentativa. O projeto está especificado em `docs/learn-retencao-transferencia-v1.md` e verificado por `npm run learn:validate-delayed`. **Não existem lembretes, avaliações de retenção em produção ou intervalos validados.** O Codex deve preservar essa distinção e registrar pista lexical quando uma palavra russa nova é fornecida.


---

## Proteção da integridade do diagnóstico — revisão posterior

A revisão em `docs/learn-integridade-diagnostico-v1.md` redistribuiu as alternativas corretas (2 por posição em cada idioma), vinculou uma resposta canônica a cada índice e substituiu uma questão artificial de cirílico por sinalização funcional. As respostas de exemplo das tarefas abertas exigem visualização **somente após a tentativa**. Palavras russas fornecidas no enunciado são pistas lexicais que precisam ser registradas como assistência. O Codex deve interpretar esses contratos de dados, impedir reutilização de ID depois de existirem tentativas reais e evitar deduzir proficiência de reconhecimento ou da posição de um gabarito.

---

## Feedback provisório da escrita no Learn legado

A apresentação do resultado dos exercícios de escrita foi ajustada para descrever **correspondência com respostas cadastradas**, e não uma avaliação semântica definitiva. Uma resposta não reconhecida mostra que o gabarito atual tem limites e que outras formulações podem ser válidas.

**Invariantes mantidas nesta mudança:** `evaluateAnswer`, `Attempt.correct`, persistência, históricos, backups, SRS e outros modos de prática não foram alterados. Assim, estatísticas antigas continuam baseadas no verificador determinístico — não constituem uma medição validada de produção livre.

**Pendência para o Codex:** quando o motor de rubricas estiver pronto, separar explicitamente `matchedRegisteredVariant` de `communicativeEvidence` no esquema novo, sem reclassificar automaticamente as tentativas anteriores nem recalcular proficiência a partir de correspondências literais. Registrar ajuda e resultado incerto.


---

## Marco definitivo de handoff — preparação encerrada

O documento autoritativo do **próximo incremento Codex** é `docs/learn-codex-kickoff-v1.md`. Use `frontend/public/learn/pedagogy-v1/readiness-manifest.json` para identificar o piloto EN, as fontes de dados, IDs, versão de conteúdo e portões de aprovação; `evidence-contract.json` define como registrar ajuda, resultados e incerteza. A revisão editorial interna está em `docs/learn-pilotos-fechamento-editorial.md`.

**Decisão já tomada:** iniciar C1 (motor declarativo + persistência/backup em prévia fechada); não gastar o primeiro ciclo do Codex em nova ideação, nem ativar o curso publicamente. A validação linguística independente e com estudantes **continua pendente**, mas não bloqueia criar o protótipo desativado. Executar `npm run learn:validate-readiness` e as regressões existentes.
