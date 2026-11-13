# 2T Learn V13 — integração técnica

## Escopo e origem

- Roteiros/questões importados do PR editorial #118, commit `716c1112c2f9b7dedaa99470bf3bf4b1c34d5560`.
- Revisão interna V18 conferida no PR #123: a correção `ru-listen-v13-16` esclarece que a feira opera de terça a sexta e estende somente a sexta. A revisão não homologou áudio nem liberou publicação.
- O pacote preserva IDs, as 32 transcrições e as 80 questões. `publicRelease:false`, `cefrCertified:false` e a revisão pendente continuam obrigatórios.
- Os 474 exercícios legados, a V11, o IndexedDB e os backups não são migrados nem modificados.

## Experiência e segurança

- Rota local: `#/learn/{en|ru}/listening-v13`; exige `?learn-preview=listening-v13` e hostname loopback.
- A rota e o componente não carregam currículo nem abrem IndexedDB. Respostas e ajudas ficam somente em memória e são apagadas ao trocar de exercício ou sair.
- O servidor `scripts/learn/listening-v13-preview.mjs` serve conteúdo editorial fora de `dist`, vincula somente em `127.0.0.1`, exige token inicial e cookie `HttpOnly; SameSite=Strict`, rejeita origem cruzada e usa `no-store`.
- A resposta entregue ao navegador exclui gabaritos, evidências, respostas modelo e exemplos aceitos. O servidor local serve somente o idioma solicitado.
- Roteiro exibido é uma ajuda explícita; a interface marca que isso não constitui evidência independente. Questões objetivas ficam `notAssessed`; respostas abertas ficam `uncertain` e aguardam revisão humana. Nenhuma pontuação ou conclusão é gravada.
- A rota em domínio público permanece bloqueada mesmo com o parâmetro de prévia. O build não copia JSON V13, MP3 privados ou manifesto V19 para `dist`.

## Áudios V19

O servidor pode localizar gravações técnicas em `private/learn-audio-v19` ou no diretório indicado por `LEARN_AUDIO_V19_DIR`. Ele só associa arquivos se o manifesto continuar com `publicRelease:false` e `assessmentEnabled:false`, e se o registro tiver o mesmo ID, idioma, tipo Listening, origem V13, estado `awaiting_owner_review`, verificação técnica aprovada, arquivo privado existente e transcrição normalizada idêntica ao roteiro.

Gravações encontradas são reproduzidas pelo `learn-recording-player` existente. São rotuladas como técnicas e pendentes de homologação do proprietário. O player não habilita avaliação; conclusão de reprodução técnica não é evidência validada de Listening. Sem arquivo compatível, a prática informa a indisponibilidade e não apresenta o roteiro como áudio aplicado.

Para abrir a prévia, execute na raiz:

```powershell
$env:LEARN_AUDIO_V19_DIR = 'C:\caminho\privado\learn-audio-v19' # opcional; omita se estiver neste worktree
npm run preview-listening-v13
```

Abra exclusivamente o endereço local com token impresso no terminal. Não compartilhe esse endereço. Encerre com `Ctrl+C`. O comando gera o build normal e então inicia o servidor local autenticado. O conteúdo editorial não é inserido no build.

## Validação e limites

- `npm run learn:validate-listening-v13` verifica a estrutura editorial/V18, sanitização de respostas, vínculo seguro ao V19 e autenticação local.
- Playwright cobre navegação A2/B1, reprodução de áudio de fixture técnica, transcrição opt-in, estados `notAssessed`/`uncertain`, ausência de escrita no IndexedDB, bloqueio sem a flag e no hostname oficial simulado mesmo com ela, temas e larguras 320/390/768/1366/1920.
- Fixtures de áudio nos testes verificam somente controles do player; não são fala nem homologação. A pasta privada V19 é opcional no CI.
- Na captura local atual, 32 registros V19 coincidem por ID, idioma, tipo, transcrição e estado técnico, mas os 32 aguardam a escuta/aprovação do proprietário. Nenhum é elegível para avaliação.
- Não foi feita homologação auditiva humana, validação linguística externa ou teste com estudantes. A2/B1 descreve somente o alvo curricular provisório; não é certificação CEFR.

## Ativação futura

Esta entrega não ativa Listening publicamente. Antes de abrir a experiência, é necessário o aceite editorial do proprietário, homologação de cada áudio e licença apropriada, revisão independente das questões sem transcrição, calibração com estudantes e autorização explícita de release. A avaliação objetiva deve permanecer desligada até que gravações homologadas e a política de avaliação sejam aprovadas; respostas abertas seguem `uncertain` sem revisão confiável.
