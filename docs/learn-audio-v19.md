# 2T Learn V19 — produção privada de áudios

## Resultado

Foram gerados e verificados tecnicamente os 68 roteiros reais de Inglês e Russo. Os arquivos e os modelos permanecem no diretório local ignorado `private/learn-audio-v19/`; nenhum áudio V19 foi copiado para `frontend/public/`, `dist/` ou incluído no Git.

| Indicador | Resultado |
| --- | ---: |
| Roteiros | 68 (34 EN, 34 RU) |
| Ponte V11 | 4 (2 EN, 2 RU) |
| Listening V13 | 32 (16 EN, 16 RU) |
| Ditados V14 | 32 (16 EN, 16 RU) |
| Áudios produzidos | 68/68 |
| Verificações técnicas aprovadas | 68/68 |
| Aguardando revisão auditiva do proprietário | 68 |
| Aprovados pelo proprietário | 0 |
| Rejeitados / bloqueados na geração | 0 / 0 |
| Publicados / avaliação habilitada | 0 / 0 |

Os 68 MP3 somam 7.285.893 bytes (média 107.145 bytes). Duração: 2,247–28,761 s; média 8,93 s. Todos são mono, 22,05 kHz, 96 kbps. A validação registrou decodificação, formato, tamanho, duração, volume médio (-26,4 a -17,5 dB), pico (-4,1 a -2,2 dB), ausência de silêncio excessivo e SHA-256. São resultados técnicos; não atestam pronúncia, prosódia, fidelidade ao roteiro ou adequação pedagógica. Não foi executada transcrição automática.

## Pipeline e proveniência

- `scripts/learn-audio-v19/pipeline.mjs` fixa versões e hashes de fontes editoriais e de artefatos dos modelos. Downloads oficiais são retomáveis, armazenados em cache privado e verificados por tamanho/SHA-256. A geração e a validação podem ser executadas por ID ou em lote.
- Retentativas criam uma versão identificável, preservando tentativas anteriores. A atribuição não usa vozes distintas para simular falantes com o mesmo perfil.
- `scripts/learn-audio-v19/teratts_local.py` executa TeraTTSv2 localmente por ONNX Runtime, em CPU, com acentuação russa por dicionário. As 11 conversas russas de dois falantes usam os estilos oficiais recomendados `ru_f1` e `ru_m5`; os demais segmentos usam as vozes Piper atribuídas no manifesto.
- O manifesto privado associa cada áudio ao ID, hash e versão do roteiro, idioma, modelo, voz, parâmetros e verificações. O SHA-256 é mantido por arquivo.
- O diretório `private/learn-audio-v19/` é excluído pelo `.gitignore`. O manifesto atual mantém `publicRelease: false` e `assessmentEnabled: false` em todos os registros. O catálogo público segue sem os áudios desta etapa.

As versões editoriais usadas são as mesmas do inventário V19 e da auditoria V18. Os textos-fonte e os áudios não são publicados por este PR.

## Modelos e condições de uso

| Voz/modelo | Origem e versão | Evidência de licença registrada |
| --- | --- | --- |
| Piper `en_US-joe-medium` e `en_US-mike-medium` | OHF-Voice, revisão `cf910fb`, derivados de `rdh` | Model cards CC0 e cadeia `rdh` CC0 na lista oficial. |
| Piper `ru_RU-denis-medium` | OHF-Voice, revisão `cf910fb`, derivado de `rdh` | Model card CC0 e cadeia `rdh` CC0 na lista oficial. |
| Piper `en_US-kristin-medium` | OHF-Voice, revisão `cf910fb`, treinado do zero | Model card declara domínio público; consta na lista oficial. |
| Piper runtime 1.8.0 | OHF-Voice | GPL-3.0-or-later; usado só localmente, não empacotado com o Learn. |
| TeraTTSv2 ONNX, estilos `ru_f1` e `ru_m5` | TeraSpace, revisão `4c3bf2eb99c148cb657af10bd3bf717befb714c8` | Open RAIL-M com condição adicional para uso comercial do modelo. A licença/README do release diz que distribuir apenas o áudio gerado não aciona essa condição de atribuição; as restrições de uso de saída continuam valendo. |
| RUAccent | Componente usado pelo runtime Tera | MIT; aviso `RUACCENT_NOTICE.txt` mantido no pacote local do modelo. |

