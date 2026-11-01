# 2T Learn — Etapa E concluída e lançamento validado

Publicado em **01/11/2026**, domínio oficial **https://matheus2t.com.br/#/learn**.
Etapas A, B, C, D e E concluídas no escopo funcional homologado.

## Referências do lançamento

- WIP de preservação: `ca7a65d4af30d41532dc774d8373ec77939d7efa`.
- Checkpoint local de homologação: `55b41d623f7d538d6c309468f91e1f3fce195bc7`.
- Correção de entrega Linux e SHA final homologado:
  `d8c244b90c2b6837957a90c63c198da372531f11`.
- PR aprovado pelos checks e integrado sem squash/force push:
  https://github.com/Matheus2t/hub-pessoal/pull/1
- Merge na main: `4c8929df587e9012d12dac886a9d2d8ba870b080`.
- Preview validado: `dpl_ANGBrsN7tT821YurgZSyqZw1CBLR`, READY, build 17 s,
  https://matheus2t-1rp1of6sz-matheus2ts-projects.vercel.app
- Primeiro deployment público do lançamento:
  `dpl_FTbEMPgzmkdintPiNdFSNU2b4Sug`, READY, build 18 s,
  https://matheus2t-kabpoql4l-matheus2ts-projects.vercel.app
  corresponde ao merge `4c8929d` e recebeu o domínio oficial.
- Esta atualização posterior registra o resultado em main; altera apenas documentação,
  sem alterar os arquivos ou o backend homologados. O histórico abaixo registra os
  checkpoints anteriores, cujos avisos de publicação pendente não são o estado atual.

## Resultado real da homologação e produção

- Typecheck/build aprovados. Pytest: **101 aprovados**. Playwright completo:
  **171 aprovados, 1 TradingView live optativo ignorado**. Quatro fluxos afetados
  pelo ajuste de idioma repetidos com aprovação. Após a correção WebP: novamente
  101 testes Python e o caso HTTP estáticos/API aprovados. Não houve exclusão de testes.
- Preview autenticado por OIDC temporário e restrito à própria origem, sem desativar
  proteção. Inglês/Russo: vocabulário, flashcards, escrita, leituras, gramática,
  avaliações de 30 questões, recarga, plano retomável, dashboard e backup testados.
  Áudio sem voz real manteve o bloqueio correto; reprodução efetiva foi testada com
  mocks localmente. Backup exportado/restaurado em perfil isolado: **78 tentativas,
  2 cartões e 4 registros de planejamento**, sem tocar em dados reais de usuários.
- O primeiro acesso sem autenticação encontrou o login Vercel e foi interrompido;
  não conta como aprovação. O primeiro verificador remoto completou os fluxos,
  mas esperava que um h1 oculto do componente persistente fosse visível ao mudar
  para outras ferramentas. Corrigido somente o seletor do verificador para o
  componente visível de cada módulo; as 39 rotas passaram na conferência seguinte.
- Produção pública, **sem credenciais**: os mesmos fluxos completos passaram em
  contexto descartável. As 39 rotas verificadas incluem os dois idiomas e todas
  as modalidades, calculadoras, catálogo/alias legado, Ações, Renda Fixa e três times.
  Homepage com card Learn, navegação direta, mobile e recarga aprovadas.
- HTTP: `/` **200 text/html**; bundle.js e learn.js **200 JavaScript**;
  styles.css **200 text/css**; en.json/ru.json **200 application/json**;
  SVG **200 image/svg+xml**; WebP **200 image/webp**.
  Hashes dos arquivos estáticos conferem com o build local, sem mistura de versões.
- `/api/health`: **200**, status ok. `POST /api/calculations`: **200**, entrada
  1000 + 100 mensais, 1% ao mês, 3 meses → **1333,31**, resultado esperado.
- Verificador público: **0 pageErrors, 0 consoleErrors, 0 failedRequests,
  0 respostas HTTP >=400 observadas**. Sem erro 500 nos testes realizados.
- Consulta de runtime ao primeiro deployment, últimos 15 minutos até
  13:12 UTC (10:12 de São Paulo): **0 registros level:error**.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades reportadas.
  CSP e permissões preservadas. Arquivos sensíveis permanecem fora do Git.

## Conteúdo, dados e limitações públicas

Por idioma: **150 palavras, 50 frases, 30 listening, 30 ditados, 40 escritas,
10 leituras, 10 lições de gramática e 90 questões adicionais** (30 compreensão,
30 gramática, 30 avaliação). Os 600 IDs originais permanecem intactos.

