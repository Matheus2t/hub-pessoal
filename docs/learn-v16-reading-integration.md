# 2T Learn — V16: integração técnica de Leitura e Interpretação B1

**Fonte editorial:** [PR #121](https://github.com/Matheus2t/hub-pessoal/pull/121), rascunhos `docs/learn-leitura-b1-v16-en.json` e `docs/learn-leitura-b1-v16-ru.json`. A fonte original declara `publicRelease:false`, `cefrCertified:false`, e revisão docente/piloto pendentes.

## Implementação

- Dez textos novos B1, cinco em Inglês e cinco em Russo, reproduzidos sem alteração de texto.
- Quarenta questões interpretativas (duas objetivas e duas abertas para cada leitura), com escolhas e rubricas, e dez tarefas independentes de escrita/transferência.
- Associação editorial a dez leituras B1 já existentes e a etapas 11–15 da trilha, sem substituir ou reclassificar IDs ou textos antigos.
- Página Lit responsiva `learn-reading-v16`, seletor de leitura, visualização em dois parágrafos, respostas, referência editorial após concluir as quatro perguntas, trechos de evidência e transferência separada.
- Escrita livre **nunca** avaliada por correspondência literal; alternativas objetivas exibem somente referência editorial *não homologada* depois de completar a leitura. Nada é classificado como certo/errado, gravado em tentativas, progresso, IndexedDB ou backups.
- ID de cada unidade, questão e escrita preservado no novo módulo `frontend/src/learn/reading-b1-v16-content.ts`. A integração **não altera a V11, a V13, o catálogo público ou a V19**.

## Acesso controlado

Com build da aplicação servido em localhost, abra:
- `http://127.0.0.1:8123/?learn-preview=reading-v16#/learn/en/reading-b1`
- `http://127.0.0.1:8123/?learn-preview=reading-v16#/learn/ru/reading-b1`

A flag também habilita um acesso **Leitura B1 V16** na seção Níveis de estudo. No domínio público, ambas as rotas mostram **Prévia indisponível** porque a publicação editorial ainda não recebeu aceite. A flag localhost não é autenticação, e os dados editoriais já estão expostos no PR público.

## Revisão e publicação futura

1. Aceite do proprietário para disponibilizar o conteúdo como prática formativa, sem garantia de nível CEFR.
2. Revisão pedagógica e linguística independente quando houver recursos; até lá, não apresentar os gabaritos como avaliação validada nem prometer certificação.
3. Caso se habilite a liberação formativa, manter respostas abertas `uncertain`/revisão humana e distinguir conclusão de leitura de evidência de domínio.
4. Manter histórico e exportações antigos intactos; persistência ou avaliação futura exigirá schema e testes adicionais.
5. Reexecutar a regressão Learn e a verificação responsiva nos temas claro/escuro antes da ativação pública.

**A V16 ficará integrada tecnicamente à `main`, mas sem uso público até a liberação editorial explícita.** Os PRs V13 e V14 permanecem independentes.
