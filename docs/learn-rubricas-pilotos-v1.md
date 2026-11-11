# 2T Learn — Rubricas específicas das quatro produções-piloto (v1)

**Cronograma:** etapas 2.5 e 4.3 — especificação pedagógica de avaliação e feedback.  
**Status:** pré-revisão editorial; **não há correção automática de respostas abertas nem mudança na experiência ativa**.

## O que foi elaborado

O arquivo `frontend/public/learn/pedagogy-v1/pilot-task-rubrics.json` contém **quatro rubricas ligadas a IDs reais das duas unidades-piloto**:

| Tarefa | Tipo | Evidência desejada |
|---|---|---|
| `en-intro-p1` | Escrita com apoio | Apresentação, estudo ou trabalho, com liberdade de nome e formulação |
| `en-intro-t1` | Transferência, sem modelo | Apresentação numa reunião de projeto **e pergunta ao interlocutor** |
| `ru-dir-p1` | Escrita com apoio | Pedido cortês da localização da estação de metrô |
| `ru-dir-t1` | Transferência, sem modelo | Pedido cortês pela **biblioteca**, não pela estação do exemplo |

Cada rubrica contém critérios essenciais e complementares, possibilidades de resposta que não dependem da mesma redação, feedback para problemas específicos e sugestões de nova tentativa. São **16 exemplos editoriais**, incluindo alternativas válidas, respostas incompletas, mudança incorreta de destino e casos cuja interpretação é incerta.

### Como julgar uma resposta sem fingir precisão

- **Intenção primeiro:** a pessoa realizou o objetivo da tarefa e comunicou o destino/tema correto?
- **Erros com efeito comunicativo:** pedir onde fica um *bilhete* em lugar da estação exige correção de significado; um pequeno erro ortográfico não é automaticamente uma falha de intenção.
- **Apoio registrado:** apresentar um modelo completo ou usar uma pista precisa ficar visível no histórico; não declarar produção independente depois de mostrar a resposta.
- **Cortesia contextual:** frases claras como `Где станция метро?` podem comunicar bem o destino, mas precisam de orientação se a tarefa solicita abordar um desconhecido educadamente.
- **Alternativas e ambiguidade:** respostas abertas equivalentes podem ser válidas; resultados provisórios `uncertain` pedem esclarecimento e revisão, não uma nota automática.
- **Sem extrapolação:** esses exemplos não medem pronúncia, fala espontânea, conversação nem um nível CEFR.

As avaliações sugeridas no arquivo são **hipóteses de calibração** e não rótulos adjudicados por especialistas. O motor futuro não pode tratar os 16 exemplos como um classificador de frases por correspondência literal.

## Como isso prepara o Codex

O Codex deverá usar rubricas vinculadas às tarefas para desenhar o **registro de evidências** e a apresentação de **feedback contextual**, nunca para criar um algoritmo que atribua notas a frases arbitrárias por comparação com exemplos.

**Contrato técnico mínimo:** taskId existente, critérios verificáveis, resultado `supported / partiallySupported / notSupported / uncertain / notAssessed`, modelo oculto em transferência, ajuda real registrada, feedback com justificativa e nova tentativa, resposta incerta passível de revisão.

Persistência continua futura e aditiva. IDs legados, tentativas, plano diário e backups devem ser preservados.

## Validação e portões de qualidade

```bash
npm run learn:validate-task-rubrics
```

A validação estrutural confere: quatro tarefas presentes nos pilotos, dois idiomas, critérios essenciais, múltiplas respostas válidas, contraexemplos, feedback por problema, proibição de correção automática e bloqueio editorial. **Não prova naturalidade ou correção linguística.**

Antes de ativar:
- [ ] Revisar Inglês e Russo com falantes competentes; incluir variações legítimas.
- [ ] Testar instruções e feedback com estudantes reais.
- [ ] Decidir como respostas abertas serão revisadas, incluindo `uncertain`.
- [ ] Desenvolver motor de aulas e persistência com ajuda registrada.
- [ ] Conferir transferência em contexto novo e depois retenção real.
- [ ] Só então habilitar rubricas na interface e validar o deploy.

**Arquivos relacionados:** `docs/learn-pedagogia-v1.md`, `docs/learn-diagnostico-feedback-v1.md`, `docs/learn-handoff-codex.md`.
