# 2T Learn — homologação integrada final (13/11/2026)

**Estado da execução:** **APROVADA TECNICAMENTE** sobre o commit de validação `9adc6bb1cd1a4cebf7fd7db46b50194d34828805` do [PR #151](https://github.com/Matheus2t/hub-pessoal/pull/151), com **4/4 checks concluídos em sucesso** (três jobs integrados e frontend). A homologação não valida o SHA do deployment no domínio.

**Baseline de partida:** `main` `cbb740e5c48038f19f72593bcfd639efe69c8876` (V18 integrada pelo PR #150).  
**Escopo:** somente a área Learn e a respectiva esteira de verificação. Os módulos Ações, Renda Fixa, Games, Times e Call não fazem parte desta homologação.

**Escopos distintos:** finalização **técnica do repositório e dos builds testados** ≠ verificação do SHA efetivamente em produção ≠ aprovação por uso real ≠ certificação CEFR ≠ homologação auditiva.

## 1. Inventário sob teste

| Frente | Baseline já integrada | Comportamento exigido |
| --- | --- | --- |
| Legado EN/RU | **474 exercícios** (237 por idioma), IDs históricos preservados | Correção determinística, resposta aberta não reconhecida `uncertain`, histórico isolado e não destrutivo |
| V11 | **24 atividades-ponte**, 20 práticas não auditivas públicas e 4 auditivas bloqueadas | Prática sem nota, sem criar evidências de proficiência por consulta de exemplos |
| V12 | **30 etapas** A1–B1 (15 por idioma) | Prévia local; nenhum certificado CEFR ou domínio global derivado de acertos |
| V13 | **32 roteiros/80 perguntas** de Listening | Prévia local autenticada e sem nota auditiva pública |
| V14 | **32 ditados** A2/B1 | Servidor local privado, transcrição oculta, estado incerto, progresso/rascunho preservados |
| V15 | Player de áudio e síntese do navegador | TTS somente didático, não evidência independente de compreensão auditiva |
| V16 | **10 leituras B1, 40 perguntas e 10 transferências** | Prévia local; nenhum conteúdo editorial embutido no bundle público |
| V17 | **30 cenários, 6 checkpoints e 16 casos sintéticos** | Revisão local, histórico/backup e recomendações formativas; sem autenticação institucional ou certificação |
| V18 | Manifesto/revisão editorial atualizados | Registrar a decisão do proprietário de avaliar pessoalmente, sem falsificar avaliações realizadas |
| V19 | **68 gravações privadas**, geração/integridade técnica verificada | Zero MP3 públicos; sem alegar aprovação humana de escuta ou habilitar avaliação |
| V20–V22 | Usabilidade, foco de teclado, mobile, idioma de resposta e layout | Sem regressão visual, overflow horizontal ou corrupção de dados |

## 2. Plano único de validação executável

O workflow versionado [`.github/workflows/learn-final-integrated.yml`](../.github/workflows/learn-final-integrated.yml) reúne **três jobs independentes**:

1. **Conteúdo e dados** — TypeScript, geração determinística, inventário dos 474 IDs, auditoria de escrita, 11 contratos originais de pedagogia/diagnósticos/áudio e validadores V12/V13/V14/V16/V17/currículo A1–B1.
2. **Integração local no navegador** — build local, contratos Node de áudio/servidores privados, regressão completa Playwright de Learn com EN/RU, mobile, IndexedDB/backup v1–v3, prévias, campos cirílicos, V11 e casos de falha. O [teste novo V23](../frontend/tests/learn-final-integration-v23.spec.ts) exercita respostas reais de escrita EN+RU, exportação de backup v3, restauração atômica com descarte da tentativa extra e isolamento após recarga. Confere também que consultar exemplos V11 não gera nota ou tentativa avaliada.
3. **Isolamento público** — build exatamente em modo `VERCEL=1`, análise do conteúdo estático, inspeção dos 474 exercícios públicos e zero MP3s, e [teste V23](../frontend/tests/learn-final-public-v23.spec.ts) em **hostname oficial simulado**, que demonstra V11 disponível e V12/V13/V14/V16/V17/V19 inacessíveis mesmo com parâmetros forjados. O teste não consulta nem prova o deploy remoto.

A execução do CI não utiliza ou distribui o inventário privado de 68 MP3s. Testes que exigem arquivos reais indisponíveis no GitHub Actions são distinguidos como **skipped**; testes por fixture avaliam somente o contrato do player, não a naturalidade da voz.

## 3. Resultado observado do PR

| Verificação | Resultado |
| --- | --- |
| `learn-content-and-data` | **Aprovado** — 474 IDs, geração determinística, 11 contratos originais e validadores V12/V13/V14/V16/V17/A1–B1 |
| `learn-local-end-to-end` | **Aprovado** — 220 testes Playwright em Chromium; 1 teste de MP3 privado V13 ignorado por indisponibilidade de inventário neste CI |
| `learn-public-release-gates` | **Aprovado** — 3/3 testes de acesso público em navegador; 474 exercícios presentes, zero gravações distribuídas, V16/V17 ausentes no bundle |
| Compilação `frontend` | **Aprovada** — quarto check verde |
| Testes integrados novos de backup EN/RU e prática V11 | **Aprovados** dentro dos 220 Playwright; exportação, restauração atômica, recarga e isolamento EN/RU confirmados |
| Node: áudio privado simulado/contratos de servidores | **25 aprovados, 1 ignorado** de 26; o teste ignorado exige inventário MP3 V19 não disponibilizado ao runner |
| Responsividade e navegação | **Aprovadas nos viewports simulados** usados pela regressão (320, 390, 768, 1366 e 1920 px); não testadas em celulares físicos |
| Merge da homologação na `main` | **Conferir o PR #151** — a validação de código está aprovada neste commit; o merge não altera as conclusões técnicas |

**Resultado final:** **homologação técnica integrada aprovada em GitHub Actions** para a baseline de código descrita acima. Evidências: logs dos jobs `learn-content-and-data`, `learn-local-end-to-end` e `learn-public-release-gates` no [PR #151](https://github.com/Matheus2t/hub-pessoal/pull/151). Não houve erros funcionais bloqueantes; duas primeiras execuções falharam por problemas **da esteira de testes**, corrigidos antes da aprovação: (a) expectativa estrita de texto de rota bloqueada em vez de aceitar 404 da aplicação e (b) `fetch-depth` insuficiente para `git show f2ab5f8`. A execução final passou **sem ignorar esses cenários de segurança e integridade**.

**Itens intencionalmente fora da aprovação:** MP3 real não disponibilizado nos runners; avaliação humana de naturalidade; teste físico Android/iOS; identidade institucional de revisor; rastreamento da versão de deployment/alias no domínio `matheus2t.com.br`; liberação pública das prévias privadas. Esses itens **não são falhas ocultas**, mas limites explícitos da homologação.

## 4. Limites e operação após a homologação

**Decisão do proprietário (13/11/2026):** revisão pedagógica externa, piloto com terceiros e escuta humana prévia de todos os áudios foram **dispensados como exigência de processo para sua prática pessoal**. Não foram executados, portanto não são relatados como aprovados. O proprietário avaliará se gostou ou não durante o próprio uso.

**Não modificar automaticamente os gates**: prévias V12/V13/V14/V16/V17/V19, identidade local de revisor V17, política `notAssessed`/ `uncertain`, licença/revisão dos áudios e certificação CEFR. Para expor mídias ou avaliação a estudantes, será necessária uma mudança deliberada com avaliação dos riscos de distribuição e regressão correspondente.

**Vercel e domínio oficial:** os checks GitHub de saúde da produção atestam o que suas respectivas rotinas consultaram, **não** identificam necessariamente o SHA servido. A tentativa de consulta ao projeto `matheus2t` na equipe `matheus2ts-projects` e ao hostname pelo conector Vercel resultou em `not_found`/projetos inacessíveis. A ferramenta de navegação pública também não conseguiu abrir `https://matheus2t.com.br/` nesta sessão. Logo, **deploy específico em produção não foi homologado remotamente** e não será tratado como um bloqueio artificial da homologação técnica local. Não foi solicitado nem realizado deploy manual.

**Dependência de Codex:** **não foi necessária** para completar, corrigir a esteira e aprovar a homologação técnica do Learn; os testes e a documentação foram realizados diretamente pelo ChatGPT. **Possível ajuda futura do Codex:** se o proprietário exigir conferência do deployment exato com acesso Vercel do ambiente local — isso permanece não verificado por este canal. Nenhuma mudança de regras/rotas públicas foi autorizada ou executada por implicação.
