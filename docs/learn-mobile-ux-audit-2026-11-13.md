# 2T Learn — auditoria de experiência, acessibilidade e mobile (13/11/2026)

## Escopo e critério

Revisão interna das jornadas de seleção EN/RU, navegação entre as oito modalidades públicas, preparação de sessões, atividades de escrita, revisão de flashcards, teclado fonético russo, feedback, backup e prévias restritas. Inspeção de componentes Lit e estilos SCSS, mais testes Playwright Chromium com viewports em **320, 390 e 768 CSS px** e regressões anteriores em tema claro/escuro e desktop.

**A auditoria de navegador não substitui testes físicos em Android/iOS, teclado virtual real, VoiceOver/TalkBack, zoom do sistema ou teste com alunos.** Não se infere conformidade WCAG completa a partir da execução automatizada.

## Achados reproduzíveis por inspeção

| Prioridade | Comportamento | Ajuste aplicado |
| --- | --- | --- |
| Alta — orientação no formulário | Depois de iniciar uma prática, o botão de início era removido sem reposicionamento explícito do foco no novo conteúdo. | A questão atual passa a receber foco programático com `tabindex=-1`, após o render, preservando navegação por teclado. |
| Alta — feedback em tela estreita | Após `Verificar resposta`, o foco podia ficar no botão que acabava desabilitado; o feedback dinâmico frequentemente aparece abaixo da área visível em telas pequenas. | O feedback `role=status` agora é focalizável e recebe foco após gravação; um scroll `nearest` aproxima o resultado do viewport sem animação forçada. |
| Alta — continuação | Ao tocar `Continuar`, o feedback era removido e o foco não era transferido para o enunciado seguinte ou o título da sessão concluída. | Continuação focaliza a nova pergunta; ao concluir todas, focaliza `Sessão concluída`. Um token de geração impede foco obsoleto após navegação. |
| Média — controle de teclado russo | Botões `ё/й/ы/э/ь/ъ/щ/ж/ю/я` tinham 39×39 CSS px em desktop e 36×36 em mobile; o botão de alternância tinha 36 px de altura. | Alvos ampliados para **mínimo de 44×44 CSS px**, mantendo agrupamento, rótulos ARIA e quebra de linhas em mobile. |
| Média — idioma do campo | Textarea legada de escrita não tinha atributo `lang`; leitores de tela poderiam pronunciar a resposta com idioma de documento, inclusive em inglês. | `lang` usa o idioma efetivo da resposta (`en`, `ru` ou `pt-BR`), sem alterar a transliteração cirílica. |

## O que foi preservado e confirmado

- As rotas `/#/learn`, `/#/learn/en` e `/#/learn/ru` mantêm a separação por idioma e as oito áreas de estudo; ferramentas adicionais permanecem recolhidas por padrão.
- As opções de sessão, as perguntas e os controles de avaliação não modificam IDs dos 474 exercícios, respostas, revisão de cartões, histórico ou backups.
- Campos de tradução livre continuam avaliados apenas por variantes explícitas; texto não reconhecido é **incerto**, não incorreto por semelhança de string.
- O teclado russo preserva `ё`/ `е`, entrada por IME e preferência local; mudanças são de dimensão do alvo, não da regra fonética.
- V12/V13/V14/V16/V17/V19 permanecem com suas flags e controles de acesso prévios, sem liberação de materiais privados no build público.
- A experiência de prévia interna não ganha identidade de revisor institucional nem evidência de gravação validada.

## Cobertura automatizada

`frontend/tests/learn-mobile-ux-v22.spec.ts` testa:

1. Entrada em escrita EN/RU nas larguras **320/390/768**, foco no primeiro enunciado, preenchimento do campo com `lang` correto, feedback `role=status` visível e focalizado após gravação, avanço com foco na próxima questão e ausência de overflow horizontal.
2. Teclado russo nas larguras **320/390**, medindo todos os dez caracteres e o controle fonético com alvos de no mínimo **44×44 px**, além de operar a alternância via Enter.
3. Fluxo de flashcard no mobile: revelar resposta, registrar `Bom`, receber feedback e continuar com foco correto.

O workflow `.github/workflows/learn-mobile-ux-v22.yml` roda o novo teste e regressões existentes (navegação, idiomas, preferências fonéticas e refinamento V20), além da verificação do build público. Não atesta visual exato em um dispositivo físico.

## Riscos e tarefas após a correção

- **P0 para homologação humana final:** testar em celular Android/iPhone reais, com teclado de tela aberto, escala de fonte ampliada, rotação e TalkBack/VoiceOver.
- Testar usabilidade com alunos reais (tempo para encontrar atividade, clareza do feedback, compreensibilidade do estado `uncertain`, continuidade depois do histórico).
- Verificar acessibilidade de contraste com medições confiáveis e leitura dos componentes dinâmicos em leitores de tela; os testes de foco e de tamanho de alvo não cobrem todos os critérios WCAG.
- Homologar gravações humanas/MP3s V13/V14/V19 e manter gates de avaliação separados dos testes de layout.

**Decisão:** melhorias de navegação e de controle podem ser integradas se CI ficar verde, sem publicar novas avaliações. A aprovação de experiência real em dispositivos e por estudantes continua pendente.
