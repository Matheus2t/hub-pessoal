# 2T Learn — Fechamento editorial interno dos dois pilotos

**Etapas do cronograma:** 1 (critérios), 2.5 (unidades-piloto) e preparação da 6 (validação).  
**Estado:** conteúdo **pronto como entrada de engenharia para protótipo desativado**; **não aprovado para alunos**. A revisão aqui é de consistência interna, não avaliação independente por professor/falante ou estudo de eficácia.

## 1. Escopo congelado da primeira implementação

| Campo | Inglês | Russo |
|---|---|---|
| ID estável | `en-pilot-introductions-01` | `ru-pilot-directions-01` |
| Objetivo | `en-introductions-01` | `ru-directions-03` |
| Situação | Maya e Leo se conhecem antes de uma atividade | Visitante pede localização da estação de metrô |
| Entrada | Diálogo escrito de cinco falas | Diálogo escrito de quatro falas |
| Compreensão | Identificar quem estuda o quê e o sentido de `What about you?` | Entender papel da farmácia e direção à esquerda |
| Prática guiada | Apresentar-se e explicar o que faz/estuda | Perguntar educadamente onde fica o metrô |
| Aplicação em contexto novo | Apresentar-se numa reunião online e fazer pergunta pertinente | Perguntar por biblioteca em vez de metrô |
| Ajuda | Glossário e frases iniciais sob demanda; exemplos só após tentar | Glossário, teclado fonético e exemplos sob demanda; destino `библиотека` visível como **pista lexical** |
| Avaliação | Compreensão textual + escrita com rubrica em revisão | Compreensão textual + escrita com rubrica em revisão |
| **Não medido** | Listening natural, conversação, pronúncia, CEFR | Listening natural, conversação, pronúncia, CEFR |

Os arquivos **continuam** com `runtimeEnabled:false` e `editorialFinalization.publicReleaseApproved:false`. O Codex não deve alterar esses campos silenciosamente para tornar o protótipo acessível.

## 2. Roteiro completo — Inglês

### Antes de começar
A pessoa vê um objetivo realista: *“Consigo me apresentar, dizer o que estudo ou faço e fazer uma pergunta para conhecer alguém.”* O texto explica que a aula é sobre um primeiro contato; não promete fluência ou pronúncia.

### Entrada
Mostrar as falas de Maya e Leo respeitando `speaker` e `text`, com `lang="en"`. Tradução integral e glossário ficam fechados inicialmente e são abertos a pedido. Nunca registrar que alguém *ouviu* o diálogo: só há **texto**.

### Compreensão
1. `en-intro-c1`: Leo estuda análise de dados; Maya estuda Inglês. Se o aluno escolher Inglês, explicar a diferença entre as duas falas.
2. `en-intro-c2`: `What about you?` devolve a conversa à outra pessoa. Corrigir distratores sobre sair da sala ou perguntar horário com base no contexto real.

Em ambos os casos, a questão avalia **interpretação do texto**, não capacidade de produzir oralmente.

### Percepção e apoio
`en-intro-n1`: observar `I'm`, `I study` e `What about you?`. Mostrar exemplos curtos de estruturas conforme a necessidade, incluindo o contraste `Are you a student?`. Essa percepção guiada **não é evidência de domínio**.

### Escrita guiada
`en-intro-p1`: alguém diz *“Hello, I'm Nora. What's your name?”*. O aluno se apresenta com nome fictício e indica estudo/trabalho. Pode pedir início de frase. Registrar cada ajuda **efetivamente mostrada**, preservar a primeira resposta e oferecer feedback didático. Não corrigir apenas comparando texto exato.

### Transferência
`en-intro-t1`: numa **reunião online de projeto**, apresentar-se, indicar trabalho/estudo e fazer pergunta pertinente. **Não exibir o modelo antes da tentativa**. Se a pessoa só se apresenta, o feedback reconhece o que funcionou e indica especificamente a pergunta ausente. Modelo mostrado depois não pode retroativamente transformar uma segunda tentativa copiada em produção independente.

### Revisão posterior
As propostas D+2 e D+7 usam novos personagens e contextos (atividade comunitária e grupo de jogos), em `pilot-delayed-probes.json`. Não gerar automaticamente lembretes nem resultados sem uma tentativa real.

## 3. Roteiro completo — Russo

