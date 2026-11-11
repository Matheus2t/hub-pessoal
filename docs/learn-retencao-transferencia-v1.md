# 2T Learn — Retenção e transferência: tarefas-piloto diferidas (v1)

**Cronograma:** etapa 5.1 (planejar consolidação), preparação de 5.2/5.3 e 6.2 (teste pedagógico).  
**Estado:** propostas de conteúdo e critérios para revisão futura. **Não foram ativadas, agendadas ou aplicadas a estudantes**.

## Entrega concreta

`frontend/public/learn/pedagogy-v1/pilot-delayed-probes.json` contém quatro momentos de prática diferida (dois por idioma), cada um com **uma tarefa de compreensão textual e uma produção escrita nova**, somando oito tarefas.

| Unidade | Intervalo sugerido após o piloto | Compreensão em novo contexto | Produção escrita |
|---|---:|---|---|
| Inglês — apresentação | Dia 2 | Identificar trabalho e estudo de interlocutores novos | Apresentar-se numa atividade comunitária e fazer uma pergunta |
| Inglês — apresentação | Dia 7 | Identificar quem trabalha com tecnologia em diálogo novo | Apresentar-se num grupo de jogos e perguntar sobre outra pessoa |
| Russo — orientação | Dia 2 | Compreender caminho e virar à direita para hospital | Perguntar educadamente onde fica um hospital (`больница`) |
| Russo — orientação | Dia 7 | Interpretar referência e trajeto para museu | Perguntar educadamente onde fica um museu (`музей`) |

As respostas em texto aberto têm exemplos **disponíveis somente depois da tentativa**, critérios de significado e feedback contextual para problemas comuns. A avaliação deve reconhecer formulações equivalentes e permitir estado `uncertain` quando necessário. Nenhum exemplo é um gabarito exclusivo.

### Distinção essencial entre treino, retenção e transferência

- **Treino:** o aluno responde durante a aula, com orientações e possibilidades de ajuda.
- **Retenção observada:** depois de um intervalo, consegue recuperar e utilizar parte do conhecimento em nova atividade.
- **Transferência observada:** adapta a construção a uma situação diferente, sem a resposta-modelo exposta.
- **Limite:** cumprir duas atividades depois de alguns dias **não equivale** a dominar o idioma, ser A1/A2 certificado ou ter memória duradoura indefinida.

Os intervalos de dois e sete dias são **hipóteses para o primeiro teste do produto**, não uma frequência cientificamente otimizada para cada usuário.

A atividade do segundo dia também é revisão. Portanto, **ela influencia a tentativa do sétimo dia**: não devemos tratar o resultado de D+7 como uma medição pura de esquecimento espontâneo. Se um dia for perdido, registrar **não avaliado**, não erro ou penalidade.

### Limites específicos de Inglês e Russo

No Inglês, o aluno não recebe uma frase-modelo nem glossário para montar a apresentação, mas trata-se apenas de **produção escrita**. Não mede a fala espontânea.

No Russo, cada situação informa o **nome do novo destino em cirílico**, por exemplo `больница` e `музей`, para não confundir falta de vocabulário novo com incapacidade de construir uma pergunta. Esse dado precisa ser registrado como **pista lexical oferecida**. A tarefa avalia a recuperação da construção de localização, **não produção lexical completamente sem apoio**.

A correção deve considerar cortesia, destino correto, significado claro e pequenos erros ortográficos separadamente.

## O que o Codex deverá implementar posteriormente

1. Guardar conclusão da unidade-piloto e evidências associadas, em formato aditivo compatível com backups anteriores.
2. Apresentar revisão diferida **somente** depois de decisão de produto sobre sessões e lembretes; não criar notificações automáticas nesta fase.
3. Esconder respostas-modelo até após a primeira tentativa e registrar ajudas realmente mostradas.
4. Comparar evidências do próprio aluno ao longo do tempo, com critério consistente; não converter acertos fechados em fluência.
5. Guardar `notAssessed` se áudio, armazenamento, revisão humana ou oportunidade de realizar a tarefa estiverem ausentes.
6. Testar as tarefas com estudantes e revisar naturalidade, dificuldade e equivalência entre contextos.
7. Preservar os IDs existentes, históricos de tentativas e dados locais; não migrar conteúdo legado silenciosamente.

O motor **não deve** equiparar a pontuação bruta de tarefas com dificuldades diferentes ou transformar quatro casos editoriais em classificação automática.

## Verificações

```bash
npm run learn:validate-delayed
npm run learn:validate-task-rubrics
npm run learn:validate-pedagogy
```

A auditoria verifica identificadores, idioma, vínculo com pilotos, dois intervalos distintos, oito tarefas, alternativas não duplicadas, resposta-modelo oculta, pistas declaradas, feedback disponível e bloqueio de ativação.

**Limite explícito:** testes estruturais não provam que o estudante tenha aprendido, nem homologam a dificuldade, os intervalos ou a naturalidade de todo enunciado.

## Antes da ativação

- [ ] Revisão independente da linguagem e das respostas legítimas.
- [ ] Teste real com estudante: clareza, tempo, motivação e dificuldade.
- [ ] Revisão de intervalos e comparação de materiais de dificuldade equivalente.
- [ ] Implementação segura de sessão, registros, ajudas e dados históricos.
- [ ] Correção de respostas abertas com rubrica revisada e opção de resultado incerto.
- [ ] Testes de navegador, compatibilidade com backups e validação no domínio oficial.

**Princípio orientador:** aprender mais não é acumular repetições; é conseguir **compreender e agir** em situações diferentes, com evidências limitadas ao que foi realmente observado.
