# Benchmark do Removedor de Fundo — Fase 4

Revisão/execução em **2026-11-17**. É um estudo local, não homologação de produção. Os arquivos reais de dados, pesos, predições e contact sheets são ignorados pelo Git; o PR contém metadados, hashes e scripts, não os artefatos.

## Conjunto de avaliação executado

| Fonte | N | Classes | Ground truth | Proveniência |
|---|---:|---|---|---|
| Sintético gerado localmente | 80 | 16 por classe: clutter, detalhes finos, baixo contraste, geometria fina, transparência | Alpha matte contínua gerada com a composição | Sem imagens/ativos externos; seed e gerador versionados. Metadados e SHA-256 em `config/synthetic-80-manifest.json`; PNGs ignorados e regeneráveis. |
| P3M-500-P | 0 | Retratos com face blur | Matte alpha do conjunto | Não baixado. O acordo contém aceite/obrigações explícitas; não aceitei em nome do usuário. O downloader exige flag de confirmação após a leitura humana do acordo. |

Assim, as 80 amostras exercitam **mecânica, consistência de máscaras e desafios visuais sintéticos**, não desempenho em fotografia. As cinco classes não substituem retratos, produtos, animais, vidro ou cenas reais. Não há métrica de produto válida ainda.

## Inferências realmente executadas

Todos os tempos são da máquina desta sessão: Windows 11, Python 3.13.9, 16 CPUs lógicas, 16.44 GB RAM total, NVIDIA RTX 4050 Laptop com 6.14 GB VRAM. `onnxruntime 1.32.0` ativou somente `CPUExecutionProvider`; `onnxruntime-gpu`, CUDA runtime e cuDNN não estão instalados. O `nvidia-smi` é global, não uma medida de VRAM atribuível ao processo.

| Modelo/artefato | Amostras | MAE média | SAD/1000 média | F1 binário média | Boundary F1 média | Tempo de inferência | RSS máximo do processo |
|---|---:|---:|---:|---:|---:|---:|---:|
| U²-Net baseline (`u2net.onnx`) | 80/80 sintéticas | 0.04149 | 12.1839 | 0.90536 | 0.78148 | média 0.655 s; p50 0.652; p95 0.688 | 1,047,068,672 bytes |
| BiRefNet General Lite (`birefnet-general-lite.onnx`) | 1/1, apenas smoke `synthetic-001` | 0.00515 | 1.3487 | 0.99189 | 0.92792 | carga 24.62 s, warm-up 109.63 s, inferência 54.59 s | 6,546,853,888 bytes |

**Não compare as duas linhas como se fossem uma avaliação pareada completa:** a segunda tem `n=1` e é só o mesmo caso de borda fina. No U²-Net, `synthetic-translucency` teve MAE 0.18294 e boundary F1 0.60954; `synthetic-thin_geometry` teve boundary F1 0.44568. Isso evidencia a limitação de transparências e fios neste baseline sintético, sem extrapolar para fotos.

Artefatos exatos (somente metadados): `config/model-artifacts.json`. U²-Net ONNX: 175,997,641 bytes, SHA-256 `8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491`; BiRefNet Lite ONNX: 224,005,088 bytes, SHA-256 `5600024376f572a557870a5eb0afb1e5961636bef4e1e22132025467d0f03333`.

Um contact sheet cego de `synthetic-001` foi inspecionado: o U²-Net suaviza/perde alguns traços finos; o BiRefNet Lite recupera mais traços, mas também deixa passar marcas finas do fundo. É uma observação de um cenário artificial, não aprovação humana de produto.

## Cobertura de candidatos e limitações

`config/candidate-matrix.json` registra todos os candidatos solicitados e a situação de cada um. Foram executados um baseline completo e um smoke avançado; BiRefNet General/HR, matting e general-2K não foram executados porque o provider CUDA está ausente e o Lite levou >54 s por imagem em CPU, com RSS alto. BEN2 Base não foi usado até validar o contrato de pré/pós-processamento do ONNX oficial. InSPyReNet segue aguardando confirmação da licença do checkpoint. BRIA RMBG 2.0 foi excluído pelos termos não comerciais sem licença comercial; não houve download. FeyNobg fica bloqueado para revisão da licença do checkpoint exato.

Não há piloto real, aprovação linguística/humana do resultado fotográfico, ranking de qualidade ou modelo de produção escolhido.

## Custo e privacidade

Nenhuma conta, cartão, endpoint pago, crédito ou serviço cloud foi configurado ou usado; **nenhuma cobrança foi gerada**. A inferência ocorreu localmente e as imagens não foram enviadas a APIs. Isso não permite dizer que executar em máquina própria custa literalmente R$ 0: consumo elétrico não foi medido.

Como referência variável, a página oficial da Modal consultada nesta data lista L40S a US$ 0.000542/GPU-s e cobra CPU/memória/egress à parte; sua documentação diz que uso de GPU exige forma de pagamento cadastrada. RunPod lista Pod L40S a US$ 1.09/h, sujeito a disponibilidade/região/alterações. Nenhum custo por imagem foi inferido dos testes CPU nem foi provisionado; uma projeção exige benchmark na GPU/plano real, cold start, CPU/RAM, disco, transferência e taxa de utilização.

