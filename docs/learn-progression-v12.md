# 2T Learn V12 — Progressão guiada A1–B1

## Escopo e disponibilidade

Esta entrega transforma o mapeamento V10 em uma visualização de estudo para Inglês e Russo. A rota `#/learn/{en|ru}/progression` exige `?learn-preview=progression-v12` e `localhost`, `127.0.0.1` ou loopback IPv6. O link de prévia também só aparece nesse contexto. A trilha legada permanece inalterada. A V12 não fica habilitada no domínio oficial porque o manifesto fonte declara `publicRelease: false`, `cefrCertified: false` e as unidades `draft_mapping_not_published`.

Ative a prévia local abrindo, por exemplo, `http://127.0.0.1:8123/?learn-preview=progression-v12#/learn/en/progression` (ou troque `en` por `ru`). O parâmetro é uma chave de exibição, não uma credencial; o bloqueio depende do host loopback.

## Estrutura e progresso

- Exibe 15 etapas por idioma na ordem V10: 4 A1, 6 A2 e 5 B1. Cada etapa apresenta a lição existente, objetivo, alvo comunicativo, leitura associada, questões gramaticais e de leitura, pré-requisitos e a ressalva editorial do pareamento.
- Todas as etapas continuam disponíveis. Pré-requisitos guiam a sequência; não bloqueiam uma etapa nem o conteúdo legado.
- “Estudo registrado” significa somente que há ao menos uma tentativa salva para cada ID distinto das três questões de gramática e três de leitura mapeadas. A chave efetiva é idioma + ID da atividade; tentativas repetidas não aumentam a contagem. Resposta `uncertain` ou incorreta conta como atividade respondida, nunca como domínio.
- Tentativas existentes no IndexedDB ou em backups importados podem preencher o progresso, desde que os IDs pertençam ao mapeamento e ao idioma corretos. Nenhum objeto, índice ou versão do IndexedDB/backup foi alterado; v1/v2/v3 continuam no fluxo existente.
- O estudo direciona para exercícios existentes. A sessão de exercícios conserva o comportamento atual: tentativas submetidas persistem; texto ainda não enviado não é salvo como rascunho. Ao retornar, atividades sem tentativa continuam disponíveis.

## V11 e atividades-ponte

O snapshot técnico `docs/learn-atividades-ponte-v11-archive.json` veio do commit `7ad2ecebc6f44cba5b112925250e34002a301e63`, blob `a798803152de2ce793be2169d38faa7173d51e92` (PR #116, draft na verificação desta implementação). Ele preserva os 24 IDs, variantes, critérios, notas e demais metadados. Esse JSON fica somente em `docs/`; o frontend não o importa e o build não o copia para `frontend/public`.

As atividades-ponte aguardam validação docente independente. Os roteiros escritos não são áudio; nenhuma tarefa auditiva está liberada. Respostas abertas não recebem correção automática nesta entrega. Não foi criado exercício-ponte no catálogo e os 474 exercícios atuais permanecem intactos.

## Validação

Resultados desta implementação:

- `npm run learn:validate-progression`: aprovado.
- Os 13 validadores Learn disponíveis (`learn:audit`, `learn:validate-pedagogy`, `learn:validate-diagnostics`, `learn:quality-audit`, `learn:coverage`, `learn:validate-reading`, `learn:validate-curation`, `learn:validate-task-rubrics`, `learn:validate-delayed`, `learn:validate-readiness`, `learn:validate-audio`, `learn:check-catalogs` e `learn:validate-progression`): todos aprovados.
- `npm run typecheck` e `npm run build`: aprovados.
- Playwright Learn C1–C5, Learn legado e regressões de plataforma Learn: **131 testes aprovados**, incluindo os sete novos testes V12.
- Layout da V12 verificado em 1366, 768, 390 e 320 px nos temas claro e escuro; isolamento dos idiomas, retomada após recarga e bloqueio sem a flag local aprovados.
- `git diff --check`: aprovado. O build/regressões foram executados contra a distribuição gerada neste worktree.

O validador compara o manifesto gerado com o V10, confere 30 nós, pré-requisitos e IDs de exercícios, confirma os 474 itens atuais, verifica a proveniência do snapshot V11 e garante que IDs das atividades-ponte não entram nos assets públicos.

O conector Vercel disponível não retornou o projeto `matheus2t` nem seus domínios no escopo conectado. Portanto, esta execução não confirma deployment, domínio nem commit implantado. A estrutura permanece local-only na interface; nenhum deployment/ativação pública foi solicitado ou confirmado.

## Pendências para liberação

1. Revisão pedagógica independente do pareamento leitura/lição, provisório no V10.
2. Homologação docente das 24 atividades-ponte e revisão de áudio antes de qualquer tarefa auditiva.
3. Decisão explícita de liberação pública; até lá, a visualização V12 permanece local.
4. Teste piloto com estudantes e consentimento antes de usar a sequência como recomendação pedagógica final.

Responder às atividades não confere nível CEFR, fluência, certificação ou domínio das competências.
