# 2T V2 — painéis personalizáveis

Base: main c97cb7c (inclui PRs #8–#12). Branch codex/2t-v2-custom-panels.
Checkpoint remoto: codex/checkpoint-v2-c97cb7c. Alterações anteriores preservadas.

## Escopo e isolamento

Ações, Calculadoras e Renda Fixa recebem superfícies e módulos configuráveis.
Início permanece aprovado. Learn não recebe mudanças de lógica ou armazenamento.
Times não recebe alterações de fonte, estilo, layout, API ou personalização.
Tokens financeiros novos ficam em `_workspace.scss`, sob opt-in `.workspace-v2`.
Nenhum token de `:root` é redefinido. Capturas de Times anteriores às alterações
em `layout-v2-freeze.spec.ts-snapshots`, nos dois temas e cinco larguras.

## Etapas

- A: gerenciador versionado, recuperação, três modos, controles acessíveis e slots.
- B: terminal de Ações com widgets existentes e módulos disponíveis.
- C: formulários à esquerda, resultados à direita e módulos das calculadoras.
- D: simulador/comparador de Renda Fixa com premissas preservadas.
- E: homepage/Learn preservados e comparação de pixels dos três Times.
- F: regressão, inspeção, publicação e verificação real.

Preferências ficam em `2t:panels:v1:<área>`, sem dados de simulações ou estudos.
Falha de leitura usa padrões sem apagar o dado antigo. Falha de escrita mantém
a ferramenta em funcionamento e informa o problema. IDs válidos desconhecidos
são preservados, novos módulos recebem padrões, controles fixos não são ocultados.
Modo completo/essencial não apaga o último layout personalizado.

O contêiner usa slots nativos: reorganizar não desconecta inputs, gráficos ou
widgets externos, preservando suas operações e estado. No celular os controles
de ordem são botões; tamanhos salvos voltam a valer no desktop. Sem dependências
novas, autenticação ou banco para preferências.

Registro em andamento. Não publicar etapas incompletas em produção.
