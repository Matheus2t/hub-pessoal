# 2T Learn V14 — implementação e homologação técnica

**Status:** implementada para prévia local; não liberada a estudantes.

**Escopo:** ditados A2/B1 de Inglês e Russo, integrados ao Learn existente.
**Avaliação:** desabilitada enquanto os áudios aguardam revisão auditiva do responsável.

## Entrega

- 32 itens editoriais preservados: 8 A2 e 8 B1 por idioma. IDs, transcrições, variantes autorizadas, critérios editoriais e vínculos V12 permanecem nas fontes versionadas do piloto.
- Página Lit responsiva para selecionar idioma/nível/ditado, reproduzir e repetir a gravação, ajustar velocidade conforme o player existente, transcrever no idioma-alvo, enviar e consultar tentativas anteriores. O atributo `lang` identifica inglês ou russo e o campo aceita cirílico.
- O gabarito não integra o bundle; o catálogo local remove respostas e campos de professor. A transcrição só é devolvida após envio. Enquanto a revisão auditiva não estiver aprovada, nenhuma tentativa é marcada correta ou errada: o resultado é `uncertain`.
- Evidências e rascunhos ficam no store `lessonProgress` do IndexedDB v3, em registros `v14:en` e `v14:ru`. IDs de tentativa são idempotentes; reuso conflitante é rejeitado. A extensão do backup v3 valida o conteúdo e v1/v2 continuam importáveis.
- A rota só renderiza em `localhost`, `127.0.0.1` ou `::1` com `?learn-preview=dictation-v14`. O serviço de prévia verifica host e cliente loopback, exige sessão local autenticada, valida origem/content-type e limita o corpo. Nenhuma chave de resposta, transcrição, áudio privado ou JSON editorial é publicado no `dist`.

## Auditoria técnica dos 32 áudios

Os 32 MP3s encontrados no inventário privado V19 têm IDs e idioma correspondentes aos itens editoriais, source/blob pins compatíveis e SHA-256 igual ao manifesto. São 32 arquivos distintos; a verificação técnica registrou existência, formato MP3, tamanho, duração, decodificação, ausência de silêncio total, pico, silêncio prolongado e hash. Todos estão em `awaiting_owner_review`; a aprovação de pronúncia, inteligibilidade e naturalidade não foi realizada.

| ID | Duração | Bytes | ID | Duração | Bytes |
|---|---:|---:|---|---:|---:|
| `en-dict-v14-01` | 2.247 s | 27,003 | `ru-dict-v14-01` | 3.448 s | 41,423 |
| `en-dict-v14-02` | 2.821 s | 33,900 | `ru-dict-v14-02` | 2.691 s | 32,332 |
| `en-dict-v14-03` | 2.743 s | 32,959 | `ru-dict-v14-03` | 2.900 s | 34,840 |
| `en-dict-v14-04` | 2.638 s | 31,705 | `ru-dict-v14-04` | 2.586 s | 31,078 |
| `en-dict-v14-05` | 2.534 s | 30,452 | `ru-dict-v14-05` | 2.874 s | 34,527 |
| `en-dict-v14-06` | 2.952 s | 35,467 | `ru-dict-v14-06` | 3.213 s | 38,602 |
| `en-dict-v14-07` | 2.769 s | 33,273 | `ru-dict-v14-07` | 2.743 s | 32,959 |
| `en-dict-v14-08` | 2.691 s | 32,332 | `ru-dict-v14-08` | 3.109 s | 37,348 |
| `en-dict-v14-09` | 4.101 s | 49,260 | `ru-dict-v14-09` | 4.310 s | 51,767 |
| `en-dict-v14-10` | 3.683 s | 44,244 | `ru-dict-v14-10` | 4.728 s | 56,783 |
| `en-dict-v14-11` | 4.336 s | 52,081 | `ru-dict-v14-11` | 4.154 s | 49,887 |
| `en-dict-v14-12` | 3.788 s | 45,498 | `ru-dict-v14-12` | 4.023 s | 48,319 |
| `en-dict-v14-13` | 3.474 s | 41,736 | `ru-dict-v14-13` | 4.232 s | 50,827 |
| `en-dict-v14-14` | 4.336 s | 52,081 | `ru-dict-v14-14` | 3.788 s | 45,498 |
| `en-dict-v14-15` | 4.127 s | 49,573 | `ru-dict-v14-15` | 4.493 s | 53,962 |
| `en-dict-v14-16` | 6.531 s | 78,412 | `ru-dict-v14-16` | 4.415 s | 53,021 |

