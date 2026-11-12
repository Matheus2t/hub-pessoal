# 2T Learn V19 — áudios: geração e revisão local

## Estado desta entrega

Esta etapa prepara um pipeline local e uma interface privada para gerar e revisar áudio. **Não há gravações produzidas ou aprovadas.** Nenhum conteúdo V19 foi publicado, e a ativação pública e a avaliação continuam desabilitadas.

| Inventário planejado | Quantidade |
| --- | ---: |
| Total | 68 |
| Inglês / Russo | 34 / 34 |
| Ponte V11 | 4 |
| Listening V13 | 32 |
| Ditados V14 | 32 |

Estado do manifesto privado: 68 planejados, 0 gerados, 0 aprovados tecnicamente, 0 aguardando revisão, 0 aprovados pelo proprietário e 0 rejeitados. O pipeline consegue atribuir vozes licenciadas verificadas a 57 itens se os respectivos pesos estiverem disponíveis. Onze itens de diálogo em russo ficam bloqueados porque não há uma segunda voz russa verificada para distinguir falantes; não se reutiliza uma única voz como se fossem participantes diferentes.

## Implementado

- `scripts/learn-audio-v19/pipeline.mjs` fixa as revisões das fontes editoriais e valida o Git blob SHA antes de montar o inventário. Os materiais-fonte e o manifesto de trabalho ficam sob `private/learn-audio-v19/`, ignorado pelo Git.
- O fluxo mantém histórico de versão e estados `planned`, `generated`, `technical_passed`, `awaiting_owner_review`, `approved` e `rejected`. Retentativas são permitidas para itens rejeitados sem apagar versões anteriores; atualizar roteiros é recusado quando já há evidência de geração ou revisão.
- A geração usa Piper e FFmpeg localmente, com saída MP3 mono a 22,05 kHz/96 kbps, pausas de diálogo e normalização. A validação mede decodificação, formato, duração, volume, pico, clipping, silêncios longos e hash. Essas medições técnicas **não** verificam pronúncia, fidelidade linguística ou qualidade pedagógica.
- `scripts/learn-audio-v19/reviewer.mjs` oferece revisão somente em loopback, com token aleatório de sessão, proteção de origem/CSRF, CSP, sem cache e sem recursos externos. Aprovar requer reprodução integral e confirmação explícita; rejeitar requer nota. A aprovação local nunca muda `publicRelease` nem habilita avaliação.
- `frontend/tests/learn-audio-v19-reviewer.spec.ts` cobre proteção local, gate de reprodução, fluxo sem arquivo de áudio e dimensões responsivas nos temas claro e escuro.
- `.gitignore` exclui os materiais, modelos, gravações, manifesto e ambiente virtual locais. Nenhum arquivo de áudio V19 foi encontrado em `dist/`.

## Fontes, vozes e licenciamento

O inventário usa as versões editoriais exatas dos PRs #116, #118 e #119; a auditoria editorial integrada do PR #123 serviu como referência. Os textos-fonte permanecem locais e não são incluídos neste commit. O manifesto registra origem e versão para auditoria.

| Fonte | Commit | Git blob SHA |
| --- | --- | --- |
| V11, atividades-ponte | `b0fa03876cb072c75f417b0f6bae504e1be896a1` | `e3295b09493fb0547d7eedc6133693d4eadc9519` |
| V13, listening EN | `716c1112c2f9b7dedaa99470bf3bf4b1c34d5560` | `cbbb3b4c5251c0e9fad5e42838f12e46d89b3057` |
| V13, listening RU | `716c1112c2f9b7dedaa99470bf3bf4b1c34d5560` | `ef6e28198a3bb0fd946f25a396150beb1b0fff7e` |
| V14, ditados EN | `77247cd660af3f3c002cf47d58dfe099a76c0161` | `4b9d20a94493200d6cba82515ff8f147a8834be0` |
| V14, ditados RU | `77247cd660af3f3c002cf47d58dfe099a76c0161` | `6fb3fe502c8315c753535f3432dfa10f354dc654` |
| Auditoria editorial V18 | `d8afcb10143dacd8b7fb98a5d3c88e45f0c66d4d` | — |