A documentação oficial do Piper explica que a licença do runtime não concede direitos sobre as vozes e que direitos de modelos dependem da cadeia dos dados de treinamento; as versões específicas foram fixadas e seus model cards/hashes conferidos. A página do TeraTTSv2 identifica o dataset `langswap/dialogs-ru-emotional-conversations` e a licença OpenRAIL declarada pelo dataset. Isso é evidência documental para a seleção e uso local; não é parecer jurídico nem aprovação da redistribuição de conteúdo no site. Os arquivos continuam privados até a escuta e a decisão do proprietário.

Referências oficiais:

- [Piper — licença de vozes](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/LICENSING.md) e [cadeias compatíveis com uso comercial](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/COMMERCIAL_USE.md).
- [TeraTTSv2 — model card, runtime, licenças e vozes](https://huggingface.co/TeraSpace/TeraTTSv2/blob/4c3bf2eb99c148cb657af10bd3bf717befb714c8/README.md).
- [Dataset de treinamento referenciado pelo TeraTTSv2](https://huggingface.co/datasets/langswap/dialogs-ru-emotional-conversations).

## Resolução de ENOTFOUND

A primeira tentativa de baixar modelos recebeu `ENOTFOUND` porque a execução isolada não tinha resolução DNS externa. Não alterei DNS, VPN, proxy, certificados ou firewall do computador, e não desativei TLS. Com acesso de rede autorizado nesta execução, os arquivos foram baixados por HTTPS das origens oficiais, em revisões fixas, e passaram pela conferência de integridade. O custo observado foi R$ 0; não foram usadas APIs, contas ou serviços pagos.

## Revisor local

O revisor já existente é servido somente em loopback, com token aleatório, checagem de origem, proteção contra CSRF, CSP e sem cache. A confirmação exige ouvir o arquivo por inteiro; rejeição exige motivo. A aprovação não publica o áudio nem altera avaliação ou estado editorial.

Para abrir o revisor no computador em que os arquivos privados estão armazenados:

```powershell
node scripts/learn-audio-v19/reviewer.mjs
```

Abra no navegador o endereço local com token que o comando imprimir. Não compartilhe esse link. Para escutar os áudios em outra máquina, seria necessário transferir os arquivos privados por um canal escolhido pelo proprietário; eles não estão no GitHub nem no deployment.

## Validação executada

- Testes do pipeline Node: **8/8 aprovados**.
- Sintaxe do pipeline e compilação sintática do runner Python: aprovadas.
- Revisor V19 em Playwright/Chromium: **2/2 aprovados**; cobre acesso local, reprodução integral, filtro de idioma/tipo e dimensões/temas no fixture de teste. O fixture não substitui a escuta dos 68 áudios reais.
- Typecheck e build de produção: aprovados.
- Os **13 validadores Learn**: aprovados. O validador de áudio público ainda informa 124 entradas, 0 gravações V19 validadas e evidência pública desativada; os 68 novos arquivos permanecem somente no manifesto privado.
- Pytest completo: **340/340 aprovados**. O primeiro bloqueio foi a permissão de socket local do sandbox Windows; executado novamente com acesso local autorizado, a suíte terminou sem falhas.
- Playwright completo: **392 aprovados, 31 ignorados e 37 falhos em 460**. Não houve contexto de falha nos testes Learn. As falhas estão em `distributions-design.spec.ts` (4), `distributions.spec.ts` (5), `home-portrait.spec.ts` (5), `market.spec.ts` (1), `monochrome.spec.ts` (3), `navigation.spec.ts` (6), `panel-workspace.spec.ts` (4), `platform.spec.ts` (7) e `platform-v2-content.spec.ts` (2). Os contextos mostram expectativas de layout/seletores incompatíveis com a interface V20 atual e uma espera pelo filtro de empresa de Distribuições; nenhum desses módulos foi alterado por esta entrega. Essas falhas não foram corrigidas neste PR.
- `git diff --check`: executado sem erros antes do commit.

## Estado da branch e próximos passos

O PR #125 permanece aberto como draft. A branch incorpora a main/V20 por um merge local para preservar o layout; não houve merge de volta, deploy ou alteração do site oficial. Como a regressão global tem falhas fora do Learn, o PR não deve ser marcado pronto nem integrado automaticamente.

Próximo passo do proprietário: iniciar o revisor local, escutar cada uma das 68 gravações em sua totalidade, aprovar/rejeitar individualmente e deixar notas para pronúncia, ritmo e correspondência ao texto. Só depois da revisão e de uma decisão explícita sobre publicação os estados poderão avançar. Nenhuma aprovação foi registrada nesta etapa.