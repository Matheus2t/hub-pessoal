# 2T Learn — Diagnóstico e feedback, pacote pedagógico v1

**Cronograma:** 2.4–2.5 (revisão direcionada), 3.2 (banco inicial de diagnóstico), 4.3 (rubricas e feedback), preparação da etapa 6 (qualidade e testes). **Nenhuma dessas tarefas está ativa na interface.**

## 1. Materiais desta entrega

| Material | Caminho | Uso |
|---|---|---|
| Diagnóstico de Inglês | `frontend/public/learn/pedagogy-v1/en-diagnostic.json` | 10 tarefas originais; 2 de listening bloqueadas sem áudio revisado |
| Diagnóstico de Russo | `frontend/public/learn/pedagogy-v1/ru-diagnostic.json` | 10 tarefas originais; 2 de listening bloqueadas sem áudio revisado |
| Política de evidências e avaliação | `frontend/public/learn/pedagogy-v1/evaluation-policy.json` | Rubrica, ajuda registrada, resultado incerto e feedback educativo |
| Banco de casos e contraexemplos | `frontend/public/learn/pedagogy-v1/feedback-casebook.json` | 11 respostas com resultado **indicativo para revisão humana**, não gabarito automático |
| Validador da nova preparação | `scripts/validate-learn-diagnostics.mjs` | Impede vínculos inválidos, tarefas abertas "autocorrigidas" e listening sem áudio revisado |

Os 20 itens representam uma primeira amostra de tarefas com contexto, **não** uma prova completa de proficiência ou um teste calibrado. Nenhuma pontuação deve ser divulgada como CEFR/QECR. O objetivo de uma aplicação futura é sugerir um **ponto de partida provisório**, não classificar a pessoa permanentemente.

## 2. Organização do diagnóstico inicial

**Ordem sugerida (flexível; depende de evidências):**
- Leitura: entender uma informação explícita e inferir sentido de um pequeno texto novo.
- Reconhecimento contextual: identificar uma resposta comunicativamente adequada.
- Produção com ajuda: construir a primeira resposta com apoio.
- Produção sem ajuda e transferência: usar o mesmo recurso linguístico em outra situação.
- Listening: **somente** quando existir áudio efetivamente disponível, revisado e compreensível; caso contrário registrar `notAssessed`.

**Diferenças entre os idiomas:** no Inglês, os estímulos incluem rotina, apresentação, reunião e transporte; no Russo, cirílico, apresentações, orientações e rotina. O diagnóstico NÃO usa o mesmo corpus traduzido palavra a palavra.

**Tratamento do aluno iniciante:** opção explícita de pular, escolha de unidade livre, feedback respeitoso e indicação clara de conteúdo ainda não avaliado. Erro isolado não resulta em rótulo de incapacidade.

## 3. Feedback: o que já está especificado

Toda devolutiva sobre resposta aberta precisa responder:
1. **O que funcionou?** O que a tentativa comunicou corretamente?
2. **Qual é a primeira lacuna prioritária?** Uma só, sempre que possível.
3. **Por que isso muda a comunicação?** Evitar correções de gramática desconectadas da situação.
4. **Como melhorar?** Um exemplo ou orientação concreta.
5. **Como tentar novamente?** Tarefa curta que permita aplicar o feedback.
6. **O que NÃO foi avaliado?** Sobretudo oralidade, compreensão auditiva sem mídia e grau CEFR.

### Erros diferentes exigem feedback diferente

- **Sentido incorreto:** `Где станция?` num desafio sobre biblioteca pede o destino errado — a estrutura de pergunta pode estar correta, mas a tarefa não foi atendida.
- **Ortografia com intenção compreensível:** `Где библеотека?` pode ser entendido; o feedback deve mostrar `библиотека` sem tratar a intenção comunicativa como incompreensível.
- **Informação ausente:** `Hi, I'm Sam.` é uma apresentação válida, mas não responde à parte de informar o que estuda.
- **Respostas equivalentes:** `Could you tell me where the bus station is?` e `Where is the bus station?` podem cumprir a mesma tarefa em registros distintos.
- **Resposta ambígua:** não forçar "certa" ou "errada" se o significado ainda não puder ser inferido. Pedir reformulação.

