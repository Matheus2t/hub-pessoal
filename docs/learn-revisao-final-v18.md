# 2T Learn — V18 | Revisão editorial integrada e estado técnico atualizado

**Atualizado em:** 13/11/2026 (America/Sao_Paulo).  
**Baseline consultada:** `main` em `55186744e333f09788f20c9bacf174574a9bfcfb`, após o PR #149.  
**Natureza:** conciliação documental de entregas editoriais, implementações, auditorias e decisões de operação. **Não é a homologação integrada final.**  
**Fonte estruturada:** [manifesto V18](./learn-revisao-integrada-v18.json), mantendo as evidências históricas da revisão inicial de 12/11/2026 e do [PR #123](https://github.com/Matheus2t/hub-pessoal/pull/123).

## 1. Decisão operacional do proprietário

Em **13/11/2026**, o proprietário dispensou a necessidade de professores, avaliadores externos, grupos-piloto e escuta de todos os áudios **antes de começar seu uso pessoal**. Ele será o único avaliador da experiência, com observações durante o uso e solicitações posteriores de ajuste.

Isso significa:

- A revisão pedagógica externa, piloto com terceiros e pré-aprovação auditiva deixam de ser **dependências de processo** da sua experiência particular. Registrar como **dispensados**, nunca como executados ou aprovados.
- A avaliação prática do proprietário será feita **quando ele utilizar o Learn**; não existe ainda parecer de uso real, teste em dispositivos físicos ou aceite específico das gravações.
- A dispensa **não habilita automaticamente** mídia protegida, rotas privadas, avaliações auditivas, certificação CEFR ou papéis de revisor institucional. Qualquer alteração de acesso público ou tipo de pontuação exige decisão e verificação técnica próprias.
- As 68 gravações privadas estão tecnicamente produzidas/verificadas, mas **zero** aprovações humanas por escuta foram registradas. Elas podem ser objeto de avaliação pessoal futura, sem declarar que sua pronúncia foi validada.
- Respostas abertas não reconhecidas continuam `uncertain`/pendentes; prática e porcentagens de acerto não autorizam afirmar domínio A1/A2/B1.

**Critério de encerramento acordado:** concluir a documentação e a **homologação técnica integrada**. Depois, o proprietário decide se a experiência está boa ou ruim ao usá-la; não haverá aguardas de avaliadores externos ou estudantes.

## 2. Estado por versão, após as integrações

| Módulo | Conteúdo e versão | Situação técnica na `main` | Disponibilidade real |
| --- | --- | --- | --- |
| Legado EN/RU | **474 exercícios** (237 + 237), com vocabulário, escrita, leitura, gramática, Listening e ditado | Catálogos versionados; auditoria e ajustes do [PR #148](https://github.com/Matheus2t/hub-pessoal/pull/148) integrados | **Público** para prática; TTS do navegador não comprova competência auditiva |
| **V11** | **24 atividades-ponte**, das quais 4 auditivas | PRs [#116](https://github.com/Matheus2t/hub-pessoal/pull/116), [#132](https://github.com/Matheus2t/hub-pessoal/pull/132) e [#133](https://github.com/Matheus2t/hub-pessoal/pull/133) integrados | **20 não auditivas públicas** como prática formativa, **4 auditivas bloqueadas** |
| **V12** | **30 etapas** A1–B1 (15 EN/15 RU) | Validações curriculares [#144](https://github.com/Matheus2t/hub-pessoal/pull/144) integradas | **Prévia local**, não certificado de nível |
| **V13** | **32 roteiros e 80 perguntas** de Listening A2/B1 | Editorial [#118](https://github.com/Matheus2t/hub-pessoal/pull/118) integrado; servidor de prévia local com sessão e testes | **Prévia local protegida**; sem avaliação pública de Listening |
| **V14** | **32 ditados** (16 EN/16 RU) | Implementação [#145](https://github.com/Matheus2t/hub-pessoal/pull/145) e revisão final [#119](https://github.com/Matheus2t/hub-pessoal/pull/119) integradas | **Prévia local protegida**; arquivos privados não homologados por escuta |
| **V15** | Player e política de evidência auditiva | Implementação e testes preservados | Sintetizador para estudo; **sem inferência de desempenho auditivo** |
| **V16** | **10 textos B1, 40 perguntas, 10 tarefas de transferência** | Editorial [#121](https://github.com/Matheus2t/hub-pessoal/pull/121) e integração [#134](https://github.com/Matheus2t/hub-pessoal/pull/134) integrados; isolamento público reforçado pelo [#147](https://github.com/Matheus2t/hub-pessoal/pull/147) | **Prévia local**, módulos/roteiros excluídos do bundle público |
| **V17** | **30 cenários**, 6 checkpoints, 16 casos sintéticos; revisão formativa e recomendações determinísticas | Editorial [#122](https://github.com/Matheus2t/hub-pessoal/pull/122), implementação [#138](https://github.com/Matheus2t/hub-pessoal/pull/138)/[#139](https://github.com/Matheus2t/hub-pessoal/pull/139), auditoria [#143](https://github.com/Matheus2t/hub-pessoal/pull/143) e isolamento [#147](https://github.com/Matheus2t/hub-pessoal/pull/147) integrados | **Prévia local**, sem nota CEFR, módulos excluídos do bundle público |
| **V18** | Revisão editorial cruzada e governança documental | Inventário, matriz de evidências, políticas e status reconciliados neste documento | **Documentação**, não nova modalidade pública |
| **V19** | **68 MP3s privados** (32 V13 + 32 V14 + 4 V11) | Pipeline de geração e integridade técnica concluído; sem divulgação de gravações | **0 MP3s V19 públicos; 0 aprovações por escuta**, sem avaliação auditiva habilitada |
| **V20–V22** | Experiência do aluno, navegação e usabilidade mobile | Melhorias [#149](https://github.com/Matheus2t/hub-pessoal/pull/149) integradas, incluindo foco, feedback e alvos de toque do teclado cirílico | Interfaces públicas do legado ajustadas; validação em celulares reais fica a critério do proprietário |

**Não confundir:** `main` atualizada, build aprovado, domínio respondendo 200 e liberação de uma **prévia restrita** são fatos diferentes. Merge técnico não elimina uma flag privada nem prova que um deployment específico está ativo na URL pública. O Learn atual não deve anunciar certificado CEFR.

## 3. Qualidade curricular, exercícios e decisões editoriais

### Conteúdo legado e auditoria interna

O [relatório de qualidade dos 474 exercícios](./learn-exercise-quality-audit-2026-11-13.md) registra: **237 exercícios por idioma**, 104 atividades de escrita, 90 de leitura, 90 de gramática, 70 de teste e 120 práticas auditivas com síntese do navegador. A varredura encontrou **zero** duplas de enunciado/gabarito exatamente repetidas, zero gabaritos vazios, zero referências de unidade inválidas e zero feedbacks genéricos antigos de escrita.

No PR #148 foram incorporadas **quatro variantes completas de escrita em russo** e duas revisões de explicação em Listening. O mecanismo não interpreta qualquer paráfrase desconhecida como erro: em escrita, resultado não reconhecido fica `uncertain`. **Ausência de problemas mecânicos não é certificação da correção linguística de todas as frases.**

### V11 — sentido e limites

- `en-bridge-v10-02`: *start work at nine* é horário de início, não apenas existência de trabalho naquele horário.
- `en-bridge-v10-11`: hipótese meteorológica não vira certeza.
- `ru-bridge-v10-03`: não inferir que a personagem lê somente na biblioteca quando falta evidência.
- `ru-bridge-v10-06`: usar nome fictício para não solicitar dado pessoal.
- São **20 tarefas de prática formativa** liberadas e **4 de Listening** ainda não habilitadas. Exemplos de resposta são ilustrativos.

### V13 — Listening A2/B1

O editorial [#118](https://github.com/Matheus2t/hub-pessoal/pull/118) foi incorporado. O roteiro `ru-listen-v13-16` teve o calendário corrigido; os 32 roteiros contêm 80 perguntas. A transcrição vista antes da tentativa e a voz não homologada não geram evidência independente de Listening. O serviço de prévia local não equivale a uma função de avaliação pública.

### V14 — ditados A2/B1

O [parecer final V14](./learn-v14-final-editorial-review-2026-11-13.md) revisou os 32 roteiros e as 12 variantes completas explícitas: seis EN e seis RU. Foram documentadas ressalvas pedagógicas como o genitivo em `ru-dict-v14-08`, a palavra `ближайшая` e a demanda de memória da atividade `en-dict-v14-16`. Os arquivos editoriais originais foram mantidos para preservar os hashes usados no vínculo com os MP3s privados. Sua existência técnica **não substitui escuta**.

### V16 — leitura B1

As 40 perguntas estão vinculadas aos dez textos e às respectivas evidências editoriais, com 20 respostas objetivas e 20 abertas, mais dez transferências. A revisão `en-reading-b1-v16-04` evita presumir gênero da pessoa que narra. A transferência escrita não é prova autônoma de compreensão leitora. Não transformar respostas abertas em nota automática.

### V17 — avaliação e recomendações

O [relatório técnico V17](./learn-v17-audit-2026-11-13.md) diferencia estudo realizado, evidência revista e recomendação. Cada idioma mantém histórico próprio; o sistema não atribui domínio global de uma etapa nem nível CEFR a partir de tentativas legadas. O fluxo de revisão local oferece histórico/divergências, mas **identidade local de revisor não é autenticação institucional**. A V17 segue restrita à prévia.

## 4. Segurança, dados e usabilidade

O [relatório de segurança](./learn-security-audit-2026-11-13.md) e os PRs [#146](https://github.com/Matheus2t/hub-pessoal/pull/146)/[#147](https://github.com/Matheus2t/hub-pessoal/pull/147) documentam duas proteções complementares:

1. No **build público**, somente os catálogos `en.json`, `ru.json` e o manifesto de áudio de estudo são copiados para `dist/learn`; arquivos JSON de pilotos, diagnósticos e rascunhos internos não são distribuídos nessa pasta.
2. Módulos e cenários V16/V17 **não entram no bundle público**. O bloqueio de rota em navegador não deve ser descrito como proteção de segredos que existam em arquivos públicos ou no histórico de um repositório público.

O histórico do aluno permanece local no IndexedDB, separado por EN/RU, com backups **v1/v2/v3** compatíveis. O arquivo de backup inclui respostas e dados pessoais de estudo e **não é criptografado**. Exportá-lo é uma decisão explícita do usuário, que deve protegê-lo.

A [auditoria de experiência e mobile](./learn-mobile-ux-audit-2026-11-13.md) acrescentou orientação de foco na questão, no feedback e ao avançar, metadados de idioma no campo de resposta e botões cirílicos de pelo menos **44 × 44 CSS px**. Cobertura automatizada inclui viewports **320, 390 e 768 CSS px**, regressões de tema, navegação, teclado e histórico; não afirma testes físicos em Android/iOS nem conformidade WCAG completa.

## 5. Evidência de CI e data da observação

Resultados observados nos PRs **já integrados**:

| Referência | Verificação registrada | Resultado observado |
| --- | --- | --- |
| [#145](https://github.com/Matheus2t/hub-pessoal/pull/145) + [#119](https://github.com/Matheus2t/hub-pessoal/pull/119) | Implementação e revisão textual V14, IDs preservados, servidor local, teste de isolamento e documento editorial | Integrados |
| [#147](https://github.com/Matheus2t/hub-pessoal/pull/147) | V16/V17 ausentes do bundle público, prévias localhost bloqueadas no domínio | Integrado |
| [#148](https://github.com/Matheus2t/hub-pessoal/pull/148) | Qualidade dos 474 exercícios, geração determinística, variantes e regressões | **5/5 checks pós-merge aprovados** |
| [#149](https://github.com/Matheus2t/hub-pessoal/pull/149) | Regressão integrada do Learn (local), experiência mobile e segurança pública | **216 Playwright locais + 2 testes públicos aprovados**; **3/3 checks pós-merge aprovados** |

**Limite da evidência:** são resultados de CI registrados no GitHub para versões integradas até a baseline acima. **Não foram reexecutados por este documento** e não equivalem a uma homologação integrada única posterior à atualização V18. A verificação da identidade/SHA do deployment exato no painel da Vercel permanece independente dos checks de build.

## 6. O que resta e como encerrar

**Pendente — uma única etapa técnica principal:** a **homologação integrada final do Learn**, em execução separada da revisão documental. Ela deverá inspecionar, sobre uma baseline única da `main`, catálogos EN/RU, V11 público, flags de V12/V13/V14/V16/V17/V19, integridade dos dados, restauração de backup, progressão, reprodução de áudio para prática, casos de falha e modo mobile. Registrar os resultados e a versão realmente implantada, sem tratar teste local como prova de deployment.

**Dispensado como requisito do fluxo do projeto, por decisão do proprietário:** validação pedagógica externa, turma-piloto com terceiros e escuta prévia de todos os 68 MP3s antes de começar a utilização pessoal. Não marcar essas atividades como feitas; elas simplesmente deixam de impedir o fechamento técnico.

**Posterior, sob decisão do proprietário:** utilizar o Learn e informar o que ficou bom ou ruim, pedir melhorias e eventualmente autorizar publicação de experiências hoje privadas. Não existe aprovação prática antecipada nesta documentação.

**Mantido por segurança e veracidade:** sem certificação CEFR; sem transformar TTS/MP3 não revisado em avaliação auditiva; sem promover respostas incertas para acertos/erros por adivinhação; sem liberar rotas ou mídia protegidas automaticamente.

**Conclusão da V18:** inventário editorial e mapa de integração atualizados para 13/11/2026. A documentação pode ser considerada encerrada após revisão dos testes deste PR. A homologação técnica integrada final continua sendo uma entrega **separada**.