IndexedDB v2: upgrade aditivo v1, idiomas isolados, tentativas idempotentes,
SRS preservado e restauração transacional. Backup v2 inclui histórico finalizado,
cartões, configurações e retomada do plano; importa v1 com aviso explícito de
substituição dos planos/configurações. Rascunhos de avaliação são temporários da
aba e ficam fora do backup. Progresso é local ao navegador/origem, sem sincronização.

Limitações não bloqueantes: revisão editorial assistida, sem revisão linguística
humana ou certificação CEFR; nenhuma validação auditiva real (lista de vozes vazia
no ambiente). A ausência de voz é informada e não compromete as modalidades sem
áudio. Sem teste humano de leitor de tela; semântica, foco, idiomas e teclado foram
verificados automaticamente. Não há falha funcional bloqueante conhecida.

## Rollback

Referência anterior: main `1fdf509947bfb9b20562125d90d7a5dd1c3357a1`, deployment
`dpl_9HN4eopFiiCxVRV13BKsRWaWSQA4`.
Se ocorrer regressão crítica, executar no mesmo projeto/time:

```powershell
npx --yes vercel@65.9.0 --scope matheus2ts-projects rollback https://matheus2t-c74g12ifa-matheus2ts-projects.vercel.app
```

Conferir domínio, `/api/health` e estáticos após rollback. O rollback de tráfego
não remove IndexedDB nem backups dos usuários. Para corrigir o histórico Git,
reverter o merge por novo PR, sem reset/force push. O rollback Vercel pode suspender
atribuição automática de novos deploys; retomar a promoção somente após nova validação.

---

## Registro anterior à publicação

# 2T Learn — Etapa E: homologação local aprovada

Estado em 01/11/2026: A–D homologadas localmente; preview, integração e produção
pendentes neste checkpoint. Branch `codex/2t-learn`.
Checkpoint WIP de preservação: `ca7a65d4af30d41532dc774d8373ec77939d7efa`,
enviado e confirmado remotamente antes da continuação.

## Correções de homologação

- Duas abas podem enviar o mesmo item diário. O banco já deduplicava o evento,
  mas a segunda aba mostrava o resultado recalculado localmente. Agora recupera
  o resultado persistido e informa que a tentativa já foi registrada, preservando
  nota, intervalo SRS, contagem e feedback verdadeiro.
- Respostas em português de vocabulário/listening/leitura/compreensão e nomes
  de gênero em gramática russa têm `lang=pt-BR`. Respostas no idioma estudado
  recebem o idioma correspondente, inclusive na correção da avaliação.
- IDs, conteúdo e esquema IndexedDB não foram alterados nesta etapa.
- No preview Linux, WebP era entregue como text/plain; registro explícito de
  image/webp no FastAPI corrige a entrega estática sem alterar endpoints/cálculos.
  Após a correção, Pytest 101 e o teste HTTP de arquivos/API passaram novamente.

## Evidências locais

- Typecheck e build de produção aprovados. Bundle principal ~140,9 kB; módulo
  Learn ~84,4 kB minificado. Catálogos: ~176,5 kB en e ~196,8 kB ru, sob demanda.
- Pytest: **101 aprovados**; Playwright completo: **171 aprovados, 1 ignorado**.
  O teste ignorado é o TradingView live optativo, não um teste do Learn.
- Após o último ajuste de idioma, repetidos somente os quatro fluxos afetados
  de estudo/áudio e avaliações en/ru: **4 aprovados**.
- Novos testes E: concorrência real de duas abas, backup sem requisições de
  escrita externas, HTML importado inerte, foco/redução de movimento/idioma e
  histórico com 10.000 eventos isolados (5.000 por idioma), sem carregar Learn
  na homepage geral. Renderização e navegação passaram no limite de 15 segundos.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades reportadas.
- Inspeção estática: sem unsafeHTML/innerHTML no Learn ou segredos adicionados.
  A política CSP existente foi preservada. Backup continua processado localmente.
- Capturas das cinco larguras/ambos os temas/idiomas produzidas pela suíte;
  amostras de seleção, ditado, gramática, dashboard e diálogo inspecionadas em
  1920/1366/768/390/320 px. Sem overflow nos testes. Foco e feedback semânticos
  verificados; não houve teste humano com leitor de tela.
- Vozes reais: navegador retornou lista vazia. Mocks validaram reprodução,
  repetição, velocidade, parada/cancelamento e ausência de voz. Audição real e
  revisão linguística humana continuam pendências não bloqueantes documentadas.
- `git diff --check` aprovado. Artefatos em `.vercel/learn-e-full`,
  `.vercel/learn-e-audit` e `.vercel/learn-e-final-language-check` (ignorados).

