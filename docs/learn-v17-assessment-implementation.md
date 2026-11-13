# 2T Learn V17 — Avaliação local e progressão formativa

**Situação:** prévia local; `publicRelease:false`; não certifica CEFR. O conteúdo continua editorialmente provisório. Docentes externos, avaliação auditiva e piloto com estudantes continuam pendentes.

## Implementação

- Inglês e Russo compartilham o mesmo motor e mantêm registros separados por chave `v17:en` / `v17:ru`.
- As respostas abertas começam em `uncertain` / `awaiting_review`. Não há comparação literal com gabarito nem correção semântica automática.
- Cada tentativa registra idioma, etapa/competência, nível observado, versão e impressão do conteúdo, origem `progression_v17_assessment`, resposta original e estado de revisão.
- A proposta precisa ser aceita por um revisor autenticado localmente antes da submissão. O aceite é vinculado a uma impressão SHA-256 de idioma, etapa, objetivo, enunciado e critérios; mudança no conteúdo invalida o aceite e as evidências correspondentes para recomendações.
- Os rascunhos são salvos no IndexedDB existente e retomados após recarga. A submissão usa um ID estável do rascunho para evitar duplicação por clique repetido.
- Respostas originais não são substituídas. Revisões são acrescentadas com rubrica 0–3, quatro dimensões, justificativa, ponto forte, questão principal e próximo passo. Correções preservam versões anteriores. Uma divergência fica incerta e exige revisão de outra conta local para consenso.
- Ajuda consultada antes do envio fica registrada e impede que aquela observação seja recomendada como produção independente. Rascunhos e respostas preservam exatamente o texto digitado, dentro do limite de 2.300 caracteres.
- Recomendações são determinísticas, reversíveis e limitadas à tarefa aprovada, à versão atual e à última tentativa. Tentativas repetidas não contam como contextos independentes; uma pendência não é tratada como erro.
- Estudo legado continua sendo cobertura de atividades, separado de desempenho. Todas as 15 etapas permanecem abertas. Nenhum resumo global de A1/A2/B1 é calculado.

## Persistência e privacidade

Os registros V17 são uma extensão tipada do store `lessonProgress` já existente no IndexedDB v3. O esquema e os IDs legados não mudam. Backups v1/v2 continuam importáveis; backups v3 incluem a extensão junto aos demais registros de aula e mantêm sua validação de duplicatas e integridade.

A senha do revisor nunca é persistida ou exportada. O navegador guarda salt e derivação PBKDF2; a sessão permanece em memória, expira após 15 minutos de inatividade e pode ser encerrada manualmente. Não há envio a servidor nem dependência externa.

Aceites e revisões também conferem a sessão autenticada na camada de persistência e usam o nome associado à sessão, em vez de confiar na identidade enviada pela interface.

Este mecanismo é uma proteção local de uso casual, **não** uma identidade institucional nem um serviço de revisão remota. A primeira conta criada no navegador torna-se administradora local e pode cadastrar outras contas; quem controla esse navegador pode limpar os dados e iniciar outra configuração. Respostas, aceitações e revisões em IndexedDB/backups não são assinadas por uma autoridade externa e não são invioláveis contra edição manual.

## Limitações pedagógicas e liberação

- A rubrica é provisória e aplicada por uma pessoa autenticada no mesmo navegador. O sistema não valida qualificação profissional do revisor.
- A aceitação local de uma proposta não equivale a revisão independente ou aprovação curricular.
- Respostas abertas podem receber feedback individual humano; não há avaliação automática confiável, IA, serviço pago ou integração externa.
- Listening sem gravação validada, produção oral e interação seguem `notAssessed`.
- Resultados descrevem somente a resposta e a tarefa observadas; não demonstram domínio de competência ampla ou nível CEFR.
- A rota continua limitada a loopback e à flag `learn-preview=progress-v17`; a presença do parâmetro em um domínio público não libera a interface.
- Antes de qualquer liberação a estudantes: aprovação editorial do proprietário, revisão linguística independente, teste com aprendizes, política de privacidade/retention e autenticação de revisores apropriada ao contexto.