Measured aggregate ranges: 2.247–6.531 s; mean level −25.5 to −18.4 dB; peak −3.1 to −2.2 dB; zero files with detected long silence. These are automated file/signal checks only. They do **not** establish correct language, pronunciation, speech intelligibility, pacing, naturalness, script fidelity by listening, or suitability for A2/B1. The browser playback test uses a generated tone fixture, not a human listening panel. Private MP3s and audit artifacts remain outside Git and `dist`.

## Avaliação e evidências

- A normalização é limitada a Unicode NFC, caixa, espaços e pontuação terminal segura. Só variantes editoriais completas explicitamente autorizadas podem ser reconhecidas quando o item e o áudio forem aprovados.
- Não há equivalência genérica `ё/е`, conversão de números por extenso, similaridade aproximada, tradução nem paráfrase. Respostas desconhecidas permanecem incertas; uma diferença literal não vira erro definitivo.
- Até a aprovação de áudio, o player pode registrar prática local, mas a V14 não apresenta avaliação de competência. O envio exige gravação disponível e reprodução efetiva concluída, ao menos 0.5 s audíveis e cobertura mínima de 85% do tempo; pausa, silêncio e saltos não contam como audição.
- Mudança de idioma usa registros independentes. Falhas de IndexedDB são apresentadas ao usuário; não há fallback que descarte ou sobrescreva evidências anteriores.

## Validações executadas

| Verificação | Resultado |
|---|---|
| `npm run build` (inclui `tsc --noEmit`, esbuild e Sass) | Aprovado |
| Validadores gerais do Learn: catálogo, pedagogia, diagnóstico, qualidade, cobertura, leitura, curadoria, rubricas, revisões, readiness, áudio, determinismo e progressão | 13 comandos aprovados; 474 exercícios e 30 etapas V12 preservados |
| `npm run learn:validate-dictation-v14` | 32 itens balanceados; 10/10 testes Node, incluindo serviço local autenticado |
| `npm run learn:validate-listening-v13` | 12 aprovados; 1 teste condicionado a inventário privado V13 foi skip |
| Regressão Playwright V11/V12/V13/V16/V17/V19/V14 | 50 aprovados; 1 skip condicionado à ausência do inventário privado de áudio V13 no fixture de testes |
| `node scripts/learn/validate-dictation-v14.mjs --check-dist` | Aprovado: sem MP3s, fontes JSON editoriais, transcrições canônicas ou variantes no bundle |
| Bloqueio público | O teste de host oficial com query de prévia confirma que o componente V14 não é criado |

O fixture Playwright da V12 foi alinhado ao `BASE_URL` do Playwright (antes fixava `:3000`, enquanto o runner usava `:8123` e causava timeouts sem servidor). Isso altera somente o endereço de mock nos testes, não o código do produto.

## Pendências para qualquer ativação futura

1. Escutar e aprovar individualmente as 32 gravações, incluindo idioma, correspondência ao roteiro, inteligibilidade, pronúncia, ritmo, cortes e nível adequado; registrar a decisão e sua proveniência.
2. Fazer revisão linguística independente dos 32 roteiros, variantes e respectivos itens A2/B1; executar piloto com estudantes e corrigir somente com evidência editorial.
3. Só então decidir, separadamente, se e como ativar avaliação por item. Respostas sem confiança suficiente devem continuar `uncertain` e a experiência permanece desabilitada até autorização de publicação.
4. Repetir a validação de segurança do bundle e do deployment exato antes de liberar conteúdo a estudantes.

Esta implementação não certifica CEFR, compreensão oral ou proficiência, não foi homologada externamente e não libera os pilotos V11–V19. A V14 continua somente para prévia local.
