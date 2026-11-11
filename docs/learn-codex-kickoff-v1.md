# 2T Learn — Dossiê técnico de início de implementação (Codex)

**Estado do projeto:** o trabalho pedagógico **preparatório necessário à engenharia está encerrado**. Este documento é uma **especificação de execução**, não um prompt.  
**Próximo passo:** implementar um **protótipo de aula contextualizada, desativado para o público**, com dados separados do Learn legado.  
**Não inclui:** certificar conteúdo como linguisticamente aprovado, desenvolver curso inteiro, IA avaliadora, ensino oral, alterar outros módulos ou ativar novas rotas sem autorização.

## 1. Ponto de partida real do código

| Responsabilidade existente | Arquivos / comportamento |
|---|---|
| Roteamento por hash | `frontend/src/catalog.ts` restringe atividades de `#/learn/en` e `#/learn/ru`; `frontend/src/components/app-shell.ts` interpreta rotas |
| Entrada do Learn | `frontend/src/learn/host.ts` carrega `/learn.js` sob demanda |
| Página e navegação | `frontend/src/learn/page.ts` disponibiliza áreas por idioma |
| Catálogo legado | `frontend/src/learn/catalog-loader.ts` e `content.ts`, consumindo `/learn/en.json` e `/learn/ru.json` |
| Sessão antiga | `frontend/src/learn/session.ts`; `evaluateAnswer` no `engine.ts` compara respostas cadastradas |
| Trilha e plano atual | `path.ts`, `path-page.ts`, `planning.ts`, `selection.ts` e `daily.ts` |
| Dashboard e provas | `dashboard.ts`, `assessment.ts` |
| Digitação russa | `phonetic-editor.ts`, sem inferir pronúncia |
| Armazenamento local | `storage.ts` abre IndexedDB `2t-learn`, **versão 2**, com stores `attempts`, `cards`, `planning` |
| Backup | `model.ts`, `backup.ts` e `backup-page.ts`: formatos `2t-learn` **v1 e v2**, importação por substituição atômica |
| Testes | `frontend/tests/learn-*.spec.ts` e scripts `npm run learn:*` no CI |

**Importante:** a trilha legada marca domínio por resultados repetidos de exercício em dias diferentes. Não reaproveitar esse indicador como proficiência comunicativa do currículo novo. Os exercícios de escrita legados agora dizem apenas se encontraram uma resposta cadastrada; o campo `Attempt.correct` permanece histórico.

## 2. Fontes de conteúdo prontas

Ler diretamente os **arquivos reais**, sem reconstruí-los do zero:

| Arquivo | Função |
|---|---|
| `frontend/public/learn/pedagogy-v1/en.json` | Currículo e objetivos do Inglês |
| `frontend/public/learn/pedagogy-v1/ru.json` | Currículo e objetivos do Russo |
| `en-pilot.json` / `ru-pilot.json` | Diálogos, etapas, ajuda e status inativo |
| `pilot-task-rubrics.json` | Rubricas das quatro produções abertas |
| `evaluation-policy.json` / `evidence-contract.json` | Resultados, evidências, limites e ajudas |
| `en-diagnostic.json` / `ru-diagnostic.json` | Diagnóstico futuro, **não parte do primeiro PR** |
| `en-reading-guide.json` / `ru-reading-guide.json` | Extensões de leitura futuras |
| `pilot-delayed-probes.json` | Retomadas D+2 e D+7, **sem agendamento automático neste PR** |
| `pilot-asset-curation.json` | Itens legados que podem servir de apoio |
| `readiness-manifest.json` | Escopo congelado, IDs e portões de revisão |

Os pilotos têm `contentVersion:1`; continuar referenciando essa versão em qualquer registro novo. O conteúdo antigo em `en.json`/`ru.json` **não deve ser reescrito** para suportar o método novo.

## 3. Primeira implementação: C1 — protótipo desligado do Inglês