O primeiro acesso não autenticado ao preview foi redirecionado ao login Vercel;
esses casos não contam como testes funcionais aprovados. A homologação remota
usa OIDC temporário via CLI, restrito ao domínio, preservando Deployment Protection.

## Publicação e rollback — referência antes da integração

Projeto existente: `matheus2t`, time `matheus2ts-projects`.
A CLI autenticada confirmou o alvo; o conector MCP não tinha acesso e não foi usado
para alterar permissões. Nenhum projeto/domínio foi criado ou reconfigurado.
Main anterior: `1fdf509947bfb9b20562125d90d7a5dd1c3357a1`.
Deployment anterior: `dpl_9HN4eopFiiCxVRV13BKsRWaWSQA4`, READY, produção,
`https://matheus2t-c74g12ifa-matheus2ts-projects.vercel.app`.
Em caso de falha crítica de lançamento, utilizar o rollback desse deployment no
projeto existente e conferir o domínio/health; não resetar o banco dos navegadores.
O código anterior também permanece no SHA main registrado, sem force push.

Limites aceitos: progresso local sem sincronização; não há certificação CEFR;
rascunhos de avaliações ficam na aba e não integram backup v2, enquanto resultados
finalizados, cartões, configurações e estado de retomada do plano integram o backup.
As pendências editoriais/auditivas não bloqueiam o restante das modalidades.

---

## Registro das etapas anteriores

# 2T Learn — Etapas C e D concluídas funcionalmente

Branch: `codex/2t-learn`. Validação em 01/11/2026.
Checkpoint C publicado: `a7717a46c42f2b534caf9120b02caef8eae4d7a5`.
Checkpoint D: commit que contém esta atualização, posterior ao checkpoint C.
Sem merge na main, deploy de produção ou início da Etapa E.

## Etapa D — entregas

- Plano diário por idioma com meta de 1–100 respostas, tempo desejado de 1–180
  minutos, modalidades e preferência por revisão/conteúdo novo. A meta é medida
  por respostas efetivamente salvas, inclusive incorretas; minutos desejados não
  são convertidos em tempo fictício nem declaram cumprimento de uma meta temporal.
- Seleção por regras: revisões vencidas (palavras e frases), erros não corrigidos,
  assuntos menos praticados, itens novos e preferências; desempate determinístico.
  Repetições praticadas perdem prioridade. Não há geração de exercícios ou IA externa.
- Plano e atividade selecionada são persistidos. Ao reabrir, retoma-se o item;
  apenas abrir não conclui. IDs de tentativa por plano/item impedem duplicação
  por recarga, cliques repetidos ou retomada. Alterar a meta preserva respostas já
  registradas e recompõe a fila restante. Eventos históricos nunca são editados.
- Dia e fuso fazem parte da chave. A mudança cria um plano distinto, preservando
  os anteriores. O dia é calculado no fuso local capturado, não por data UTC.
- Sem voz compatível, áudio não é marcado como concluído. O usuário pode montar
  alternativas sem áudio; os exercícios auditivos permanecem sem resposta.
- Dashboard com tentativas, acertos, taxa, tempo registrado, dias/sequência,
  vocabulário estudado/dominado pelo critério SRS existente, revisões e assuntos.
  Gráficos de barras monocromáticos: 7/30 dias, acertos/erros por modalidade,
  desempenho por dia praticado, tempo por modalidade e revisões. Valores reais,
  tabelas acessíveis e estado vazio; histórico filtrável por data/modalidade e paginado.
- Visão geral de en/ru com atividades, revisões, última atividade e situação do
  plano, além de acesso para continuar. Dados sempre separados por idioma.
- Player reutilizável com reprodução/repetição, parar, velocidade, estado e erros;
  cancelamento/tokens impedem que áudio interrompido libere Listening/Ditado.
- Backup local v2 com tentativas, cartões, configurações e planos/atividade ativa
  dos dois idiomas. Leitura e download locais, sem upload a terceiros. Prévia com
  quantidades por idioma, confirmação explícita e substituição integral sem mescla.
- Importação v1 preservada: prévia avisa que planos/configurações atuais serão
  removidos porque não existem no arquivo antigo. Cancelar não escreve nada.

## Persistência e limites do backup

IndexedDB evolui de 1 para 2 adicionando apenas o store `planning`. Stores
`attempts`/`cards`, índices, chaves e registros anteriores são preservados.
`snapshot()` exporta v2; `parseBackup()` aceita v1 e v2. A restauração dos três
stores ocorre na mesma transação. Erros de escrita abortam a substituição inteira.
Confirmação também é obrigatória quando só existem configurações/planos locais.

