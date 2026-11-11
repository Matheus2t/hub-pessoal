# 2T Learn — Rastreabilidade de conteúdo e cobertura curricular

**Cronograma:** etapa 2.3 (mapeamento do catálogo existente) — análise de cobertura, **não migração**.  
**Reprodutível com:** `npm run learn:coverage` e `node scripts/report-learn-coverage.mjs --json`.

## 1. Escopo da cobertura existente

Há **491 itens legados por idioma** (162 palavras, 62 expressões, 15 leituras, 15 lições de gramática e 237 exercícios). Todos permanecem disponíveis no Learn original.

| Tipo | Inglês: vinculados / total | Russo: vinculados / total |
|---|---:|---:|
| Palavras | 9 / 162 | 10 / 162 |
| Expressões | 9 / 62 | 7 / 62 |
| Leituras | 6 / 15 | 3 / 15 |
| Lições | 4 / 15 | 6 / 15 |
| Exercícios | 7 / 237 | 8 / 237 |
| **Itens únicos vinculados** | **35 / 491** | **34 / 491** |

Os currículos têm **71 referências totais** porque um mesmo ID pode ser vinculado a mais de um objetivo. Em termos de itens únicos, são **69 vínculos distintos** distribuídos pelos idiomas.

**Não significa que 913 itens estão errados.** Significa apenas que nenhum objetivo comunicativo do **novo** currículo foi formalmente associado a eles até agora. O plano é preservar esses itens e classificar somente quando houver objetivo pedagógico legítimo, começando pelos dois pilotos.

Também não significa que os 69 itens mapeados já são evidência de proficiência. Suas etiquetas `lexical-support`, `context`, `grammar-support` e `existing-practice` indicam **possíveis usos** e exigem revisão antes de integrações automáticas.

## 2. Por que não mapear tudo por palavras-chave?

Uma questão sobre "station" pode avaliar tradução de uma palavra, identificação de uma placa, compra de bilhete ou compreensão de uma orientação. A presença de uma palavra não diz qual competência ela observa.

Se associarmos automaticamente todos os exercícios de "Transporte e viagens" à competência "conseguir pedir orientação", criaremos falsas evidências de domínio.

O relatório de cobertura distingue:
- `mapped-as-support`: ID vinculado explicitamente a um objetivo, com papel e justificativa.
- `unclassified`: ainda não houve avaliação editorial de alinhamento ao novo currículo.

Ambos os estados preservam intactos os IDs, o nível legado, o conteúdo e as tentativas. **Nenhum dos dois significa aprovação de nova proficiência.**

## 3. Ordem recomendada de mapeamento editorial

| Prioridade | Parte do catálogo | Critério |
|---|---|---|
| 1 | Material utilizado nas duas unidades-piloto | Verificar exatamente qual conceito é necessário para realizar a tarefa comunicativa |
| 2 | Textos e gramática complementares a esses pilotos | Selecionar apenas se melhorarem compreensão, produção ou feedback |
| 3 | Exercícios de retomada e revisão | Selecionar se criarem oportunidade de recordação ou aplicação diferente, não repetição literal |
| 4 | Próximos objetivos curriculares depois de validar os pilotos | Relacionar por competência, pré-requisito e nível real de apoio |
| 5 | Conteúdo restante | Manter catálogo antigo disponível até haver objetivo aprovado; não forçar encaixe |

### Piloto de Inglês

Revisar especialmente os itens de `Cumprimentos` e `Trabalho e estudos`, selecionando os que realmente auxiliam a primeira conversa e a apresentação em contexto de projeto. Exemplos de **candidatos ainda não homologados**: `en-word-075` (cargo), `en-word-077` (universidade), `en-phrase-003` (pedir repetição) e `en-test-08` (bom dia em inglês).

### Piloto de Russo

Revisar `Transporte e viagens` e construções de pergunta, sem confundir o objetivo de localização com compra de bilhete. Exemplos de **candidatos ainda não homologados**: `ru-word-095` (rua), `ru-word-097` (mapa), `ru-phrase-009` (onde comprar bilhete, somente se o escopo for expandido) e `ru-reading-07` (texto de mudança de plataforma, provavelmente mais avançado que o piloto).

**Esses exemplos não foram adicionados automaticamente aos currículos.** O roteamento futuro deve ser uma decisão didática, não simples correspondência de tema.

## 4. Uso do relatório por quem implementará o motor

```bash
npm run learn:coverage
node scripts/report-learn-coverage.mjs --json
```

O relatório JSON inclui:
- cada ID de todos os cinco tipos de conteúdo por idioma;
- modalidade, nível e tópico legados;
- objetivo(s) aos quais o item foi vinculado e papel de cada vínculo;
- IDs ainda não classificados;
- distribuição de cobertura por habilidade e candidatos por tema para inspeção humana.

O `--check` falha se um vínculo passar a referenciar ID ausente ou idioma errado. Não reprova itens sem vínculo, pois o objetivo **não** é atingir artificialmente 100% de associação.

### Restrições de migração

1. Nunca renomear IDs com histórico nem reaproveitar identificadores para tarefas que medem algo diferente.
2. Não contar uma tentativa de tradução isolada como produção comunicativa independente.
3. Não duplicar uma mesma questão e contar as duas ocorrências como provas independentes.
4. Manter o modo antigo disponível durante migração incremental, sem apagar tentativas ou backups.
5. Se conteúdo novo for criado para suprir uma lacuna, documentar necessidade, rubrica e revisão linguística antes de ativá-lo.

## 5. Aceite real desta etapa

- [x] Todos os IDs legados podem ser listados e localizados automaticamente.
- [x] Os vínculos atuais podem ser inspecionados com justificativas.
- [x] Há relatório de lacunas por tipo e modalidade.
- [x] A integridade das referências está no CI.
- [ ] Revisão individual dos itens mais úteis para os pilotos.
- [ ] Associação completa dos itens realmente necessários a cada objetivo aprovado.
- [ ] Evidência de ganho pedagógico a partir das unidades-piloto antes de expandir mapeamento.

O restante do catálogo pode continuar sem associação ao novo currículo indefinidamente, se não acrescentar valor à aprendizagem pessoal.