### C1.1: leitura e validação
- Criar um leitor separado e tipado dos JSONs `pedagogy-v1`; não forçar os roteiros novos no tipo antigo `Exercise`.
- Validar versão, idioma, ID, chaves, referências às rubricas, alternativas e estado de revisão.
- Falha de conteúdo tem aviso claro e permite retornar ao Learn antigo; não alterar histórico.
- Distinguir **suporte disponível**, **suporte mostrado** e **exemplo exibido após a tentativa**.

### C1.2: interface mínima
- Reutilizar Lit, TypeScript, SCSS e componentes visuais já presentes.
- Criar tela interna de piloto apenas sob **flag explícita de prévia**, desligada por padrão. Não adicionar card público nem tornar o roteiro acessível a estudantes por acidente.
- Jornada Inglês: objetivo → diálogo textual → duas perguntas de compreensão → observações de uso → escrita guiada → transferência em reunião online → tela de resumo **sem nota de fluência**.
- Exibir `lang="en"` para material-alvo e PT-BR para explicações.
- Responsividade em 320, 390, 768 e 1366 px; navegação por teclado, foco previsível e mensagens acessíveis.

### C1.3: registro seguro
- Antes de gravar evidências novas, implementar extensão **aditiva** de IndexedDB ou mecanismo equivalente transacional, sem alterar stores existentes.
- Criar eventos versionados com `eventId`, idioma, `unitId`, `contentVersion`, `taskId`, evidência, resposta, ajudas mostradas, timestamps, estado de revisão e feedback. Referência: `evidence-contract.json`.
- **Nunca** gravar as respostas abertas nas tentativas legadas (`Attempt.correct`) para fingir classificação automática.
- Para resposta aberta sem revisor confiável: guardar como `uncertain`, oferecer orientação e permitir nova tentativa. **Não** atribuir `supported` pelo fato de a resposta coincidir com um exemplo.
- Evitar duplo registro após clique repetido/reload; preservar rascunho. Falha de armazenamento não pode produzir aviso falso de sucesso.
- Não reclassificar eventos antigos como domínio novo.

### C1.4: plano de compatibilidade de backup
- Especificar e testar a transição do backup para **v3 proposto** antes de ativar gravação de eventos novos.
- Importar v1 e v2 existentes, inicialmente com evidências novas vazias, sem descartar tentativas, cartões ou planejamento.
- Exportar e restaurar v3 incluindo as evidências novas, de maneira **atômica e íntegra**.
- Ajustar limites de arquivo/registros com testes de tamanho e operação offline, evitando truncamento silencioso.
- Restaurar backup v1/v2 sobre uma instalação com eventos novos só mediante confirmação explícita de substituição — nunca apagar dados novos sem aviso.
- Se não houver implementação segura de backup v3 nesta primeira entrega, manter persistência nova desligada e não anunciar progresso salvo.

### C1.5: publicação e liberação
- Integrar à `main` após CI e testar que a flag pública continua desligada.
- A presença de JSON no bundle/servidor **não significa** liberação da experiência.
- Não alterar rotas ativas como `#/learn/en/writing`, `#/learn/ru` e `#/learn/en/path`.
- A confirmação de deploy real deve usar o domínio público e, quando disponível, o deployment exato da Vercel. Se não houver confirmação, reportar a limitação.

**Definition of Done C1:** uma aula inglesa **navegável em ambiente controlado de teste**, com registros novos seguros e backups compatíveis; sem inferir proficiência ou abrir ao público.

## 4. Segunda implementação: C2 — mesmo motor para Russo

Depois de estabilizar C1, utilizar **o mesmo mecanismo** para `ru-pilot-directions-01`, sem duplicar o motor.

