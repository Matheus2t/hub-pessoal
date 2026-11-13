> **Relatório vigente (13/11/2026):** [Homologação integrada final do 2T Learn](./learn-final-homologation-2026-11-13.md), com matriz V11–V22, testes de 474 exercícios, EN/RU, backups v3, segurança pública e limites de acesso/deployment. **O conteúdo abaixo é registro histórico de 11/11/2026**; informações antigas sobre quantidade de feedbacks genéricos, PRs editoriais pendentes e bloqueios de revisão externa não refletem o estado atualizado. Revisão externa e pilotos foram dispensados como requisito para uso pessoal, não realizados.

---

# 2T Learn — homologação final e prontidão

Data da verificação: 2026-11-11

Base local de referência: `main` em `40a5b5f15bb2aa72b1ec5462d28add572fe432fe` (PRs #98–#102).
Escopo: Learn em Inglês e Russo; nenhuma outra área alterada.

## Evidências técnicas

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado após as alterações do player e da ficha de revisão.
- Dez validadores originais do Learn: 10/10 aprovados. `npm run learn:validate-audio` adicional também aprovado; total atual: 11/11.
- Regressão Playwright C1–C5, Learn legado e `platform-v2-learn.spec.ts`: **120/120 aprovados** em Chromium/Chrome, com servidor estático local.
- Testes específicos de respostas abertas, pilotos e diagnóstico: 19/19 aprovados.
- Testes do player de áudio: 4/4 aprovados, incluindo 320, 390, 768 e 1366 px em tema escuro/claro.
- A regressão completa cobre 1920, 1366, 768, 390 e 320 px e ambos os temas nas verificações de interface existentes.
- `git diff --check`: aprovado nos PRs. `dist/` e `test-results/` estão ignorados pelo Git.
- Pytest não foi executado nesta homologação: não houve mudança no backend nem no contrato de API.

### Entregas integradas

- PR #99: correção de dez duplicações exatas EN/RU, nota de relative clauses e auditoria estrutural ampliada.
- PR #100: player de síntese local com volume, velocidade, pausa/retomada, repetição, mensagens acessíveis e manifest de áudio.
- PR #101: aviso de privacidade da ficha aberta e documentação dos limites de revisão humana.
- PR #102: protocolo e formulário vazio para testes formativos com estudantes.

Catálogo legado auditado estruturalmente: 491 registros por idioma (162 palavras, 62 expressões, 15 leituras, 15 lições, 237 exercícios). A triagem técnica não equivale a aprovação linguística independente.

## Conteúdo, Listening e respostas abertas

- 10 duplicações exatas foram corrigidas; zero grupos conhecidos permanecem no quality audit.
- Permanecem 40/52 explicações genéricas de escrita por idioma e pendências de progressão, naturalidade, variantes e nível. Revisor humano independente continua necessário.
- Manifest de Listening: 124 referências — 120 exercícios legados com Web Speech API local e 4 tarefas diagnósticas sem gravação revisada. **Gravações validadas: 0; avaliação auditiva habilitada: não.** Síntese varia por sistema/voz, é rascunho de prática e não prova listening.
- Questões fechadas usam critérios determinísticos. Respostas abertas continuam `uncertain`/`pending`; a ficha exportada não dá nota nem gera feedback corretivo. Não existe identidade autenticada de revisor, endpoint privado, autorização, persistência de decisões ou trilha de retificação.

## Dados, segurança e acesso

- Progresso fica no IndexedDB v3 do navegador; os contratos mantêm backups v1/v2/v3, histórico e isolamento por idioma. Não foi acrescentada persistência remota de respostas.
- A ficha de revisão contém o texto da resposta e o contexto. Seu download é iniciado pelo usuário, sem envio automático; a interface alerta sobre guarda, compartilhamento e descarte.
- As prévias C1–C5 continuam condicionadas a hostname loopback e flag local. A query string sozinha não é autenticação.
- A navegação no domínio oficial, `https://matheus2t.com.br`, com flags `c1`, `c2`, `diagnostic-en`, `diagnostic-ru`, `c4-delayed` e `c5-integration`, exibiu a página “Página do Learn não encontrada”/404 da aplicação; nenhuma experiência nova foi renderizada. Isso confirma o bloqueio visual no domínio observado, não a identidade do deployment servido.
- A conexão Vercel consultada no escopo exato `matheus2ts-projects` não lista `matheus2t` (busca sem resultados; `get_project` retorna 404). Não foi possível confirmar Production/Preview, alias, estado `Ready` ou SHA efetivamente servido. Não usamos outro projeto como substituto.
- Não foi feita liberação pública deliberada. Como o deployment exato é inacessível ao conector, o estado atual de produção não pode ser certificado além do teste visual de rotas acima.

## Testes com estudantes e privacidade

O protocolo [learn-student-usability-protocol.md](learn-student-usability-protocol.md) e a ficha [learn-student-session.json](templates/learn-student-session.json) estão preparados. **Nenhum estudante participou**; não há resultados, satisfação, tempos ou evidências de aprendizagem coletados. O protocolo pede consentimento, perfil temporário local, coleta mínima e descarte. Teste com participantes não deve começar até o responsável aprovar aviso de privacidade, retenção e consentimento.

## Checklist de prontidão

| Frente | Situação verificável | Bloqueio antes da liberação pública |
|---|---|---|
| 1. Conteúdo EN/RU | Auditoria estrutural e correções mecânicas concluídas | Revisão linguística e pedagógica independente por idioma |
| 2. Listening | Player técnico disponível para prática local; manifest validado | Gravações autorizadas/licenciadas, conferidas por falantes qualificados e testes de compreensão; até lá, `notAssessed` |
| 3. Respostas abertas | Ficha contextual exportável; eventos permanecem incertos | Autenticação/autorização real de revisor, endpoint privado, persistência append-only e auditoria; depois, concordância de especialistas |
| 4. Experiência | Automação de interface e protocolo preparados | Sessões reais consentidas com estudantes EN/RU e correções derivadas das observações |
| 5. Segurança/publicação | Dados locais, flags loopback, rotas públicas não renderizaram | Acesso de leitura Vercel ao projeto correto, confirmação do SHA/ambiente, revisão de privacidade e autorização explícita de lançamento |

## Pendências e instrução operacional Vercel

No Vercel, conectar/autorizar a integração de leitura para a equipe `matheus2ts-projects` e para o projeto existente `matheus2t`. Não criar projeto substituto. Depois disso, consultar deployment `Production`, domínio `matheus2t.com.br`, SHA, alias e estado antes de afirmar publicação.

Antes de ativar para estudantes, concluir revisão independente EN/RU, providenciar áudio validado, implementar revisão humana protegida ou manter abertas incertas, aprovar consentimento/retenção e executar o protocolo. Ativação pública exige uma decisão explícita posterior; checks técnicos e merge não constituem essa autorização.