Validação: até 5 MB UTF-8, 10.000 tentativas, 10.000 cartões e 2.000 registros de
planejamento; IDs/chaves duplicados, datas/valores inválidos, planos inconsistentes,
versões/JSON incompatíveis e vínculos plano/tentativa incorretos são recusados.
Os limites são informados na interface; não há exportação parcial silenciosa.

A retomada do plano guarda o **item selecionado e as respostas já salvas**, não
texto ainda não enviado nem a posição de reprodução de uma síntese interrompida.
Rascunhos de avaliações da Etapa C são temporários de cada aba (sessionStorage),
não são histórico nem integram o backup v2 do IndexedDB. Finalize a avaliação
antes de exportar se quiser incluir seu resultado no arquivo.

## Validação final C+D

- Build de produção e typecheck aprovados; bundle Learn separado (~81,9 kB
  minificado), sem novas dependências e com carregamento sob demanda preservado.
- Pytest: **101 aprovados**, com PYTHONPATH=backend e diretório temporário
  `.vercel/pytest-learn-cd-final-20261101`.
- Suíte geral Playwright: **167 aprovados, 1 ignorado**, sem falha.
  São 15 testes novos de C e 15 de D, além da regressão existente.
- Após incluir revisões de frases na seleção diária, repetida somente a suíte D:
  **15 aprovados**. O teste puro confirma prioridade de revisões de frases e de
  exercícios com erros recorrentes. Build/typecheck novamente aprovados.
- Backup reforçado com tentativas e cartões dos dois idiomas, além dos planos:
  **2 testes repetidos aprovados**, verificando exportação/restauração exatas e
  rollback dos três stores. Nenhum teste desativado foi contado como aprovado.
- TradingView live continua optativo e ignorado. Áudio automatizado usa mocks;
  não houve validação auditiva humana nem comprovação de vozes reais instaladas.
- Upgrade real de banco v1 com tentativa/cartão e data de revisão preservados;
  recarga/retomada, metas, isolamento, virada de dia, fuso, filtros, indisponibilidade
  auditiva, parada, arquivo excessivo, JSON inválido, duplicatas, cancelamento e
  falha transacional cobertos. Os testes A/B/C continuam aprovados.
- Larguras 1920/1366/768/390/320, ambos os temas e idiomas: 100 capturas das
  atividades C e 60 das telas D, incluindo diálogo de backup e gráficos com dados
  de teste isolados. Overflow horizontal verificado em todas; amostras das cinco
  larguras inspecionadas visualmente. Histórico/tabelas têm rolagem interna.
- A primeira rodada D encontrou seletor de teste ambíguo (campo e barra com mesmo
  nome) e overflow real do seletor de arquivo no celular. Seletor tornou-se específico
  ao campo numérico; layout do arquivo foi corrigido, sem mascarar overflow.
- `git diff --check` aprovado. Backend, calculadoras, Ações, Renda Fixa e Esportes
  não foram modificados; regressões dessas áreas passaram na suíte geral.

Artefatos ignorados pelo Git: `.vercel/learn-cd-final`, `.vercel/learn-d-final-verified`
e `.vercel/learn-d-backup-final`. O servidor de teste usa VERCEL=1,
PUBLIC_HISTORY_ENABLED=false e MARKET_DATA_PUBLIC_ENABLED=false, apenas localmente.

## Conteúdo e limites editoriais

Os 600 itens/IDs de B permanecem intactos (300 por idioma).
C acrescentou **10 leituras + 10 lições + 90 questões por idioma**:
30 de compreensão, 30 gramaticais e 30 de avaliação. Totais C: 20 leituras,
20 lições e 180 questões nos dois idiomas. D não acrescenta conteúdo artificial.

Revisão linguística assistida, sem revisão humana ou certificação CEFR. Níveis
A1/A2 orientativos, correção objetiva por variantes cadastradas e transliteração
russa didática, não fonética. Vozes reais dependem do navegador/sistema; indisponibilidade
é explícita. Não há contas, sincronização em nuvem ou dependência de API paga.
Não há bloqueio funcional conhecido nas etapas C/D. A validação de lançamento,
revisão humana opcional e publicação continuam reservadas à Etapa E.

---

## Registro do checkpoint C (antes da Etapa D)

# 2T Learn — checkpoint da Etapa C

Etapa C concluída funcionalmente em `codex/2t-learn`, a partir de `f2ab5f8`.
Etapa D ainda não iniciada neste checkpoint. Sem merge ou deploy de produção.

## Entregas C

- Por idioma: 10 leituras originais e traduzidas, cada uma com vocabulário
  referenciado e 3 perguntas; 10 lições com objetivo, explicação em português,
  exemplos traduzidos, erros comuns e 3 exercícios; 30 questões distintas de avaliação.
  Total C: 20 textos, 20 lições e 180 questões nos dois idiomas.
