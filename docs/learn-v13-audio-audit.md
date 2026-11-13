# 2T Learn V13 — relatório técnico individual dos áudios

Arquivos examinados: 32; registros V13 no manifesto: 32. Manifesto privado: publicRelease=false, assessmentEnabled=false.
Os arquivos permanecem fora do repositório, do build e do relatório. A inspeção técnica não confirma idioma falado, pronúncia, prosódia, naturalidade nem aprovação pedagógica.

As 17 atividades com múltiplos segmentos foram regeneradas como V2 em diretório privado isolado, usando os mesmos roteiros e a montagem corrigida da pipeline. Os 15 áudios de segmento único permanecem V1. Os 32 V1 originais seguem preservados no manifesto original; todas as gravações continuam em `awaiting_owner_review`.

### Correção da montagem

O montador FFmpeg intercalava WAVs e pausas, mas reutilizava o índice `i` em vez de `2*i` para cada fala; em diálogos, isso substituía falas posteriores por entradas de silêncio. `audioConcatLabels` agora produz os índices corretos, com testes para 1–4 segmentos. As 17 V2 passaram pelo validador da pipeline (17/17); a aprovação auditiva continua pendente.

| ID | Idioma/nível | Arquivo | Bytes | Duração s | Palavras / palavras/s | WAVs auxiliares / segmentos | Vínculo da montagem | MP3 / Hz / canais | Média dB / pico dB | Silêncios ≥0,5s / máximo s | Hash/tamanho | Decodificação | Roteiro/locale declarados | Resultado técnico | Estado |
|---|---|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|
| en-listen-v13-01 | en/A2 | en-listen-v13-01__v1.mp3 | 138912 | 11.57 | 33 / 2.85 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -20.3 / -2.4 | 3 / 0.73 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-02 | en/A2 | en-listen-v13-02__v2.mp3 | 152391 | 12.70 | 36 / 2.84 | 11.79 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.5 / -2.4 | 3 / 0.76 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-03 | en/A2 | en-listen-v13-03__v2.mp3 | 159287 | 13.27 | 33 / 2.49 | 12.36 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.5 / -2.3 | 3 / 0.91 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-04 | en/A2 | en-listen-v13-04__v2.mp3 | 130762 | 10.89 | 34 / 3.12 | 9.98 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.6 / -2.4 | 2 / 0.89 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-05 | en/A2 | en-listen-v13-05__v1.mp3 | 173707 | 14.47 | 41 / 2.83 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -20.3 / -2.2 | 4 / 0.75 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-06 | en/A2 | en-listen-v13-06__v2.mp3 | 137031 | 11.42 | 34 / 2.98 | 10.51 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.1 / -2.4 | 2 / 0.78 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-07 | en/A2 | en-listen-v13-07__v2.mp3 | 126373 | 10.53 | 35 / 3.32 | 10.03 / 2/2 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.6 / -2.4 | 1 / 0.85 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-08 | en/A2 | en-listen-v13-08__v1.mp3 | 151764 | 12.64 | 37 / 2.93 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -20.3 / -2.4 | 4 / 0.83 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-09 | en/B1 | en-listen-v13-09__v1.mp3 | 264300 | 22.02 | 63 / 2.86 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.3 / -2.4 | 4 / 0.76 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-10 | en/B1 | en-listen-v13-10__v2.mp3 | 272763 | 22.73 | 69 / 3.04 | 21.40 / 4/4 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.8 / -2.4 | 4 / 0.82 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-11 | en/B1 | en-listen-v13-11__v1.mp3 | 285616 | 23.80 | 72 / 3.03 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -20.0 / -2.4 | 4 / 0.78 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-12 | en/B1 | en-listen-v13-12__v1.mp3 | 289064 | 24.08 | 73 / 3.03 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -20.1 / -2.4 | 4 / 0.74 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-13 | en/B1 | en-listen-v13-13__v1.mp3 | 269315 | 22.44 | 63 / 2.81 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -20.2 / -2.4 | 4 / 0.77 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-14 | en/B1 | en-listen-v13-14__v2.mp3 | 282167 | 23.51 | 69 / 2.93 | 21.76 / 5/5 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.3 / -2.4 | 4 / 0.88 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-15 | en/B1 | en-listen-v13-15__v2.mp3 | 272136 | 22.67 | 68 / 3.00 | 21.35 / 4/4 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.0 / -2.4 | 4 / 0.92 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| en-listen-v13-16 | en/B1 | en-listen-v13-16__v1.mp3 | 297527 | 24.79 | 76 / 3.07 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.8 / -2.4 | 4 / 0.78 | ok | ok | ok / en-US | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-01 | ru/A2 | ru-listen-v13-01__v1.mp3 | 164930 | 13.74 | 29 / 2.11 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.0 / -2.4 | 3 / 0.78 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-02 | ru/A2 | ru-listen-v13-02__v2.mp3 | 170886 | 14.24 | 28 / 1.97 | 13.34 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.8 / -2.4 | 1 / 0.60 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-03 | ru/A2 | ru-listen-v13-03__v2.mp3 | 134523 | 11.21 | 25 / 2.23 | 10.30 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.3 / -2.4 | 1 / 0.51 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-04 | ru/A2 | ru-listen-v13-04__v1.mp3 | 151451 | 12.62 | 26 / 2.06 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.4 / -2.4 | 4 / 0.77 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-05 | ru/A2 | ru-listen-v13-05__v2.mp3 | 160541 | 13.37 | 27 / 2.02 | 12.46 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -20.1 / -2.4 | 2 / 0.56 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-06 | ru/A2 | ru-listen-v13-06__v2.mp3 | 118223 | 9.85 | 19 / 1.93 | 8.93 / 3/3 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.5 / -2.5 | 0 / 0.00 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-07 | ru/A2 | ru-listen-v13-07__v2.mp3 | 137031 | 11.42 | 29 / 2.54 | 10.92 / 2/2 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.5 / -2.4 | 1 / 0.52 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-08 | ru/A2 | ru-listen-v13-08__v1.mp3 | 140793 | 11.73 | 30 / 2.56 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.2 / -2.4 | 3 / 0.77 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-09 | ru/B1 | ru-listen-v13-09__v1.mp3 | 283421 | 23.61 | 56 / 2.37 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.7 / -2.4 | 4 / 0.73 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-10 | ru/B1 | ru-listen-v13-10__v2.mp3 | 296587 | 24.71 | 55 / 2.23 | 23.39 / 4/4 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -19.0 / -2.4 | 3 / 0.64 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-11 | ru/B1 | ru-listen-v13-11__v1.mp3 | 274644 | 22.88 | 58 / 2.53 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.5 / -2.4 | 4 / 0.70 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-12 | ru/B1 | ru-listen-v13-12__v2.mp3 | 267748 | 22.31 | 48 / 2.15 | 20.99 / 4/4 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.5 / -2.3 | 1 / 0.53 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-13 | ru/B1 | ru-listen-v13-13__v2.mp3 | 308499 | 25.70 | 58 / 2.26 | 24.37 / 4/4 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.5 / -2.4 | 3 / 0.68 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-14 | ru/B1 | ru-listen-v13-14__v1.mp3 | 314768 | 26.23 | 63 / 2.40 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -18.8 / -2.3 | 4 / 0.75 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-15 | ru/B1 | ru-listen-v13-15__v2.mp3 | 368372 | 30.69 | 65 / 2.12 | 28.96 / 5/5 | auxiliares; vínculo não comprovado | mp3 / 22050 / 1 | -18.8 / -2.3 | 1 / 0.63 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |
| ru-listen-v13-16 | ru/B1 | ru-listen-v13-16__v1.mp3 | 345175 | 28.76 | 68 / 2.36 | 0.00 / 0/1 | indisponíveis | mp3 / 22050 / 1 | -19.2 / -2.3 | 4 / 0.74 | ok | ok | ok / ru-RU | OK (sem anomalia de duração) | awaiting_owner_review |

## Critérios e limites

- FFprobe verifica contêiner/codec, duração, taxa de amostragem e canais; FFmpeg decodifica e mede volume/silêncio. SHA-256 e tamanho são confrontados com o manifesto V19; roteiro e locale são confrontados com os metadados declarados, não com uma transcrição automática do áudio. Palavras/s é apenas um alerta de duração extrema (>7,5); não prova o que foi falado. WAVs auxiliares são listados apenas como contexto, pois não há hash/proveniência que comprove serem exatamente a fonte do MP3 atual.
- O locale do modelo é apenas metadado de geração. Não identifica automaticamente o idioma efetivamente falado nem detecta pronúncia, entonação, ritmo natural, artefatos perceptivos ou aderência integral da fala ao roteiro.
- Resultado técnico não altera `awaiting_owner_review`, `audioAssessmentEnabled=false`, `notAssessed` ou `uncertain`.

Arquivos decodificáveis e com integridade básica aprovada: 32/32; revisão por duração extrema: 0; falhas de integridade/decodificação: 0. Alertas: 0.
Nenhuma falha técnica objetiva nos critérios automatizados.
