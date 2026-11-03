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

Etapa E concluída: 6/6 testes de isolamento e congelamento visual aprovados.
As 30 capturas dos três Times coincidem com as referências anteriores dentro
da tolerância de rasterização documentada. Não houve alterações nos componentes
ou estilos dos Times, na homepage nem no Learn/IndexedDB/backups.
As preferências financeiras não habilitam painéis nas outras áreas.

## Homologação F

Revisão visual: Ações, calculadoras e Renda Fixa em 1920, 1366, 768, 390 e
320px, nos dois temas. Modo compacto foi revisado também em monitor largo:
container queries mantêm valores e impostos legíveis ao reduzir módulos,
sem diminuir a fonte ou alterar a simulação. Painéis respondem à própria largura.

Na primeira regressão integral houve 253 aprovações, uma exclusão opt-in e uma
falha de clique CVM em 768px. Reproduzido o problema real: falha do iframe
encolhia o gráfico e deslocava o botão em 368px. A altura agora é reservada;
flow-root evita ainda dez pixels de colapso de margem no fallback. O teste novo
falhou antes da correção e passou depois; a consulta CVM continua independente.
O teste de cobertura CVM isola os scripts externos (dados CVM reais, sem mocks).
TradingView possui testes próprios de adaptação, falha/retry e inspeção real.

A inspeção real do IBOV carregou gráfico com cotações, sem fallback. Não se
alteraram iframes nem foram criados dados para substituir o provedor.
Fontes matemáticas, backend, dados financeiros, conteúdo Learn e Times têm
diff vazio em relação ao checkpoint. Nenhuma dependência nova ou segredo.
Resultado final local (03/11/2026):
- Typecheck e build de produção aprovados (.vercel/v2-final-build.log).
- 225 testes Python aprovados (.vercel/v2-pytest-final.log).
- 257 testes Playwright aprovados em regressão integral; um opt-in excluído
  nessa execução e executado separadamente com sucesso (TV_LIVE=1).
- Inspeção real TradingView: ITUB4, PETR4, VALE3, MGLU3, intervalos e celular
  no tema claro, além do IBOV. Capturas reais revisadas, sem dados substitutos.
- Os 30 comparativos visuais dos Times continuam aprovados.
- git diff --check aprovado; nenhuma mudança de backend ou fórmulas.

Commits intermediários: A 33292b4, B cf17a36, C f65d010, D 73138e1,
E d8108ea. Checkpoint remoto codex/checkpoint-v2-c97cb7c preservado.
A integração e a publicação ficam rastreadas pelo PR desta branch para main;
a homologação de produção e o SHA de merge constam no relatório desse PR.
Preferências são locais por navegador e não sincronizam dispositivos. Widgets
continuam sujeitos à disponibilidade e às permissões do TradingView; os dados
CVM permanecem consultáveis quando o provedor externo falha.