## Validação desta entrega

Registrar aqui somente resultados observados após os validadores e testes finais. Os testes cobrem persistência, recuperação, idioma, ajuda, revisão e divergência, backups v1/v2/v3, recomendações e bloqueio público.

- Typecheck e build de produção: aprovados (`npm run typecheck`, `npm run build`).
- 11 validadores estruturais Learn: aprovados; V12 confirmou 30 etapas e preservação dos 474 exercícios; contrato V17 confirmou 16 casos sintéticos.
- V13: validador de conteúdo aprovado (32 roteiros/80 questões); testes Node: 12 aprovados, 0 falhas, 1 pulado porque o inventário privado de áudio não está disponível.
- Regressão Playwright Learn: 196 aprovados, 0 falhas, 1 pulado em 27 arquivos; o caso pulado exige os ativos privados de áudio V13. Os 13 testes V17 passaram dentro da regressão.
- Servidor estático local de homologação: HTTP 200 em loopback. A suíte usa `BASE_URL` em porta temporária porque `127.0.0.1:8123` estava ocupada por processos Python sem resposta HTTP; nenhum processo preexistente foi encerrado.
- Segurança local: testes confirmam rota V17 bloqueada em hosts públicos mesmo com parâmetro de prévia; tentativas e revisão continuam no navegador e sem envio a servidor.
- GitHub/Vercel: o conector autenticado lista apenas o projeto `dashboard-esportivo` no scope disponível; a consulta direta ao projeto `matheus2t` retorna 404, e o CLI Vercel não está instalado. O domínio oficial respondeu HTTP 200, o que confirma disponibilidade do site, mas não identifica o SHA implantado. Nenhum deploy manual foi disparado e a experiência continua bloqueada para estudantes.

## Pendências antes de liberação a estudantes

- Revisão linguística independente e piloto com estudantes.
- Política de retenção/privacidade e autenticação de revisores adequada ao uso institucional. O login atual protege somente o navegador local e não prova identidade profissional.
- Aprovação editorial explícita dos cenários e conteúdos ainda provisórios.
- Acesso ao projeto Vercel `matheus2t` para confirmar a implantação correta e o bloqueio no domínio oficial após a integração. Nenhuma experiência deve ser liberada publicamente nesta entrega.

## Revalidação de isolamento do bundle (13/11/2026)

Na preparação técnica final, a auditoria do bundle encontrou os cenários editoriais V16/V17 embutidos no JavaScript público, apesar das rotas bloqueadas. O build público foi corrigido para excluir os módulos e cenários V16/V17; o build local continua incluindo-os para prévia restrita. O scanner agora falha se encontrar seus IDs no `dist/learn.js` público.

- `npm run typecheck` e builds local e de produção (`VERCEL=1 npm run build`): aprovados.
- `npm run learn:audit-public-build`: aprovado; `v16:false`, `v17:false`, 474 exercícios legados e zero gravações publicados.
- `node scripts/learn/validate-assessment-progression-v17.mjs`: aprovado; 30 etapas, 6 checkpoints e 16 casos contratuais.
- `npx playwright test frontend/tests/learn-progress-v17.spec.ts`: 15/15 aprovados.
- `npx playwright test frontend/tests/learn-public-security.spec.ts` contra o build público: 2/2 aprovados, inclusive parâmetros forjados para V13/V16/V17/V19.
- Regressão Learn (27 arquivos): 203 aprovados, 1 ignorado por exigir o inventário privado de áudio V13 ausente neste ambiente.
- Ajustado o teste de segurança para comparar caminhos corretamente no Windows e a expectativa do teste de falha de áudio para corresponder ao fixture HTTP 404.

Esta revalidação é local e automatizada. O acesso ao projeto/deployment Vercel `matheus2t` não estava disponível pelo conector; portanto, não confirma SHA de produção nem um deployment. V17 continua sem liberação pública. Revisão linguística independente, piloto com estudantes e autenticação de revisores adequada a uso institucional permanecem pendentes.
