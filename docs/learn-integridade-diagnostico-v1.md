# 2T Learn — Integridade da avaliação diagnóstica (revisão v1)

**Escopo:** melhorar a validade básica das tarefas diagnósticas propostas, antes de desenvolver o motor de ensino. **Não altera o catálogo ativo, o histórico, os backups ou a experiência atual.**

## 1. O problema encontrado

Antes desta revisão, **a posição da alternativa correta era fortemente previsível** nas questões fechadas:

| Catálogo | Posição 1 | Posição 2 | Posição 3 |
|---|---:|---:|---:|
| Inglês — antes | 5 | 1 | 0 |
| Russo — antes | 6 | 0 | 0 |
| Inglês — depois | 2 | 2 | 2 |
| Russo — depois | 2 | 2 | 2 |

Isso não tornava todos os itens errados, mas uma pessoa poderia escolher a primeira alternativa repetidamente e atingir resultados altos **sem compreender o conteúdo**. No caso russo, acertaria todas as seis questões fechadas seguindo apenas esse padrão.

A correção foi feita **reordenando as alternativas sem mudar a resposta semanticamente correta**. Acrescentamos `correctAnswer` para cada item fechado; o verificador exige que esse valor corresponda a `choices[correctIndex]` e que a distribuição de posições não esteja desequilibrada.

**Limite importante:** posições balanceadas não bastam para garantir que as alternativas sejam plausíveis ou que a avaliação seja confiável. Revisão linguística, calibração com alunos e análise dos resultados continuam obrigatórias.

## 2. Uma questão de russo substituída

A questão `ru-diag-k1` anteriormente comparava grafias artificiais de `мир`, `мирь` e `миръ`. Esse tipo de exercício identifica correspondência visual, mas não pede interpretação útil no mundo real.

A nova questão mantém o mesmo ID **apenas porque ainda é um rascunho inativo, sem resultados reais registrados**. Apresenta uma situação numa estação e pergunta qual placa indica a saída:

- `ВЫХОД` — saída;
- `ВХОД` — entrada;
- `КАССА` — bilheteria.

O objetivo observado é **reconhecimento funcional de sinalização cirílica**, não leitura extensa, conversação, produção oral ou proficiência CEFR.

Ao ativar a futura versão, o Codex deverá versionar o conteúdo de cada tarefa e não reutilizar IDs para mudanças de significado depois de existir histórico de tentativas.

## 3. Independência limitada e ajudas explícitas

Algumas tarefas russas de escrita já mostram a palavra-alvo em cirílico no enunciado:

| ID | Palavra exibida | O que ainda pode ser observado |
|---|---|---|
| `ru-diag-p2` | `парк` | Construir uma pergunta de localização em outro cenário |
| `ru-diag-t1` | `аптека` | Adaptar a pergunta para o destino solicitado |

Essas tarefas receberam metadados `providedSupport` que declaram **pista lexical oferecida**, mesmo quando o exercício não apresenta um botão de ajuda. Não podem comprovar recuperação independente do vocabulário. O apoio deve aparecer na futura trilha de evidências.

Nos **oito exercícios de resposta aberta dos dois diagnósticos**, modelos e respostas de exemplo passam a declarar `modelAnswersVisible: "after-attempt"`. Não deve ser possível ver a resposta antes da primeira tentativa e depois contabilizar a produção como independente.

## 4. Proteções automáticas

Atualizamos `npm run learn:validate-diagnostics`, já executado pelo CI, para detectar:

1. Alternativa correta sem correspondência com `correctAnswer`.
2. Padrão de posições demasiadamente concentrado em uma alternativa.
3. Exemplos revelados antes da resposta.
4. Palavra-alvo fornecida sem registrar o auxílio e o limite da inferência.
5. Retorno à antiga questão artificial de cirílico, sem objetivo funcional.
6. Tentativa de avaliar listening sem gravação validada ou atribuir correção automática a texto aberto — proteções previamente existentes.

**O que o teste não faz:** julgar a naturalidade das frases, verificar respostas semanticamente equivalentes, garantir dificuldade CEFR, provar compreensão oral ou determinar proficiência.

## 5. Próximos portões

- [x] Eliminar o viés extremo de posição das respostas nos dois rascunhos.
- [x] Proteger a associação entre resposta correta e índice após edições.
- [x] Trocar um exercício artificial por uma tarefa funcional de leitura cirílica.
- [x] Explicitar o apoio lexical nos diagnósticos russos.
- [x] Declarar ocultação das respostas-modelo até depois da tentativa.
- [ ] Revisar todas as alternativas com falantes competentes: plausibilidade, naturalidade e ambiguidade.
- [ ] Testar a compreensão das instruções com aprendizes reais.
- [ ] Implementar apresentação e registro de evidências no motor, sem alterar dados legados.
- [ ] Comparar desempenho entre tarefas com dificuldade semelhante, sem confundir reconhecimento com produção.

Este pacote permanece com `runtimeEnabled:false` e `status:editorial-review`. O resultado é **melhor integridade do desenho da avaliação**, não um diagnóstico já homologado ou disponível para o aluno.
