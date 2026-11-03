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


Etapa A: typecheck/build e 11 testes dirigidos aprovados. Referências dos Times
mantidas com zero pixels diferentes além de tolerância cromática mínima (0,01).
Diferenças encontradas na rasterização de escudos foram de um nível RGB;
nenhuma mudança de geometria, texto, cor CSS ou espaçamento foi aceita.
PR #12 já estava integrado em c97cb7c; 12 testes dirigidos de produção da Ações
V3 foram aprovados antes de alterar a interface. Não refazer suas entregas.

Etapa B em homologação: gráfico IBOV principal e modos/painéis de Ações; layouts
independentes para panorama e empresa. Fontes/dados/TTM existentes preservados.
Modos essenciais usam toda a largura quando sobra apenas o gráfico; slots
mantêm os widgets e a seleção de períodos vivos ao reorganizar.

Etapa B concluída: typecheck/build, 16 testes de terminal/Times e 15 testes
de cobertura CVM/proventos/layout aprovados. Inspeção das capturas desktop/mobile
feita nos dois temas. Módulos sem cobertura ficam indisponíveis, sem números
substitutos. Widgets externos continuam sob controle do TradingView; homologação
real do provedor fica registrada na etapa F.

Etapa C concluída: quatro simuladores em painéis com formulário fixo à esquerda,
resumo/gráfico à direita e tabela inferior. Preferências independentes por
calculadora. Nenhuma mudança nos métodos de cálculo, validação ou chamadas API.
13 testes finais de cálculo/layout, 28 de 29 testes iniciais e a correção do
seletor de tipografia aprovada separadamente. Cinco larguras e dois temas
inspecionados, com campos e indicadores legíveis.

Etapa D: simulador e comparador com preferências separadas. Campos e avisos
permanentes; resumo, gráfico, impostos, evolução, cenários e comparador opcionais.
Mantidos métodos de projeção, tributação, liquidez, cenários e fontes técnicas.
35 testes de produtos/tributos/interface aprovados, mais 9 testes de ferramentas
e 5 testes de personalização nas cinco larguras. Seletores novos corrigidos para
considerar unidades nos labels e o comparador aninhado, sem falha de aplicação.
Capturas reais revisadas; o link de salto visto em capturas longas com a página
rolada era artefato do screenshot Chromium: sem foco seu top computado é -80px.
Capturas novas voltam ao topo antes de registrar; o componente não foi alterado.
Python completo: 225 aprovados, com temporários em .vercel/v2-pytest-final.

Acabamento D validado novamente: 13/13 testes de simulador/layout aprovados.