- Integrar editor fonético já existente, com preservação de cirílico (incluindo `ё` quando relevante).
- Ao mostrar o destino `библиотека` no enunciado da transferência, gravar ajuda prévia `lexical-cue`; **não** inferir recuperação lexical independente.
- Verificar perguntas de localização e compreensão das direções.
- Garantir que dados EN/RU não se misturem e que trocar idioma não apresente o rascunho de outra língua.
- Manter os mesmos portões de revisão linguística e execução pública bloqueada.

## 5. Depois dos pilotos: C3, C4 e C5

| Entrega | Escopo | Condição |
|---|---|---|
| C3 — Diagnóstico | Executar as tarefas por idioma, feedback por evidência e recomendações explicáveis | Só após motor estável e regras para respostas abertas |
| C4 — Consolidação | Revisões com novas situações e registro de intervalos reais | Após persistência, versionamento e decisões de agenda |
| C5 — Integração | Plano diário, dashboard, expansão de unidades e publicação pública gradual | Após revisão linguística externa e teste com aprendizes |

Não misturar C3–C5 na primeira execução do Codex, mesmo que exista tempo livre. Melhor um marco seguro e completo que várias telas sem confiabilidade.

## 6. Testes obrigatórios da primeira entrega (C1)

| Cenário | Resultado observável |
|---|---|
| Flag desativada em produção | Nenhum link, rota ou atividade-piloto publicamente habilitados |
| Novo JSON de idioma incompatível | Falha clara e navegação legada preservada |
| EN, diálogo + pergunta fechada | Corrige por índice/explicação específica; marca apenas compreensão textual |
| Notice `en-intro-n1` | Não acrescenta evidência de domínio |
| Escrita aberta sem avaliador | Resposta salva como `uncertain`, nunca automaticamente `supported` |
| Abrir modelo antes da tentativa independente | Impede ou suprime classificação de independência; registra a ajuda |
| Digitar e atualizar a página | Rascunho e posição retomados, sem perder texto nem duplicar submissão |
| Repetir clique de salvar | Uma única evidência/evento idempotente |
| Sem IndexedDB / transação falha | Aviso e possibilidade de retentar, nenhum falso `salvo` |
| Importar backup v1 e v2 | Todos os registros antigos válidos continuam acessíveis |
| Exportar/importar v3 | Registros antigos + evidências novas restaurados integralmente |
| Backup v3 corrompido | Rejeição sem perda de dados anteriores |
| Duas abas | Sem duplicidade ou registro de outro idioma por engano |
| EN após RU (na etapa C2) | Histórico isolado por idioma |
| Sem áudio | Não há afirmação de listening avaliado |
| Regression suite | Testes atuais Learn + frontend + backend + Call continuam verdes |
| Layout e acessibilidade | 320/390/768/1366, foco, teclado, rótulos e `aria-live` adequados |

## 7. Critérios externos para liberar estudantes

Estes requisitos **não são trabalho automaticamente resolvível pelo Codex**:

- Revisão linguística independente dos dois pilotos (naturalidade, registros e variantes).
- Teste com aprendizes reais, com consentimento, de instruções, clareza e dificuldade.
- Método adequado para revisar respostas abertas e seus estados `uncertain`.
- Confirmação de que o fluxo e os backups são confiáveis em produção.
- Autorização explícita para tornar o piloto público.

O Codex pode **preparar** o instrumento de validação e o ambiente de teste, mas não deve declarar avaliações externas que ainda não ocorreram.

## 8. Política de escopo e segurança

**Não alterar** Home, Ações, Calculadoras, Renda Fixa, Times, Call, Games, tema global ou projeto Vercel. Não migrar catálogo inteiro. Não alterar a stack Lit/TS/SCSS/esbuild + FastAPI. Não usar serviço externo de correção, gravação de voz, endpoint de IA, novo banco ou dados remotos sem autorização e análise de privacidade/custos.

**Primeira decisão de execução já tomada:** `C1` — motor de aula + compatibilidade de dados, protótipo EN desativado. O conteúdo e as regras já estão versionados; **não é necessário mais um ciclo de ideação antes de começar a codificar**.