- Novos campos aditivos do catálogo e validação de referências; os 600 IDs de B
  foram preservados. Fonte editorial: `scripts/learn/extended-content.py`.
- Leitura e gramática usam o registro de tentativas existente; abrir uma unidade
  não a conclui. A lista mostra questões efetivamente respondidas, sem declarar domínio.
- Avaliação com navegação, rascunho recuperável nesta aba (sessionStorage), contagem,
  finalização transacional das 30 respostas, deduplicação por IDs estáveis da sessão,
  resultados reais por assunto e correção somente após salvar. Sair não finaliza;
  fechar a aba pode perder o rascunho, mas não remove tentativas já registradas.
- Caderno de erros por idioma, filtros de modalidade/assunto/histórico, registros
  originais preservados, referência ausente explicitada e recuperação com mesmos IDs.
- Treino direcionado usa os últimos 20 registros por tema, mínimo de 3 tentativas
  e 2 erros. Prioriza itens não corrigidos, recorrentes e recentes; não inventa exercícios.
- Tentativa de recuperação gera novo evento, sem editar erros anteriores.

## Validação C

- Typecheck/build aprovados; Pytest 101 aprovados.
- Learn A/B/C: 50 testes distintos aprovados, incluindo os 15 novos da Etapa C.
  A rodada inicial teve 49 aprovados e um teste legado esperando 3 áreas indisponíveis.
  Atualizado para as 8 áreas existentes; repetição do caso aprovada. Sem falha pendente.
- Os 2 testes de integridade foram repetidos após corrigir um caractere latino
  indevido no exemplo de caso russo. IDs e referências aprovados.
- Cobertura: dois idiomas, questões persistidas, abrir sem gravar, avaliações com
  recarga/deduplicação, abandono, caderno, conteúdo removido, treino e rollback da
  transação de avaliação; regressão A/B e IndexedDB/backups v1 preservados.
- 100 capturas de C nas cinco larguras, ambos os idiomas/temas; overflow verificado
  em todas. Inspecionadas amostras de leitura, gramática, avaliação e caderno em
  1920/1366/768/390/320 px. Navegação por teclado testada.
- Artefatos locais: `.vercel/learn-c-validation`, `learn-c-content-final`, `learn-c-retry`.
- `git diff --check` aprovado.

## Limitações C

Conteúdo original com revisão assistida; sem revisão humana, certificação CEFR ou
avaliação semântica. Variantes são explícitas; outras traduções podem ser legítimas.
A avaliação é educacional, sem classificação certificada. Síntese de voz continua
sujeita às vozes instaladas (limitação de B, não alterada por C).
Rascunhos de avaliação são próprios da aba; histórico só é gravado na finalização.

---

## Registro da Etapa B (anterior à C)

# 2T Learn — Etapa B concluída

Revisão final: 01/11/2026. Branch: `codex/2t-learn`.
Base preservada: `bcc1183e996a0290022277a8d5acc20d2f23787c`.
Checkpoint de recuperação da auditoria: `6be0c4c` (também enviado ao GitHub).

**Etapa B concluída no escopo funcional: Vocabulário, Flashcards, Listening,
Ditado e Escrita, em Inglês e Russo. Sem regressões bloqueantes conhecidas.**
Não houve merge na main nem publicação de produção. Etapa C não foi iniciada.

## Revisado e corrigido

- Revisão assistida dos 150 vocábulos e 50 frases de cada idioma e dos exercícios
  derivados: grafia, exemplos, traduções, referências, classes gramaticais,
  gêneros russos, cirílico, transliteração didática e política de е/ё.
- Corrigido o gênero de `кровать` para feminino. Exceções de gênero ficam
  explícitas no gerador. Classes de numerais/advérbios passam a usar IDs estáveis,
  evitando depender da posição dessas entradas no arquivo-fonte.
- Reclassificadas frases com construções mais complexas de A1 para A2 aproximado.
  Esses níveis são orientativos: não houve certificação CEFR nem revisão humana.
- Acrescentadas variantes explícitas de tradução em vocabulário e listening
  (por exemplo, “boa noite”, “obrigada”, “uma”, “duas”) e de escrita
  (por exemplo, “city center”, “round-trip ticket”, “He cycles to work”).
  Retirada uma variante que acrescentava “por favor” à frase original em russo.
  Nenhuma correção semântica automática foi introduzida.
- A transição assíncrona do flashcard usa o idioma capturado na tentativa, sem
  depender de uma propriedade que possa mudar enquanto o banco abre.
- Novos testes cobrem filtros combinados, paginação, variantes, todos os graus,
  revisões vencidas/futuras, histórico extenso e navegação durante escrita lenta.