O runtime Piper foi instalado apenas no ambiente virtual ignorado da etapa. A lista oficial identifica modelos Joe, Mike e Denis como CC0 na cadeia rdh e Kristin como domínio público/treinada do zero. A licença do runtime Piper é GPL-3.0-or-later e a licença do runtime não concede direitos sobre os pesos dos modelos. A distribuição dos áudios derivados também não é presumida; requer análise de direitos separada antes de qualquer publicação. Consulte a [lista oficial de uso comercial](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/COMMERCIAL_USE.md) e as [notas de licenciamento do Piper](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/LICENSING.md).

## Bloqueio de geração e revisão

A instalação do Piper ocorreu sem custo (R$ 0) e sem chaves, conta ou serviço pago. O ambiente não conseguiu resolver o host público para baixar pesos (`ENOTFOUND`). Assim, nenhum áudio real foi criado, reproduzido ou validado. Também não houve aprovação do proprietário. Não considerar os testes com manifestos sintéticos como evidência de áudio real.

Quando a rede e os pesos estiverem disponíveis, a sequência local é:

```powershell
node scripts/learn-audio-v19/pipeline.mjs prepare
node scripts/learn-audio-v19/pipeline.mjs download-models
node scripts/learn-audio-v19/pipeline.mjs generate
node scripts/learn-audio-v19/pipeline.mjs validate
node scripts/learn-audio-v19/pipeline.mjs queue-review
node scripts/learn-audio-v19/reviewer.mjs
```

O proprietário deve escutar integralmente cada arquivo, conferir pronúncia, idioma, ritmo e correspondência com o roteiro, registrar notas e aprovar/rejeitar na revisão local. Só itens tecnicamente aprovados e ouvidos podem avançar. Não copiar arquivos para assets públicos nem ativar conteúdo sem uma decisão explícita posterior e verificação dos direitos de redistribuição.

## Validação executada

- `node --check` nos dois scripts: aprovado.
- Testes unitários Node do pipeline: 6/6 aprovados.
- Typecheck e build de produção: aprovados.
- Os 13 validadores Learn disponíveis (auditoria, pedagogia, diagnóstico, qualidade, cobertura, leitura, curadoria, rubricas, revisões espaçadas, readiness, áudio, catálogos e progressão): aprovados. O catálogo público ainda registra 124 entradas de áudio; não há gravações validadas e a avaliação permanece desativada.
- Playwright específico do revisor: 2/2 aprovados, incluindo checagens responsivas em 1920, 1366, 768, 390 e 320 px e temas claro/escuro. Os testes usam inventário sintético, não áudio produzido.
- Regressão Playwright completa: 363 aprovados, 31 ignorados e 61 falhos em 455 testes. Os diretórios de contexto de falha disponíveis apontam para áreas fora do Learn; nenhum contexto de falha Learn foi encontrado. A regressão global, portanto, não está totalmente verde e as falhas externas não foram corrigidas nesta entrega.
- Pytest: bloqueado pelo ambiente após sete testes iniciados; o processo terminou pelo limite local de 120 s sem diagnóstico detalhado. O plugin `pytest-timeout` não está instalado. Não é contabilizado como aprovado.
- `git diff --check`: executar novamente antes do commit.

## Limites e próxima ação

O custo observado foi R$ 0. A geração continua bloqueada até os pesos serem baixados. Os onze diálogos russos precisam de uma segunda voz com licença verificada ou de uma decisão editorial que preserve distinção semântica entre falantes; não degradar silenciosamente para uma voz única. Ainda faltam revisão auditiva humana de todos os áudios e decisão de redistribuição. Conteúdo, dados de avaliação e ativação pública permanecem inalterados e desabilitados.
