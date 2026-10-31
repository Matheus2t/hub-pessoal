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