### Entrada
Mostrar o diálogo em cirílico (`lang="ru"`), com ajuda sob demanda. Não exigir que a pessoa domine previamente todos os casos gramaticais. A pergunta pede a estação de metrô e a resposta indica seguir em frente, virar à esquerda e procurar um marco próximo à farmácia.

### Compreensão
1. `ru-dir-c1`: explicar que `рядом с аптекой` significa **perto da farmácia**; ela funciona como ponto de referência.
2. `ru-dir-c2`: `налево` significa **à esquerda**, não `направо` (à direita).

As alternativas erradas têm explicação específica e não fazem afirmações que o diálogo não sustenta.

### Percepção e apoio
`ru-dir-n1`: explicitar `Извините`, `где`, `станция метро` e `налево`. `Рядом с + instrumental` deve ser ensinado em contexto: compreender `с аптекой` nesta frase, sem exigir o sistema inteiro de declinações.

### Escrita guiada
`ru-dir-p1`: formular pergunta cortês pela estação. O teclado fonético é um recurso de edição, **não uma medida de pronúncia ou competência independente em cirílico**. Uma resposta curta como `Извините, где станция метро?` pode ser válida, assim como variantes corteses com `находится` e `подскажите`. O julgamento definitivo exige rubrica revisada.

### Transferência
`ru-dir-t1`: a nova meta é **biblioteca**. A palavra `библиотека` já aparece no enunciado. Essa **pista lexical é auxílio prévio**, ainda que o estudante não abra um botão de dica; deve constar do registro de ajuda. Avaliar a capacidade de adaptar a pergunta de localização, **não** afirmar que a palavra foi lembrada sem apoio.

### Revisão posterior
D+2 e D+7 mudam destino para hospital e museu, fornecendo apenas as palavras novas em cirílico. Medir a observação realizada, não inferir proficiência oral.

## 4. Regras comuns de correção e apresentação

- Questão fechada: resposta determinística para aquela pergunta, com explicação correta e específica.
- `notice`: exercício de descoberta; pode registrar participação, **não competência demonstrada**.
- Resposta aberta: inicialmente `uncertain` até existir avaliação por rubrica; exemplos são **variantes**, não únicos gabaritos.
- Feedback: explicar acerto parcial, lacuna mais importante, impacto no sentido e sugerir nova tentativa.
- Ajuda: distinguir `disponível`, `mostrada` e `usada` no registro. Texto lexical já exposto no enunciado conta como `shownAssistance`.
- Exemplos completos: apenas **depois** da primeira tentativa; em repetição posterior, registrar que houve acesso a modelo.
- Falta de áudio ou de corretor confiável: `notAssessed` ou `uncertain`, conforme o caso, **nunca resposta inventada**.
- Progresso: mostrar etapas concluídas, mas não atribuir `A1 adquirido`, `fluente` ou `pronúncia boa`.

## 5. Revisão de consistência concluída neste ciclo

- [x] Objetivo, diálogo, perguntas e transferência relacionados ao mesmo resultado comunicativo.
- [x] Perguntas de compreensão referem-se a informações efetivamente presentes nos diálogos.
- [x] Distratores têm correção específica e evitam confundir contextos.
- [x] Pistas lexicais previamente visíveis estão declaradas.
- [x] Respostas-modelo das quatro tarefas abertas exigem apresentação após tentativa.
- [x] As quatro rubricas de escrita estão vinculadas aos IDs corretos; a política mantém `uncertain` quando necessário.
- [x] Há restrições explícitas sobre áudio e sobre afirmações de competência não observada.
- [x] Os pilotos permanecem desligados do fluxo público, mesmo com conteúdo editorialmente preparado.

## 6. Validações externas **não realizadas** — não bloquear o código do protótipo

- [ ] Revisor linguístico competente em Inglês e Russo conferiu naturalidade, registro e variantes.
- [ ] Aprendizes reais testaram as duas unidades, com registro de tempo, dúvidas e dificuldade.
- [ ] A correção de escrita foi testada para casos não previstos e equivalentes semânticos.
- [ ] Há gravações validadas para avaliar listening (não necessárias ao protótipo **textual**).
- [ ] Estudos de retenção demonstraram equivalência entre atividades D+2/D+7.
- [ ] Publicação pública foi autorizada após testes de engenharia.

**Decisão:** esse conjunto está pronto para o próximo passo, que é o **protótipo técnico desativado**. Não é necessário fabricar mais exercícios ou mapear os 982 itens legados para iniciar a implementação.
