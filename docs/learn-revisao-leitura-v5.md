# 2T Learn — quinta rodada: leitura, equivalência e progressão

**Data:** 11/11/2026  
**Estado:** auditoria editorial interna, não validação linguística independente e não certificação de proficiência.  
**Referência de partida:** `main` com PR #109 integrado.  
**Escopo preservado:** 474 exercícios (237 EN + 237 RU), 15 textos de leitura por idioma (4 A1, 6 A2 e 5 B1), IDs, níveis, modalidades e histórico.

## Entregas desta rodada

- **90 exercícios distintos ajustados:** 44 em Inglês e 46 em Russo; destes, **88 são perguntas de compreensão** (44 por idioma) e **dois são itens russos B1 de aspecto verbal**.
- **131 novas respostas literais** para questões de leitura, **65 EN e 66 RU**, conservando todos os gabaritos anteriores. Foram admitidas apenas variantes relacionadas diretamente à informação que aparece no texto: resposta curta ou completa, variação natural em português, ordem de palavras e nomeação equivalente de horário, local, causa ou consequência.
- **Duas explicações por idioma** corrigidas:
  - `*-reading-04-q3`: o texto só diz que o irmão **ajuda no jardim**, e não que ele **cuida do jardim** como responsabilidade própria.
  - `*-reading-09-q1`: a justificativa explícita é que o molho contém leite e há uma **restrição a laticínios**; a explicação não deve minimizar a restrição a apenas beber leite.
- **`ru-v2-grammar-001-q1/q2`:** os enunciados anteriores forneciam literalmente `читал` e `прочитал`, bastando copiar a resposta. Agora pedem a forma masculina passada de `читать` (imperfectivo) ou `прочитать` (perfectivo), preservando objetivo, contexto e gabarito.

## Exemplos de equivalências textuais incorporadas

| Evidência do texto | Pergunta | Alternativas relevantes |
|---|---|---|
| Começa a trabalhar às dez | Por que Lena pode tomar café com o irmão? | `porque ela começa às dez` |
| Mudam de função na leitura | O que fazem depois da primeira leitura? | `invertem os papéis`, `alternam os papéis` |
| Reunião alterada para 10h30 | Qual o novo horário? | `às dez e meia`, `às 10h30` |
| Plataforma dois ocupada por outro trem | Por que mudaram a plataforma? | `porque a plataforma dois está ocupada` |
| Não há cobrança adicional pelo quarto silencioso | O quarto custa mais? | `não, é o mesmo preço` |
| Rótulo do molho informa leite | Por que não usam o molho? | `porque o molho contém leite` |
| Trem cancelado | Por que mudaram o transporte? | `porque cancelaram o trem` |
| Objetivo é economizar energia | Qual é o objetivo? | `reduzir o consumo de energia` |

As variantes são **literais e finitas**. A inclusão não torna o avaliador capaz de julgar todas as paráfrases aceitáveis. Respostas semanticamente válidas ainda podem ficar de fora.

## Auditoria de progressão A1–B1

Distribuição de leituras em cada idioma:

| Faixa atual | Leituras | Questões | Inglês — palavras por leitura | Russo — palavras por leitura |
|---|---:|---:|---|---|
| A1 | 4 | 12 | 54–57 | 46–49 |
| A2 | 6 | 18 | 58–67 | 49–58 |
| B1 | 5 | 15 | 46–49 | 39–41 |

**Achado principal:** os textos B1 são, em quantidade de palavras, **menores** que os de A2 em ambos os idiomas; as questões B1 atuais cobram majoritariamente dados explícitos (quem, quando, onde, o que ocorreu e sim/não). Comprimento de texto, por si só, **não determina nível CEFR**, mas, junto com a demanda cognitiva das perguntas, torna insuficiente usar o rótulo B1 como evidência de competência comunicativa B1.

### Progressão recomendada sem romper histórico

1. **A1:** reconhecer informação direta em textos curtos, usando vocabulário cotidiano e apoio de tradução quando necessário.
2. **A2:** combinar duas informações do mesmo texto, reconstruir sequência de eventos e justificar uma escolha com evidência textual.
3. **B1:** acrescentar **novas** tarefas de inferência sustentada, comparação, intenção do autor, confiabilidade de fontes e síntese de significado, com rubrica explícita e exemplos de resposta; não substituir silenciosamente IDs já usados por estudantes.
4. **Produção:** complementar perguntas literais com escrita independente e transferência para novo contexto, que não sejam avaliadas incorretamente por mera comparação de strings.
5. **Listening:** separar reconhecimento de palavra sintetizada (prática) de compreensão auditiva com áudio gravado/validado; os 120 itens atuais não certificam desempenho auditivo.

**Decisão editorial:** nesta rodada, **não** foram alterados os rótulos A1/A2/B1, para não confundir dificuldade interna com validação externa nem afetar históricos de estudo. As atividades B1 exigem uma avaliação de alinhamento e construção de tarefas adicionais antes de qualquer declaração de nível.

## Rastreabilidade e integridade

- Todas as decisões foram escritas nos catálogos **e** em `scripts/learn/catalog-editorial-overrides.json`, a fonte editorial versionada do PR #108.
- `docs/learn-revisao-itens-474.csv` registra os 474 IDs e acrescenta o campo `edited_in_v5`.
- **Acumulado desde a primeira revisão:** 281 dos 474 exercícios distintos tiveram ao menos uma edição (148 EN, 133 RU). Os outros **193** não receberam alteração em relação à base pré-revisão. Estes números **não** indicam exercícios aprovados, reprovados ou homologados.
- A verificação comparativa preserva a sequência de IDs, nível, modalidade, referências de unidade, `wordIds` e todos os gabaritos existentes; ausência de respostas duplicadas por normalização simples.

## Limites e validações exigidas

1. Passagem por CI do PR: geração determinística, validações de catálogo, tipagem, build e testes relevantes. Este relatório não presume CI verde antes da execução.
2. Revisor independente por idioma para confirmar nuances semânticas, naturalidade e ambiguidade.
3. Tarefas B1 adicionais com revisão de rubricas e estudo com alunos, sem alegar certificação CEFR.
4. Gravações autorizadas e avaliação auditiva real, sem tratar TTS como pronúncia homologada.
5. Preservar os gates C1–C5 e o estado `uncertain` para produção livre não reconhecida.

**Critério de conclusão editorial:** não declarar `474/474 validados pedagogicamente` sem evidência por item e parecer externo. Esta quinta passagem é uma melhoria substantiva do material, mas não substitui homologação.
