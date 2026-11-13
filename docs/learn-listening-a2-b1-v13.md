# 2T Learn — Listening A2/B1 (V13, pacote editorial)

**Status:** roteiro editorial em revisão, `publicRelease: false`. **Não existe áudio gravado, licenciado, revisado ou homologado nesta entrega.** Nenhum roteiro pode ser considerado atividade de compreensão oral aplicada até que haja áudio aprovado e teste de escuta sem transcrição. Este pacote **não certifica A2/B1 pelo CEFR**.

## 1. Objetivo e referências

Criar material de *recepção oral* para A2 e B1 em Inglês e Russo, sem mudar os **474 exercícios legados**, os backups, o IndexedDB, a trilha V12 ou as 24 atividades-ponte da V11.

- Conselho da Europa, *CEFR Companion Volume*: [descritores de compreensão de gravações](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4). Em termos gerais, A2 cobre informação essencial de passagens curtas e previsíveis, faladas lenta e claramente; B1 cobre informação principal e detalhes relevantes em fala clara sobre assuntos familiares, incluindo razões e narrativas.
- Comissão Europeia, [Europass: grade de autoavaliação](https://europass.europa.eu/en/common-european-framework-reference-language-skills) — descritores de Listening A2/B1.
- [Mapa pedagógico V10](./learn-progressao-a1-b1-v10.md) e [trilha guiada V12](./learn-progression-v12.md).

**Interpretação editorial:** A2 trabalha mensagens curtas, informações práticas, retificações e horários. B1 trabalha sequências, justificativas, consequências, acordos, limites e intenção comunicativa. O nível atribuído é **hipótese curricular**; somente especialistas podem validar adequação e acessibilidade.

## 2. Arquivos e inventário

| Idioma | A2 | B1 | Total de roteiros | Questões A2 | Questões B1 | Total de questões |
|---|---:|---:|---:|---:|---:|---:|
| Inglês | 8 | 8 | 16 | 16 | 24 | 40 |
| Russo | 8 | 8 | 16 | 16 | 24 | 40 |
| **Total** | **16** | **16** | **32** | **32** | **48** | **80** |

- [Inglês](./learn-listening-v13-en.json): IDs `en-listen-v13-01` a `en-listen-v13-16`.
- [Russo](./learn-listening-v13-ru.json): IDs `ru-listen-v13-01` a `ru-listen-v13-16`.
- A2: 1 múltipla escolha sobre informação-chave + 1 resposta curta com evidência definida.
- B1: 2 múltiplas escolhas (ideia/decisão + detalhe/resultado) e 1 resposta curta que exige relação de informações do áudio.
- As perguntas são em **português**, para avaliar compreensão auditiva do idioma-alvo sem exigir produção escrita naquele idioma. Isso **não mede a capacidade de escrever ou falar Inglês/Russo**.
- As `acceptedExamplesPt` são *exemplos*, nunca lista exaustiva. Respostas abertas semanticamente corretas fora da lista ficam como `uncertain` ou recebem avaliação humana; nunca erro automático por divergência literal.

## 3. Vinculação à trilha V12

Cada unidade informa `stageNodeId` dentro do intervalo **A2: 05–10; B1: 11–15**, sempre no idioma correto. O campo indica **alinhamento curricular provisório**, não um requisito de avanço, não cria progresso por si e não autoriza alteração na V12.

## 4. Fluxo de implementação e produção de áudio (etapa futura do Codex + avaliadores)

1. **Homologação linguística independente** de cada transcrição e alternativa. Verificar gramática, naturalidade, ambiguidade, vocabulário e adequação aproximada ao nível; no Russo, conferir acentuação lexical, numerais e flexões em voz.
2. **Produção do áudio**, com direito/licença para hospedagem e uso. Duração/velocidade somente depois da gravação; não fabricar áudio ou estimar que o texto escrito já comprova compreensão.
3. **Revisão auditiva humana** em dispositivos comuns, com inteligibilidade, vozes distintas e prosódia natural (não exagerar artificialmente a lentidão). A2: ritmo lento e claro; B1: ritmo moderado, linguagem padrão clara. Se usar TTS, aprovar **a gravação efetivamente gerada**, não a API ou tecnologia em abstrato.
4. **Piloto com estudantes**: áudio ocultando a transcrição e o gabarito durante a aplicação, perguntas apresentadas após uma primeira audição; oferecer no máximo duas reproduções no modo avaliativo do piloto, sem corte de acessibilidade; feedback posteriormente. Esses parâmetros são hipóteses de teste, ajustáveis conforme dados.
5. **Análise de itens**: conferir opção única, distratores plausíveis mas falsos, compreensão de ideia geral/detalhe, relação entre escuta e acerto, dificuldade observada, dúvidas recorrentes, acessibilidade e atenção a números/horários.
6. **Integração gradual somente com autorização**: importar exclusivamente unidades validadas, preservar IDs e `public: false` dos itens não aprovados, sem migração destrutiva de progresso. Não oferecer conteúdo só com texto como se fosse Listening.
7. **Liberação independente da trilha V12**: as rotas de prévia e `publicRelease` existentes não devem mudar por causa desta entrega.

### Critérios de aceitação antes de publicação

- [ ] Falas conferidas por pessoa com proficiência comprovada no idioma e familiaridade pedagógica.
- [ ] Áudio reproduzível e licenciado, revisado de ponta a ponta, sem truncamento ou alteração de sentidos.
- [ ] Questões testadas sem acesso à transcrição; gabarito e alternativas independentes conferidos.
- [ ] Respostas abertas com rubrica semântica e `uncertain` para variantes não reconhecidas.
- [ ] Evidência de adequação A2/B1 em piloto e revisão independente.
- [ ] Revisão em diferentes aparelhos e condições de acessibilidade.
- [ ] Nenhum item liberado automaticamente por integrar arquivos editoriais no GitHub.

## 5. Limites e continuidade

- O pacote é **conteúdo novo proposto**: 32 unidades, não 32 exercícios ativos nem 32 gravações.
- Não há equivalência entre este pacote e uma prova certificada CEFR; a avaliação ainda cobre uma amostra limitada da competência oral.
- Os itens legados e pontes V11 continuam fora do escopo.
- Depois da homologação dos roteiros, o Codex pode desenvolver a experiência de reprodução/avaliação sem expor transcrições durante a escuta e sem alterar o progresso histórico.

## Revisão interna V18 e fluxo de liberação sem equipe externa

**Escopo revisado em 12/11/2026:** 32 roteiros / 80 questões. A revisão feita neste projeto por ChatGPT é **editorial interna**; não houve parecer linguístico independente, validação com turma, certificação CEFR nem revisão de gravação inexistente.

**Equipe real:** ChatGPT prepara e revisa editorialmente, Codex implementa e testa, e o dono do site decide o aceite e a publicação. Não existe obrigação de contratar especialistas externos para oferecer **prática pessoal não certificadora**; revisão externa só seria necessária se o projeto quisesse alegar validação independente ou classificação formal de proficiência.

O roteiro continua sem áudio. O dono precisa ouvir cada gravação gerada, conferir o texto falado, registrar origem/licença, testar inteligibilidade, repetição e nível antes de autorizar a atividade.

**Controle de publicação:** não alterar `publicRelease:false` nem expor materiais de draft só porque a revisão textual foi concluída. O aceite explícito do dono, testes de integração, revisão dos áudios aplicáveis e verificações de produção continuam pendentes. Status: **revisão interna concluída; liberação ainda não autorizada**.
