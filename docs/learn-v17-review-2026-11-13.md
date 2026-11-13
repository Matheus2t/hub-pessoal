# 2T Learn — V17 | Revisão pedagógica de cenários A1–B1

**Data:** 13/11/2026.  
**Escopo:** V17, 30 etapas (15 inglês e 15 russo), seis checkpoints e sete dimensões de competência.  
**Natureza:** revisão editorial interna de enunciados e critérios de evidência. **Não é homologação por docente externo nem piloto com alunos.**

## Resultado editorial

- Conferidos os **30 cenários** de prática (A1: 4/idioma; A2: 6/idioma; B1: 5/idioma), sua proposta de resposta e os critérios associados.
- Corrigidos **8 cenários** que tinham estímulo ausente, referente vago ou conteúdo insuficientemente especificado: `en-progress-v17-02`, `en-progress-v17-05`, `en-progress-v17-14`, `ru-progress-v17-01`, `ru-progress-v17-03`, `ru-progress-v17-04`, `ru-progress-v17-07` e `ru-progress-v17-10`.
- **Uma rubrica essencial ajustada** em `ru-progress-v17-01`: passar de grafia genérica a compreensão explícita de informações do bilhete em cirílico.
- Preservados os **30 IDs V17**, os **180 vínculos aos seis exercícios V12 por etapa**, os **seis checkpoints** e as **sete competências**. Não foram alterados exercícios, gabaritos, histórico, backups, rotas de produção ou estados de liberação.
- A interface agora esclarece que tarefas de produção em inglês devem ser respondidas em inglês; em russo, em cirílico. Quando um enunciado pede explicação metalinguística em português, isso é permitido. Respostas livres permanecem **sem correção automática**.

## Registros por intervenção

| ID | Problema identificado | Ajuste na proposta de estudo |
|---|---|---|
| en-progress-v17-02 | Pedia reescrever um diálogo sem apresentar o diálogo | Inclusão de três frases originais sobre Marta e uma clínica, com referentes substituíveis |
| en-progress-v17-05 | Referente hipotético e hábito não especificados | Contexto de Eva: trabalho noturno e ausência de estudo pela manhã, sem fornecer frases resolvidas |
| en-progress-v17-14 | Relativas com referentes inteiramente em aberto | Tarefa de pessoa que repara computadores (`who`) e ferramenta que mede temperatura (`which`) |
| ru-progress-v17-01 | Pedia leitura de bilhete sem fornecer texto nem pergunta de compreensão | Bilhete em cirílico com `Ёж` e `Лена`, duas informações localizáveis e comparação `ё/е` |
| ru-progress-v17-03 | Pedia classificação de palavras não disponibilizadas | Amostra `стол, книга, словарь, дверь`, incluindo dois gêneros terminados em `-ь` |
| ru-progress-v17-04 | Pedia plural sem substantivos para flexionar | Quatro substantivos escritos, incluindo `учитель` |
| ru-progress-v17-07 | Pedia respostas a duas perguntas ausentes | Inclusão de duas perguntas concretas em cirílico, sem respostas-modelo |
| ru-progress-v17-10 | Exigia flexão numeral sem objeto de referência | Contexto de papelaria, substantivo `книга` e quantidades 1, 2 e 5 |

## Leitura da progressão por idioma

| Faixa curricular | Inglês | Russo | Limite de interpretação |
|---|---|---|---|
| A1, etapas 1–4 | Identidade, pronomes, artigos, rotina | Cirílico funcional, frases nominais, gênero e plural | Verificar inteligibilidade e conteúdo em contexto, não somente forma isolada |
| A2, etapas 5–10 | Perguntas, posse, encontro, existência, tempo verbal, passado | Posse, presente, negação, perguntas, objeto direto, numeral | Contextualizar situações; não penalizar resposta correta por formulação alternativa |
| B1, etapas 11–15 | Experiência, condição, passiva, relativas, narrativa | Aspecto, genitivo, dativo, instrumental, movimento | Exigir tarefa nova e revisão humana da finalidade comunicativa |

**Observação pedagógica:** B1 é uma meta de currículo, não um selo obtido por acertar cinco etapas. A escolha de estruturas isoladas não demonstra automaticamente autonomia em leitura, escrita, fala, escuta e interação. Os checkpoints continuam **propostas**, sem pontuação ou portões de acesso.

## Regras que devem permanecer obrigatórias

1. **Estudo:** tentativas de exercícios legados contam somente IDs únicos respondidos por idioma, inclusive respostas erradas e `uncertain`. Repetições não aumentam cobertura.
2. **Desempenho observado:** só se aplica a tarefa nova, com fonte/versionamento, independência e revisão compatíveis. Uma avaliação positiva diz respeito àquela tarefa, não a um nível CEFR.
3. **Não avaliado:** sem gravação aprovada e protegida contra leitura prévia da transcrição, a compreensão auditiva não pode ser pontuada. Produção oral e interação requerem suas próprias evidências.
4. **Sem julgamento automático de escrita livre:** exemplos de resposta não são strings obrigatórias; ambiguidade ou divergência exigem revisão humana e não zero automático.
5. **Transferência e retenção:** atividade com referentes substituídos é exercício de transferência *imediata*. Para alegar retenção, aplicar nova tarefa em momento posterior, sem modelo, e documentar essa separação.
6. **Publicação:** `public:false`; V17 continua visível somente em prévia local, sem atribuição de proficiência, certificado, nota, ou mudança de IndexedDB/backups.

## Verificação e responsabilidades restantes

- O teste de integração V17 verifica quantidade de cenários, checkpoints, competências, IDs legados, bloqueio de preview e os 16 casos sintéticos.
- Novo teste aponta oito enunciados que devem conservar seus estímulos específicos; a regressão completa de browser e build fica condicionada ao CI.
- **ChatGPT (concluído nesta entrega):** revisão editorial interna, correção dos oito estímulos, alinhamento de idioma e ampliação da regressão textual.
- **Codex (futuro):** trilha auditável de proveniência e revisão humana, armazenamento consentido de evidências reais, tratamento de versões e publicação condicionada aos aceites.
- **Revisores externos / piloto (ainda pendentes):** validar dificuldade, naturalidade, adequação A1–B1 e confiabilidade da rubrica em ambos os idiomas. Sem essas etapas, não declarar proficiência nem ativar avaliação como prova.
- **Responsável pelo site:** liberar cada modalidade quando seus próprios critérios forem cumpridos; o aceite para prática formativa não equivale a autorização de certificação ou áudio.

**Rastreabilidade:** a revisão também atualiza `docs/learn-avaliacao-etapas-v17.json` na branch editorial do PR #122 para evitar que textos anteriores sobrescrevam a versão revisada em futura reconciliação. O PR #122 continua draft e não deve ser aplicado automaticamente sem resolver a divergência de base.
