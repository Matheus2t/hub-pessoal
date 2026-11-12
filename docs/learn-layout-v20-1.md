# 2T Learn V20.1 — Página inicial minimalista

**Meta:** abrir um idioma e encontrar imediatamente **oito tipos de estudo**, sem repetir apresentação, indicadores ou textos publicitários.

## Alteração real de estrutura

| Antes (V20) | Agora (V20.1) |
| --- | --- |
| Cabeçalho grande do idioma + outro hero "Organize o estudo" | **Um único cabeçalho compacto** com nome/nome nativo e troca de idioma |
| Três grandes cartões A1/A2/B1 antes dos estudos | **Três marcadores pequenos** abaixo dos estudos, com um link real para a trilha |
| Ferramentas dispostas em barra lateral grande | **"Mais ferramentas" recolhido**, com cinco destinos existentes |
| Oito cartões extensos com índice, texto e rodapé repetido | **Oito cartões curtos**: modalidade + exatamente o que o usuário faz |
| Dois blocos de acompanhamento (hero e sete indicadores no final) | **Uma faixa de três dados**: respostas, revisões e palavras estudadas |
| Avisos repetidos sobre conteúdo não publicado | **Conteúdos editoriais continuam tecnicamente bloqueados**, sem poluir a interface |

## Caminho do usuário

1. Abre `/#/learn/en` ou `/#/learn/ru`, vê somente o título do idioma.
2. Escolhe diretamente **Vocabulário**, **Flashcards**, **Listening**, **Ditado**, **Escrita**, **Leitura**, **Gramática** ou **Avaliações**.
3. Se quiser outra organização, usa o link **Ver trilha**.
4. Vê dados de estudo reais em uma linha e acesso ao plano diário.
5. Pode expandir **Mais ferramentas** para plano diário, acompanhamento, caderno de erros, treino direcionado e backup.

Os marcadores A1, A2 e B1 descrevem organização curricular; **não certificam nível**. A V12 privada aparece somente pelo opt-in local já existente.

## Arquivos

- `frontend/src/learn/home.ts`: componente reescrito, sem segundo hero, dashboard nem barra lateral.
- `frontend/src/learn/page.ts`: cabeçalho único e remoção de estatísticas redundantes.
- `frontend/styles/_learn-workspace-v20.scss`: camada V20 substituída, preservando os estilos úteis de páginas internas e prévia V12.
- `frontend/tests/learn-workspace-v20.spec.ts`, `learn-ui.spec.ts`, `learn-b.spec.ts`, `learn-c.spec.ts`: expectativas atualizadas para o novo menu, mantendo testes de isolamento de idiomas, armazenamento e erros.

## Limites e integração com V19

O escopo é **apenas UI/navegação**. Não alterar catálogos, IDs, IndexedDB, eventos, backups, áudios, licenciamento, correção, notas ou informações privadas. Os **474 exercícios legados** continuam como antes. Os roteiros V11/V13/V14/V16/V17, ainda não aprovados, não são ligados pela página nova.

O trabalho dos áudios V19 (#125) continua em branch separada.

## Validação antes da publicação

Executar typecheck, build, suíte Playwright do Learn (incluindo regressões B/C, mobile 320px, temas dark/light), regressão de progressão V12 e teste do menu recolhido. Se a CI falhar, verificar os logs e corrigir antes do merge.

Nenhuma mudança deste PR representa autorização para publicar material editorial ou gravação sem aprovação.