Como mera aritmética de tarifa, **1 GPU-s** a essa cotação L40S corresponderia a US$ 0.000542 (US$ 0.542 por mil GPU-s), antes de CPU/RAM/armazenamento/egress. Isso não afirma que qualquer dos modelos termine em 1 segundo na L40S nem estima uma operação real da 2T. Fontes: [preços Modal](https://modal.com/pricing), [requisito de método de pagamento para GPU Modal](https://modal.com/docs/guide/gpu), [preços RunPod](https://www.runpod.io/pricing).

## Reprodução

Para reexecutar o baseline já baixado:

```powershell
python scripts/run_benchmark.py --model u2net-baseline --output results/u2net-80-synthetic
```

Para repetir o smoke de BiRefNet Lite:

```powershell
python scripts/run_benchmark.py --limit 1 --model birefnet-general-lite-advanced --output results/smoke-birefnet-lite
```

O runner registra versão do runtime/provider, hash do manifest, hash da predição, latência, RSS e métricas por imagem; o sumário separa as categorias. Scores sintéticos não podem ser agregados a scores de fotografia.

## Reprodutibilidade

1. Criar venv isolado e instalar `requirements.txt` desta pasta.
2. Gerar as 80 imagens e verificar manifesto: `python scripts/generate_synthetic.py --count 80`; `python scripts/build_manifest.py`; `python scripts/export_synthetic_manifest.py`.
3. Só após leitura e aceite humano do acordo P3M, executar `python scripts/fetch_p3m.py --accept-p3m-terms --limit 40` e regenerar o manifesto. O script jamais baixa split sem blur.
4. Validar `python -m pytest -q`.
5. Rodar primeiro um modelo/amostra pequena; confirmar espaço, RAM e provider; depois executar o lote compatível com o hardware.
6. `results/`, `data/`, `models/` ficam ignorados. A matriz pode ser sumarizada sem editar os resultados brutos com `scripts/summarize_results.py RUN_DIR`.
7. Fazer inspeção cega com `scripts/make_contact_sheet.py SAMPLE_ID --run RUN_DIR`; o mapeamento dos candidatos fica em arquivo local separado.

Métricas binárias usam limiar alpha 0,5 e tolerância de borda de 2 px; MAE/MSE/SAD/gradiente usam matte contínua. Não agregar as imagens sintéticas com P3M para uma única nota de qualidade. Tempos incluem resolução original e são específicos ao hardware/runtime informado.

## Verificações desta entrega

- Suíte isolada do benchmark: **10 aprovados** (`python -m pytest tests -q`, 1,55 s).
- `compileall` dos módulos `evaluation`, `scripts` e `tests`: aprovado.
- No repositório principal: `npm ci`, typecheck e build de produção aprovados; o artefato gerado em `frontend/public/learn/progression-v12.json` foi restaurado byte a byte à versão-base nesta branch. A alteração pré-existente desse arquivo na outra worktree do usuário foi preservada.
- Testes contratuais direcionados do backend: **9 aprovados** (`backend/tests/test_utilities_contracts.py`). Não há código de backend alterado nesta entrega.
- A suíte completa de `backend/tests` foi tentada com `PYTHONPATH=.;backend`, mas ficou sem progresso observável após iniciar a coleta/execução e foi interrompida. Portanto, **não está aprovada**; não atribuir esse bloqueio a uma falha confirmada do código.
- `git diff --check`: aprovado antes da revisão final; será repetido no commit.

Esta entrega não muda aplicação, deployment ou flags de produção. Os verificadores `npm` não substituem a homologação fotográfica nem a revisão humana dos resultados.

## Atualização final Fase 4.2 — 2026-11-17

A primeira tentativa desta fase falhou antes da inferência porque `rembg` estava ausente. A instalação no venv longo parou por limite de caminho do Windows; um venv isolado de caminho curto instalou o lock com TLS padrão, usando os wheels disponíveis no cache. Nesse ambiente, U²-Net CPU concluiu 1 smoke e mais 5 inferências em IDs sintéticos, todas aprovadas; a saída RGBA 512×512 tem alpha real (0–255). Um perfil registrou 730 nós CPU e zero CUDA. O BiRefNet Lite continua representado por um smoke sintético anterior, lento e de RSS alto; não há lote avançado/fotográfico. A decisão continua sem modelo de produção. Ver [resultados completos da Fase 4.2](phase-4.2-results.md).

## Atualização Fase 4.1 — 2026-11-17

O dataset local confirmado segue com **80 amostras sintéticas e 0 fotografias reais**. Dois checkpoints ONNX locais, ignorados pelo Git, tiveram seus hashes conferidos contra `config/model-artifacts.json`; nenhum foi reexecutado nesta etapa. O Lite já havia atingido pico de RSS de 6,55 GB em CPU, enquanto a máquina tinha cerca de 2,85 GB de RAM disponível, então não repeti uma carga com risco de pressão de memória. A rede também não resolveu o host oficial do Open Images. Os resultados sintéticos históricos permanecem intactos; não há nova medição de modelo nem comparação fotográfica pareada. Detalhes e próximos passos estão no [relatório da Fase 4.1](phase-4.1-homologacao.md).
