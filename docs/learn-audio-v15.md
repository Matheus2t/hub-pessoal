# 2T Learn V15 — infraestrutura de áudio

## Escopo e disponibilidade

V15 adiciona a infraestrutura reutilizável para gravações de Listening e ditados.
Não incorpora nem publica as 32 atividades de Listening e 32 de ditado dos rascunhos
editoriais V13/V14. Esses conteúdos continuam fora da experiência de estudantes.

O manifesto atual contém 124 registros, todos sem URL de áudio, com avaliação auditiva
desativada e **zero gravações homologadas**. Nenhum arquivo de fala foi criado ou
aprovado nesta etapa. A síntese do navegador continua disponível somente como prática
legada, identificada como não validada e nunca pontuada como acerto auditivo.

## Implementação

- `audio-assets.ts` valida o manifesto, exige caminhos de áudio na mesma origem e
  bloqueia fontes externas, licenças não aprovadas e gravações não validadas.
- A reprodução pública exige `publicRelease`; a prévia não pública exige loopback e
  o parâmetro local exato `learn-preview=audio-v15`. Fixtures de teste são tons sem
  fala, rotulados como teste, não são conteúdo didático e nunca habilitam avaliação.
- `learn-recording-player` usa `<audio preload="none">`, sem autoplay. Oferece
  reproduzir, pausar, reiniciar, repetir, progresso, volume e velocidade, anuncia erros
  e libera a fonte ao sair ou trocar de atividade. Players simultâneos pausam os demais.
- Uma gravação só conta como ouvida depois da reprodução completa. Listening fechado
  só pode ser corrigido com gravação homologada; compreensão aberta permanece `uncertain`.
  Ditado aplica normalização técnica conservadora e variantes completas explícitas; mantém
  `е` e `ё` distintas, não remove negação e deixa variantes desconhecidas como `uncertain`.
- Conteúdo com `audioAssetId` obrigatório não cai para síntese quando falta gravação.
  Atividades legadas sem esse campo continuam usando síntese somente para prática.
  Consultar transcrição é registrado como ajuda e impede evidência independente.
- `audioEvidence` é extensão aditiva da tentativa. IndexedDB v3, registros existentes e
  importação/exportação de backups v1, v2 e v3 foram preservados.
- O plano diário só inclui Listening/ditado quando houver gravação aprovada e reproduzível.
  Dashboard e histórico distinguem resultados incertos/não avaliados de acertos.

## Validação local

- Typecheck e build de produção: aprovados.
- Validadores Learn: 13 aprovados, incluindo estrutura pedagógica, diagnósticos,
  contratos de conteúdo, readiness, manifesto de áudio, catálogos e progressão V12.
- Playwright Learn: **139/139 aprovados**, incluindo C1–C5, legado, áudio, backups,
  persistência, layouts e temas. Os testes V15 verificam playback, pausa, retomada,
  repetição, volume, velocidade, erros, limpeza, player único, transcript/help e
  bloqueio de atividades sem gravação.
- `git diff --check`: aprovado.
- Pytest integral: **não concluído**. Os quatro testes iniciais de API passaram; a suíte
  ficou bloqueada ao entrar em `backend/tests/test_call_channel.py::test_persistent_definition...`.
  A pilha aponta `asyncio`/AnyIO aguardando o socketpair local durante a inicialização do
  `TestClient` no Windows. O V15 não altera backend; esse resultado não é contado como
  aprovação nem como defeito do código Learn.

## Pendências para conteúdo real

Antes de ativar Listening ou ditados: obter gravações com licença documentada, confirmar
atribuição e proveniência, revisar idioma/locução/transcrição, integrar URLs same-origin,
validar os arquivos e habilitar avaliação apenas para registros homologados. Sem esses
passos, o comportamento correto permanece indisponível/não avaliado. Esta branch não
ativa `publicRelease`, não altera o backend e não publica as experiências V13/V14.

## Investigação e CI do Pytest (PR #120)

- No executor local Windows, com Python 3.13.9 (Anaconda), o teste `test_persistent_definition_outlives_ttl_empty_channel_and_fresh_server` bloqueou ao entrar no `TestClient` (`backend/tests/test_call_channel.py:20`). O stack do faulthandler ficou em `asyncio`/Proactor, dentro de `socket._fallback_socketpair()` aguardando `accept`, antes da inicialização do app.
- Um subprocesso Python isolado que executava somente `socket.socketpair()` também excedeu cinco segundos. Isso demonstra uma limitação do executor/sandbox local, fora do FastAPI; não prova incompatibilidade geral do Windows nem substitui a execução em CI.
- O workflow `.github/workflows/python-tests.yml` executa Python 3.12 em Ubuntu e Windows, roda os testes Call separadamente e depois a suíte integral. `pytest-timeout` é dependência somente de teste (`backend/requirements-test.txt`), com 120 s por teste e limite de 20 min por job; os relatórios JUnit são preservados como artifacts.
- A primeira execução CI falhou na coleta em Ubuntu e Windows por falta de argon2; a dependência de teste foi adicionada a backend/requirements-test.txt. Depois, os testes Call isolados passaram nos dois sistemas. A falta de tzdata no Windows também foi corrigida com dependência somente de teste; o teste America/Sao_Paulo passou na execução seguinte.
- No commit 749a26d, o Pytest integral executou 339 casos: Ubuntu registrou 332 aprovados, 2 falhos e 5 skips; Windows, 336 aprovados, 2 falhos e 1 skip. As duas falhas eram testes obsoletos: enviavam type: create com admin inválido e esperavam unauthorized, embora Create.admin seja opcional legado e salas privadas não usem chave de proprietário.
- Os testes agora verificam o limite real de cinco criações por endereço confiável, sua resistência a x-forwarded-for falsificado e, separadamente, o bloqueio após cinco falhas reais de autenticação em channel_admin. Nenhum comportamento de produção foi alterado para satisfazer as expectativas obsoletas.
- No SHA 156b67f, o Pytest integral passou nos dois sistemas: Ubuntu, 335 aprovados e 5 skips (testes do launcher PowerShell); Windows, 339 aprovados e 1 skip (um teste exige o frontend compilado antes). O subconjunto Call passou com 34 testes em cada sistema. Build, backend, frontend, browser, salas privadas e teclado fonético também passaram no mesmo SHA. O workflow usa Python 3.12, timeout de 120 s por teste e 20 min por job; -rs registra os motivos dos skips. Os testes locais que iniciam TestClient continuam limitados pelo bloqueio de socketpair/asyncio observado neste executor.