- Capturas agora abrangem as cinco modalidades, ambos os idiomas e temas.
  Cada idioma usa uma página de teste separada para não sobrepor mocks de voz.

## Funcionalidades validadas

- Vocabulário: busca por palavra/tradução, filtros de tema e nível individuais e
  combinados, paginação, exemplos, pronúncia quando disponível e tentativas salvas.
- Flashcards: revelação sem escrita, Esqueci/Difícil/Bom/Fácil, intervalos e datas,
  filtros de novas/pendentes/aprendizagem/futuras/frases/todas e recarga persistente.
- Listening e ditado: idioma correto, repetição, velocidade, erro de reprodução,
  ausência de voz e envio bloqueado até a conclusão do áudio; feedback e gravação.
- Escrita: respostas corretas/incorretas/vazias, variantes cadastradas, explicação,
  avanço e resumo da sessão. Ditado mantém ё distinta de е e normaliza caixa,
  espaços e pontuação conforme o núcleo existente.
- IndexedDB v1 preservado: deduplicação, falha de escrita/retry, transação atômica,
  rollback, isolamento en/ru, recarga e restauração de backup v1 compatível.
  Teste de volume utiliza 2.000 tentativas e 200 cartões, verifica todos os registros
  e datas restaurados e os filtros nos dois idiomas. São fixtures exclusivas de teste.
- Gravação pendente durante mudança de idioma e rota salva somente a tentativa
  original, sem misturar o novo idioma ou inserir feedback na sessão substituta.
  Não há migração destrutiva, renumeração ou alteração de versão do backup.

## Conteúdo final

| Categoria | Inglês | Russo |
|---|---:|---:|
| Vocabulário com exemplos | 150 | 150 |
| Frases contextualizadas | 50 | 50 |
| Listening | 30 | 30 |
| Ditado | 30 | 30 |
| Escrita | 40 | 40 |
| Total | 300 | 300 |

Total geral: **600 itens**. Flashcards derivados não são contados novamente.
Os exercícios reutilizam contextos do vocabulário; não são 600 textos independentes.
Fontes: `scripts/learn/vocabulary.tsv`, `phrases.tsv` e `build-catalogs.py`.
Comparação com o commit WIP confirmou todos os 600 IDs na mesma ordem.
Executar novamente o gerador produziu JSON idêntico (SHA-256 dos arquivos).

## Validação final e reprodução

- `npm run build`: aprovado, incluindo `tsc --noEmit` e build esbuild/SCSS.
- `$env:PYTHONPATH='backend'; python -m pytest backend/tests -q --basetemp=.vercel/pytest-learn-b-final-20261101`:
  **101 aprovados**. Usar um novo sufixo de pasta temporária em futuras execuções
  evita conflitos de permissão com artefatos existentes.
- `npx playwright test --output=.vercel/learn-b-final`: **136 aprovados, 1 falho,
  1 ignorado** na execução integral. O caso falho de proteção pública brapi exige
  servidor com `VERCEL=1`; o servidor inicial estava em modo local, no qual a
  disponibilidade é intencional. Nenhum código de mercado foi alterado.
- Servidor isolado com `VERCEL=1`, `PUBLIC_HISTORY_ENABLED=false` e
  `MARKET_DATA_PUBLIC_ENABLED=false` em 8124; `/api/health` confirmado HTTP 200.
  Com `BASE_URL=http://127.0.0.1:8124`, repetidos somente o caso brapi e os cinco
  testes de capturas com o isolamento de mocks corrigido: **6 aprovados**.
- Resultado consolidado: **137 testes distintos aprovados e 1 ignorado**.
  Os 9 testes adicionais da auditoria passaram na rodada integral. O teste live
  TradingView é optativo, permaneceu desativado e não conta como aprovado.
- Capturas finais: 1920/1366/768/390/320 px × en/ru × claro/escuro × cinco
  modalidades = **100 capturas**, sem overflow horizontal nos testes.
  Inspeção visual dos painéis de revisão das cinco larguras e amostras em tamanho
  original confirmou disposição, quebras de linha e legibilidade; sem redesign.
- Artefatos locais ignorados pelo Git: `.vercel/learn-b-final` e
  `.vercel/learn-b-final-verified`. `git diff --check`: aprovado.

O servidor deve estar acessível antes do Playwright. Para reproduzir a suíte inteira,
na raiz do projeto, iniciar um terminal com:

```powershell
$env:VERCEL='1'
$env:PUBLIC_HISTORY_ENABLED='false'
$env:MARKET_DATA_PUBLIC_ENABLED='false'
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8123
```

