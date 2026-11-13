# 2T Learn V13 — homologação técnica

Data: 2026-11-13. Branch de trabalho baseada na `main` atual (`ed2ba57`).

## Resultado

V13 permanece desativada para estudantes. Os 32 áudios estão em `awaiting_owner_review`; nenhum resultado desta auditoria promoveu uma gravação, habilitou avaliação ou alterou dados de usuários.

| Item | Resultado | Pendências |
|---|---|---|
| 32 roteiros | 16 EN e 16 RU; 8 A2 e 8 B1 por idioma; IDs preservados | Revisão linguística externa e cotejo auditivo |
| 32 áudios | MP3 presentes, hash/tamanho conferidos, FFprobe/FFmpeg aprovados; 17 diálogos regenerados com montagem corrigida | Escuta e aceite do proprietário; pronúncia/naturalidade não certificadas |
| 80 questões | 48 escolha única e 32 abertas; 40 por idioma; chaves/evidências estruturalmente válidas | Revisão pedagógica independente e piloto |
| Pronúncia/naturalidade | Não avaliadas por ferramenta confiável nesta execução | Escuta humana por falante/revisor qualificado |
| V12/V16/V17 | Regressões integradas aprovadas na suíte Learn atualizada | Nenhuma pendência técnica encontrada nesta regressão |
| Testes automatizados | Typecheck, build, validadores Learn/V13, Node e Playwright completos aprovados (resultados detalhados abaixo) | Nenhuma falha de código conhecida |
| Segurança do build público | Sem MP3 V13 ou trechos exclusivos no `dist`; endpoint de prévia dá 404 em produção; rota com flag bloqueada | Revalidar após merge/deploy |
| Homologação pedagógica | Revisão preliminar de mesa: perguntas, alternativas, gabaritos e evidências conferem com os roteiros; nenhum desacordo concreto identificado | Revisão linguística externa e teste com estudantes |
| Liberação para estudantes | **Bloqueada** | Exige aceite auditivo, revisão linguística/pedagógica, piloto e autorização explícita |

## Correção da pipeline de áudio

`pipeline.mjs` intercalava os WAVs com pausas, mas usava o índice errado para as falas depois da primeira. Isso podia inserir silêncio no lugar de falas dos diálogos. `audioConcatLabels` agora mapeia segmentos e pausas para as entradas FFmpeg corretas; testes cobrem de uma a quatro falas.

Foram preservados os MP3s V1 originais. Em uma cópia privada isolada, 17 roteiros com múltiplos segmentos foram gerados como V2 usando os mesmos textos, vozes/modelos declarados e o mapeamento corrigido; os outros 15, de fala única, permaneceram V1. A validação V19 aprovou 17/17 versões novas. O relatório individual de 32 ativos está em [learn-v13-audio-audit.md](learn-v13-audio-audit.md). Nenhum MP3, modelo ou WAV foi versionado.

Os checks técnicos demonstram integridade do arquivo, formato, decodificação, níveis de sinal, duração plausível e vínculo do registro/roteiro no manifesto. Não comprovam o que foi efetivamente pronunciado. Os metadados `en-US`/`ru-RU` indicam apenas locale declarado do modelo. Não houve ASR ou avaliador de pronúncia/naturalidade confiável.

## Revisão das questões

Foi feita leitura preliminar das 32 unidades e das 80 questões contra os roteiros e evidências. As 48 questões fechadas têm uma opção válida no contrato e evidência associada; as 32 abertas continuam configuradas como `human_or_uncertain_no_strict_string_match`. Nenhuma divergência factual ou chave incompatível foi confirmada. Essa revisão não equivale a certificação de nível A2/B1, revisão por linguista nativo ou teste com estudantes.

## Segurança e integração

- O preview V13 exige o parâmetro de opt-in **e** hostname loopback; o servidor de conteúdo é autenticado, vinculado a `127.0.0.1` e não serve conteúdo sem sessão.
- A resposta da prévia remove gabaritos/model answers e mantém `publicRelease=false`, `assessmentEnabled=false`, `audioAssessmentEnabled=false`; a tela não grava no IndexedDB nem gera notas.
- O domínio oficial foi aberto em navegador real com `?learn-preview=listening-v13`: HTTP 200 para a aplicação, mensagem “Página do Learn não encontrada”, sem elemento V13 ou player. `/learn/v13/preview.json?language=en` retornou HTTP 404.
- `bundle.js`, `learn.js` e `styles.css` públicos retornaram HTTP 200. Nenhum continha os trechos privados pesquisados; o build local não contém MP3 V13.
- Compatibilidade com o Learn legado, V12 e V17 foi verificada na suíte Playwright completa. O fluxo V13 não escreve histórico nem compartilha progresso entre idiomas.

## Execuções

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado.
- 13 validadores existentes do Learn e validadores V16/V17: aprovados; validador estrutural V13 aprovado (32 roteiros/80 questões).
- `npm run learn:validate-listening-v13`: 13 testes Node aprovados, sem skips, com a cópia privada disponível.
- Validador técnico dos 17 novos MP3s: 17 aprovados, 0 falhas. Auditoria FFprobe/FFmpeg dos 32: 32 decodificáveis e íntegros, 0 falhas, 0 anomalias extremas de duração; sem validação auditiva.
- Playwright Learn: **192/192** aprovado em 27 arquivos; inclui V12/V16/V17, Learn legado, segurança da rota, layout em 320/390/768/1366/1920 px nos temas claro/escuro, MP3 privado regenerado e resposta de áudio lenta.
- Suíte Playwright global do site (502 casos) não foi concluída: foi interrompida após dois timeouts em Proventos, fora deste escopo; por isso, não é declarada aprovada. Nenhum módulo externo foi alterado.
- `git diff --check`: aprovado após a revisão final do diff.

## Pendências para aprovação/liberação

1. Escutar os 32 áudios (incluindo os 17 regenerados) e aprovar idioma, correspondência fala/roteiro, cortes, volume, pronúncia, ritmo e naturalidade.
2. Confirmar licenças/atribuição dos modelos e gravações, em especial TeraTTSv2, antes de qualquer uso público.
3. Obter revisão linguística externa das 80 questões e testar com estudantes representativos de A2/B1.
4. Só então revisar os estados de evidência/avaliação e considerar ativação, mediante autorização explícita.

## Produção e publicação

O Vercel connector não lista o projeto `matheus2t` nem seus deployments (404; lista vazia), portanto não foi possível confirmar pelo painel qual deployment/commit está ativo. O domínio oficial foi verificado diretamente. O deployment acionado pela integração à `main` deve ser confirmado pelo status Vercel do commit e por nova verificação HTTP do domínio, sem liberar a V13.