**Cuidado importante:** os julgamentos presentes no banco de casos são **exemplos de referência editorial**, a serem revisados por especialista/usuário; não funcionam como um classificador automático nem autorizam que o sistema atribua notas em respostas livres.

## 4. Auditoria direcionada dos dois pilotos

### Piloto Inglês — apresentações

- Diálogo: breve, inteligível, ambiente de curso, com contraste entre quem estuda e quem trabalha.
- Ponto forte: tarefa de transferência em reunião de projeto, diferente do exemplo inicial.
- Ajustes antes de ativar: oferecer pelo menos duas respostas abertas alternativas e revisar se "What about you?" está apropriado a cada contexto; garantir que o usuário precise incluir a pergunta na transferência, não apenas se apresentar.
- Evitar feedback enganoso: `Nice to meet you too` é resposta de cumprimento, não prova habilidade de descrever um projeto.
- Audio/listening: material escrito não comprova compreensão oral.

### Piloto Russo — orientação na rua

- Diálogo: `Извините, где ближайшая станция метро?` e `Идите прямо, потом поверните налево. Станция рядом с аптекой.`
- Ponto forte: interpretar instrução e depois formular pergunta sobre **biblioteca**, sem copiar estação.
- Ajustes antes de ativar: revisar registro, flexões e tonicidade, especialmente a distinção `где станция` / `где находится станция`; manter uma explicação breve de `рядом с аптекой`, sem exigir todos os casos.
- O teclado fonético facilita a tentativa, mas não é evidência de digitação autônoma em cirílico.
- Não declarar pronúncia correta com base em texto digitado.

## 5. Critérios de aceite técnico para a execução futura

- [x] Questões diagnósticas originais e vinculadas a objetivos reais.
- [x] Tarefas de produção com rubrica, alternativas e erros comuns registrados.
- [x] Política de feedback e casos positivos, parciais, insuficientes e incorretos documentada.
- [x] Casos de listening explicitamente desativados até áudio revisado.
- [x] Validação estrutural automatizada do pacote pedagógico.
- [ ] Revisão linguística independente das perguntas, diálogos e soluções.
- [ ] Teste pedagógico com respostas de estudante real e calibragem da dificuldade.
- [ ] Interface do diagnóstico e armazenamento de evidências.
- [ ] Experiência de feedback com revisão apropriada das respostas abertas.
- [ ] Testes de UX, acessibilidade e confiabilidade; confirmação de melhoria da aprendizagem.

## 6. Comandos

```bash
npm run learn:audit
npm run learn:validate-pedagogy
npm run learn:validate-diagnostics
```

Os validadores **não** escrevem no banco nem modificam dados existentes. As tarefas novas têm `runtimeEnabled: false` nos bancos de diagnóstico e roteiros dos pilotos, até a aprovação pedagógica e a implementação.

**Próxima entrega reservada ao trabalho de engenharia:** interpretar o formato declarativo das unidades, registrar evidências em estrutura aditiva, permitir revisão/retomada e oferecer diagnóstico com resultados honestos. Evitar configurar endpoints externos de avaliação sem análise de consentimento e privacidade.


---

## Proteção da integridade do diagnóstico — revisão posterior

A revisão em `docs/learn-integridade-diagnostico-v1.md` redistribuiu as alternativas corretas (2 por posição em cada idioma), vinculou uma resposta canônica a cada índice e substituiu uma questão artificial de cirílico por sinalização funcional. As respostas de exemplo das tarefas abertas exigem visualização **somente após a tentativa**. Palavras russas fornecidas no enunciado são pistas lexicais que precisam ser registradas como assistência. O Codex deve interpretar esses contratos de dados, impedir reutilização de ID depois de existirem tentativas reais e evitar deduzir proficiência de reconhecimento ou da posição de um gabarito.