Em outro terminal: `Invoke-WebRequest http://127.0.0.1:8123/api/health`, depois
`npx playwright test`. Essas variáveis simulam políticas de produção somente no
servidor local de testes; não representam deploy ou alteração na Vercel.

## Limitações restantes e gravidade

- **Não bloqueante no escopo aprovado:** o Edge automatizado retornou zero vozes
  reais em `speechSynthesis.getVoices()`. Reprodução, erro, término, velocidade e
  seleção de idioma foram testados com mocks, não por audição real. Listening e
  ditado dependem de voz en/ru disponibilizada pelo navegador/sistema do usuário;
  sem ela, a interface informa indisponibilidade e impede respostas sem áudio.
  Resta conferir pronúncia e vozes reais nos dispositivos-alvo.
- **Limite editorial não bloqueante:** revisão assistida, sem revisor linguístico
  humano, certificação CEFR ou garantia de cobrir todas as traduções possíveis.
  Transliteração russa é didática, não fonética; a distinção е/ё é intencional.
  Variantes não cadastradas podem ser legítimas e a interface avisa essa limitação.
- **Teste externo optativo não executado:** TradingView live, fora da Etapa B.
- Não há pendência funcional bloqueante identificada nas cinco modalidades.
  Leitura, gramática, avaliações gerais, plano diário, dashboard avançado, UI de
  backup e sincronização continuam fora do escopo; não foram implementados.

## Registro histórico da Etapa A (antes da Etapa B)

As contagens zero e avisos de indisponibilidade no registro abaixo descrevem o
estado anterior; os dados atuais são os da tabela acima.

# 2T Learn — trabalho em andamento

**Etapa A implementada: interface, rotas e seleção de idiomas. O 2T Learn completo continua em desenvolvimento e não está publicado em produção.**

Checkpoint anterior: `1fdf509947bfb9b20562125d90d7a5dd1c3357a1`, branch
`checkpoint/pre-2t-learn-20261031`. Desenvolvimento: `codex/2t-learn`.
O núcleo original foi preservado. A integração desta etapa acrescenta rotas e um card na homepage, sem alterar cálculos, endpoints ou dados de outros módulos. A main não recebeu estas alterações.

## Implementado e verificado

- Tipos estritos para idiomas, conteúdo, tentativas e cartões.
- IndexedDB isolado `2t-learn`, versão 1; stores de tentativas e cartões;
  criação aditiva no upgrade e fechamento em mudanças de versão.
- Transação atômica para tentativa + cartão; IDs de tentativas idempotentes.
- Cartões identificados por idioma + item; salvar novamente não apaga revisões.
- Revisão inspirada no SM-2: esquecimento em dez minutos, difícil em um dia,
  bom em um/seis dias e intervalos progressivos; facilidade de 1,3 a 3.
- Estatísticas derivadas exclusivamente dos eventos e cartões de cada idioma.
  Domínio: pelo menos três revisões, intervalo >=21 dias e última nota boa/fácil.
- Normalização de caixa, espaços e pontuação; variantes explícitas; ё distinta
  de е por padrão. Não faz avaliação semântica de texto livre.
- Backup JSON v1, limites de tamanho/quantidade, validação de registros e chaves
  duplicadas; restauração substitutiva transacional com confirmação obrigatória
  quando já há dados. Não há mesclagem automática.
- Contratos/validador de conteúdo: IDs, repetições, respostas e referências;
  vocabulário russo exige cirílico. Não substitui revisão linguística humana.
- Adaptador SpeechSynthesis com seleção por idioma, preferência por voz local,
  ausência explícita de voz compatível e cancelamento da reprodução anterior.
  Integração com ciclo de vida da futura interface ainda pendente.

## Testes executados

Typecheck e build de produção aprovados. Seis testes Playwright aprovados:
normalização, intervalos, estatísticas independentes, backup, conteúdo e IndexedDB
real no navegador. O teste de banco verifica persistência após reload, deduplicação,
separação entre idiomas, substituição confirmada e rollback de atualização inválida.
O harness é servido por rota interceptada somente no teste; a CSP da aplicação não
foi alterada. A interface da Etapa A passou nos testes descritos abaixo.
Não foram testadas vozes reais disponíveis em diferentes sistemas operacionais.

## Pendências para a entrega solicitada

- Etapa A: concluída, conforme escopo específico desta entrega (sem atividades educacionais).
- Etapa B: vocabulário, flashcards, listening, ditado e escrita na interface.
- Etapa C: leituras, gramática, avaliações, caderno de erros e treino direcionado.
- Etapa D: plano diário retomável, painel visual, player integrado e tela de backup.
- Etapa E: conteúdo original revisado completo, testes de todas as atividades,
  acessibilidade e inspeção visual nas cinco larguras/ambos os temas; regressão e deploy.

