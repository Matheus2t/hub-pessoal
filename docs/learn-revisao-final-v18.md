# 2T Learn — V18 | Revisão editorial integrada e reconciliação com a produção

**Referência:** 12/11/2026 (America/Sao_Paulo).  
**Natureza:** auditoria editorial interna do ChatGPT, acompanhada de verificações estruturais sobre os documentos e o código versionado.  
**Origem da auditoria:** [PR #123](https://github.com/Matheus2t/hub-pessoal/pull/123) e manifesto editorial V18 original, atualizados com os merges reais da V11 e da V16.  
**Decisão:** **V18 documental pronta para integração técnica**. Isso **não libera automaticamente** V13, V14, V16 ou V17 ao público, não comprova nível CEFR e não homologa gravações.

> A equipe é formada pelo proprietário, ChatGPT e Codex. O proprietário pode aceitar o material para *prática formativa não certificadora*. Revisão interna, aceite editorial, publicação técnica, avaliação auditiva e certificação são decisões diferentes. **Nenhuma revisão linguística externa, aplicação-piloto com estudantes ou certificação CEFR foi realizada nesta V18.**

## 1. Estado verificado por versão

| Versão | Escopo | Editorial | Integração e publicação |
| --- | --- | --- | --- |
| **V11** | 24 atividades-ponte, sendo 4 roteiros de Listening | [#116](https://github.com/Matheus2t/hub-pessoal/pull/116) integrado com aceite explícito do proprietário | [#132](https://github.com/Matheus2t/hub-pessoal/pull/132) e [#133](https://github.com/Matheus2t/hub-pessoal/pull/133) integrados. **20 tarefas não auditivas públicas como prática sem notas; 4 auditivas indisponíveis**, sem áudio aprovado |
| **V12** | 15 etapas por idioma | Referência curricular mantida | Estrutura de progressão continua em prévia; não há certificação de nível |
| **V13** | 32 roteiros / 80 questões de Listening | [#118](https://github.com/Matheus2t/hub-pessoal/pull/118) em rascunho editorial | Trabalho técnico separado; **sem autorização de liberação auditiva**, pois não há gravações homologadas |
| **V14** | 32 ditados A2/B1 | [#119](https://github.com/Matheus2t/hub-pessoal/pull/119) em rascunho editorial | **Ainda não liberada ao público**; depende de gravação aprovada para uso auditivo avaliável |
| **V15** | Player e política de evidência auditiva | Contratos técnicos anteriormente integrados | Síntese do navegador não equivale a escuta de gravação homologada |
| **V16** | 10 textos B1, 40 perguntas e 10 tarefas de transferência | [#121](https://github.com/Matheus2t/hub-pessoal/pull/121) em rascunho editorial | [#134](https://github.com/Matheus2t/hub-pessoal/pull/134) integrado à main: **interface de prévia local**, bloqueada no domínio público; nenhum resultado classificado automaticamente |
| **V17** | 30 cenários de etapa, 6 checkpoints de nível, 16 casos sintéticos | [#122](https://github.com/Matheus2t/hub-pessoal/pull/122) em rascunho editorial | **Política proposta, não avaliação de domínio publicada** |
| **V19** | Pipeline e 68 gravações (32 V13 + 32 V14 + 4 V11) | Revisão auditiva do proprietário pendente | Geradas e aprovadas *tecnicamente* 68 gravações, armazenadas em ambiente privado; **0 gravações aprovadas por escuta do proprietário, 0 MP3 V19 públicos** |

**Distinção importante sobre a V11:** o documento editorial histórico preserva as flags originais de rascunho. A **decisão explícita posterior do proprietário**, implementada na V11 pública, habilitou somente os 20 exercícios não auditivos como prática formativa. Os quatro itens de Listening continuam bloqueados.

**Distinção importante sobre a V16:** a interface foi integrada ao código e passou nos testes, mas a autorização editorial de publicação **não foi dada**. Assim, a rota pública continua bloqueada. A V18 não deve interpretar o merge técnico da V16 como licença para ativar conteúdo avaliativo.

## 2. Revisões materiais de conteúdo (original V18, reconferidas nas fontes)

### V11 — precisão semântica e privacidade
- **en-bridge-v10-02:** o estímulo especifica *start work at nine*; apenas *work at nine* não demonstra horário de início. O enunciado pede duas frases sobre duas pessoas.
- **en-bridge-v10-11:** condição meteorológica expressa como hipótese (*It might rain tomorrow*), evitando apresentar o evento futuro como certeza.
- **ru-bridge-v10-03:** inferência deve identificar que não há evidência para *ler somente na biblioteca*; não basta localizar o termo дома, nem concluir que a personagem nunca visita a biblioteca.
- **ru-bridge-v10-06:** solicitação utiliza nome fictício, evitando coleta desnecessária de dado pessoal.
- **Regra:** resposta aberta diferente do exemplo não é automaticamente incorreta. Os modelos são ilustrações e não uma lista exaustiva de respostas possíveis.

### V13 — roteiro de Listening e interpretação
- **ru-listen-v13-16:** calendário do aviso ajustado para funcionamento de terça a sexta, com horário adicional às sextas; a pergunta sobre segunda-feira não contradiz o roteiro.
- **Todas as 32 unidades / 80 questões** seguem 8 roteiros A2 e 8 B1 por idioma, com gabaritos de alternativa existentes e exemplos editoriais nas respostas abertas.
- Resposta aberta desconhecida **não recebe erro automático**. Com transcrição revelada antes da tentativa ou voz não homologada, **não registrar evidência independente de Listening**.

### V14 — ditado com variantes explícitas
- **ru-dict-v14-01:** eliminada a grafia híbrida *предметos* na rubrica editorial.
- **ru-dict-v14-04 / 06:** concordância (*ближайшая аптека*) e emprego dos numerais descritos sem ambiguidade.
- **ru-dict-v14-07:** corrigido *curto curto* e o objetivo: *короткое письмо* exemplifica concordância no neutro, não mudança morfologicamente visível para acusativo.
- **ru-dict-v14-11 / 12:** referências a formas de caso (мне/сестре, неё/нее, instrumental com с) descritas com mais precisão.
- Não aplicar normalização irrestrita de ё/е, numerais e pontuação que altere sentido. Transcrições não reconhecidas seguem para **revisão humana ou uncertain**.

### V16 — evidência textual e escrita separadas
- **en-reading-b1-v16-04:** a pessoa que narra não informa gênero; os enunciados não devem presumir homem ou mulher. Foco em participação nas discussões, não em atividade de leitura que o texto não descreve.
- Todas as 40 questões citam evidências presentes literalmente nas dez passagens; isso **não valida externamente** as inferências ou a classificação B1.
- As duas questões abertas por texto têm exemplos **ilustrativos**, não gabarito de igualdade de strings.
- As dez tarefas de transferência são produção escrita, **não devem ser contadas como prova autônoma de compreensão escrita B1**. A interface de prévia não gera notas.

### V17 — separação rigorosa de indicadores
- **Estudo realizado:** conta respostas/IDs distintos, inclusive tentativas erradas e incertas; não indica domínio.
- **Desempenho observado:** só pode descrever tarefa real, inédita e aprovada, com método/revisão compatíveis e contexto documentado.
- **Recomendação de estudo:** orientação reversível, sem travar módulos nem conceder nível certificado.
- **Fala, interação e compreensão auditiva:** ficam como *não avaliadas* sem amostras e evidência apropriadas.
- Não publicar alegações de fluência, certificado CEFR A1/A2/B1 ou domínio derivado de percentual global de respostas.

## 3. Auditoria estrutural cruzada executada sobre o repositório

Foram consultados diretamente os arquivos JSON editoriais das branches dos PRs #118/#119/#121/#122, a fonte V11 já integrada à main, as cópias de execução V11/V16, os catálogos EN/RU e a progressão V12.

| Verificação | Resultado |
| --- | --- |
| Exercícios legados | **474** — 237 em Inglês e 237 em Russo |
| V11 | **24** tarefas, 20 liberadas como prática escrita, 4 auditivas bloqueadas |
| V13 | **32** unidades; **80** perguntas (48 objetivas); 8 A2 e 8 B1 por idioma |
| V14 | **32** ditados; 8 A2 e 8 B1 por idioma |
| V16 | **10** textos, **40** perguntas (20 objetivas + 20 abertas) e **10** transferências |
| V17 | **30** planos de etapa, 15 por idioma |
| IDs de proposta novos verificados (V11/V13/V14/V16/V17) | **258 distintos**, sem colisões com os 474 IDs dos exercícios legados |
| V13 — distribuição de gabaritos por idioma | **8 A / 8 B / 8 C** |
| V16 — distribuição de gabaritos por idioma | **4 A / 3 B / 3 C** |
| Trechos de evidência V16 | Todos os trechos declarados nas 40 perguntas encontrados nas passagens respectivas |
| V11 e V16 integrados | IDs, textos e perguntas comparados às fontes editoriais: **sem diferenças inesperadas** |
| V12 | Etapas/níveis relacionados aos materiais novos coerentes com o mapeamento consultado |
| Questões objetivas | Alternativas e chave editorial presentes; **isso não é validação pedagógica independente** |

**Metodologia e limite:** as checagens acima foram executadas sobre os arquivos do GitHub. Ausência de colisões, inconsistências estruturais e citações ausentes no escopo inspecionado **não é garantia de ausência de erro linguístico ou didático**. Releituras humanas, teste real com estudantes e validação de áudio não foram efetuados. Os **16 casos sintéticos V17** foram identificados na coleção editorial, mas não equivalem a resultados de alunos.

As referências e snapshots de Git estão no [manifesto de revisão V18](./learn-revisao-integrada-v18.json). Um teste adicional no repositório valida a integridade dos **dados já integrados em main**; dados ainda exclusivos das branches editoriais exigem nova checagem quando forem integrados.

## 4. Áudio: o que já está pronto e o que não está

O escopo potencial é **68 gravações distintas**: 32 de Listening V13, 32 de ditado V14 e quatro de Listening V11. O pipeline V19 **produziu e verificou tecnicamente 68/68 arquivos em ambiente privado**. O usuário adiou a revisão por escuta até depois da implementação. Até esta data não há aceite auditivo do proprietário.

O Listening público atual do navegador **pode reproduzir fala sintetizada**, mas **não deve ser descrito como áudio V19 homologado**. Não hospedar arquivos privados, atribuir pontuação auditiva a uma voz não revisada, simular escuta ou afirmar que o proprietário já aprovou a pronúncia.

## 5. Condições para conclusão do Learn (além da auditoria V18)

1. **V13 e V14:** concluir integrações técnicas, revisão das atividades e vínculo correto com gravações autorizadas. Continuar com área de prévia se não houver aceite auditivo.
2. **V16:** solicitar aceite editorial próprio caso se deseje publicação formativa; manter gabaritos como referência não certificadora e respostas abertas sem julgamento automático.
3. **V17:** implementar critérios de desempenho/etapas sem inferir domínio de tentativas antigas; preservar backups e a trilha anterior.
4. **V19:** revisão auditiva posterior, eventual regeneração, revisão de licença e publicação controlada dos MP3s aprovados.
5. **Homologação geral:** experiência em celulares e desktop, testes de acessibilidade, cirílico, histórico, recuperação de dados, regressão e confirmação de cada deployment.
6. **Governança:** registrar autorização específica por versão e por tipo de avaliação; publicar apenas recursos cujo estágio de revisão e mídia permita.

**Conclusão da V18:** a revisão editorial interna e a reconciliação com o estado atual do projeto estão concluídas neste documento. **Ela não é a homologação final de todo o Learn** e não substitui etapas técnicas ou aceite do proprietário para V13, V14, V16, V17 e V19.