Conteúdo cadastrado para uso real: **zero entradas/atividades em ambos os idiomas**.
Os exemplos no teste são fixtures, não um catálogo educacional. Não foram criados
dados repetidos para atingir as quantidades solicitadas. Ainda faltam, por idioma,
150 entradas, 50 frases, 30 listening, 30 ditados, 40 exercícios escritos,
10 leituras, 10 lições e 30 questões de avaliação.

Não integrar esta branch à main ou publicar como plataforma concluída antes de
implementar e validar essas pendências. O estado atual permanece na branch de desenvolvimento para continuação das etapas B–E.


## Etapa A — interface, rotas e seleção de idiomas

Rotas implementadas: `/#/learn`, `/#/learn/en` e `/#/learn/ru`. Outras rotas dentro
de Learn mostram uma página de recuperação com acesso à seleção, sem abrir banco
ou catálogo. Histórico nativo, recarga, URLs diretas, foco do shell, títulos e
breadcrumbs foram integrados ao roteador existente. A navegação principal foi
preservada; a homepage recebe apenas um quarto card no padrão retrato existente.

Componentes separados:
- `learn/host.ts`: carregamento adiado de `/learn.js`, loading e retry do módulo.
- `learn/page.ts`: seleção e ambiente reutilizável, com proteção contra respostas
  antigas de carregamentos assíncronos após navegar ou sair da página.
- `learn/progress.ts`: resumo derivado pelo `summarize` existente, sem inventar
  níveis, porcentagens ou eventos; mostra nível ainda não avaliado e sem respostas.
- `learn/area-card.ts`: oito áreas com status Conteúdo em preparação. São artigos,
  sem links ou botões que permitam abrir atividades inexistentes.
- `learn/catalog-loader.ts`: catálogo validado/cacheado por idioma, com retry após
  falha. Os manifestos `frontend/public/learn/en.json` e `ru.json` estão vazios.

O bundle principal recebe apenas o host leve. O módulo, persistência, estatísticas
e componentes Learn são empacotados em ESM separado; apenas ao entrar em Learn
o navegador importa `/learn.js`. O catálogo do idioma é buscado apenas quando
sua página é aberta. `npm run dev` faz o build desses arquivos antes de servir;
para alterações no código do Learn durante dev, executar novamente `npm run build`
(o watcher existente acompanha somente o entrypoint principal). Nenhuma dependência
foi adicionada. SCSS fica em `_learn.scss`, com tokens existentes.

Uma leitura transacional do snapshot por entrada/troca de página alimenta os
resumos. A UI não salva dados, não modifica o esquema, não zera nem migra progresso
nesta etapa. Falhas do armazenamento e do catálogo são independentes, com mensagens
não técnicas e botões de tentar novamente. O aviso de persistência local não promete
sincronização ou proteção contra limpeza dos dados do navegador.

### Validação da Etapa A

Typecheck/build aprovados; nove testes novos da interface aprovados, além dos seis
testes do núcleo. A suíte de interface cobre acesso pela homepage e por URLs,
teclado, títulos/breadcrumbs, reload/back/forward, estado vazio, catálogo sob demanda,
isolamento real en/ru no IndexedDB, contagem preservada sem escrita ao navegar,
erros de armazenamento e catálogo e recuperação por retry. Fixtures de progresso
existem somente nos testes, nunca na interface ou nos catálogos.

Capturas produzidas para seleção/Inglês/Russo em 1920, 1366, 768, 390 e 320 px,
claro e escuro. Inspeção visual e verificações de overflow confirmam a adaptação,
com cirílico legível e navegação disponível sem rolagem horizontal. Os testes de
homepage foram atualizados apenas para a adição do quarto card.

### Próxima etapa

Implementar as atividades, cadastrar/revisar conteúdo real e conectar os comandos
de estudo ao núcleo preservado. Leitura, gramática, avaliações, plano diário, painel
avançado e UI de backup permanecem fora da Etapa A. Nenhuma sessão de estudo ou
catálogo fictício foi incluído para aparentar que essas etapas estão concluídas.

**Publicação:** somente commit/push em `codex/2t-learn`. Sem merge na main, sem
deploy de produção solicitado ou promovido.


Resultado final desta entrega: typecheck e build aprovados; 101 testes Pytest
aprovados; suíte completa Playwright com 116 aprovados e 1 teste live TradingView
optativo desativado. Após a suíte completa, um teste adicional de seleção por teclado
e foco visível foi adicionado e executado com aprovação (nove testes de UI Learn
no total). Nenhum teste de atividade educacional foi anunciado como implementado.
