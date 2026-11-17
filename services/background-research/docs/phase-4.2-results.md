# Fase 4.2 — Execução real e decisão de modelo

**Data da verificação:** 2026-11-17
**Estado:** homologação parcial; nenhum modelo selecionado.
**Base:** PR #183, HEAD `690e6846e839f467cc30696b13eaed4dd3797866`.

## Resultado executivo

A infraestrutura de pesquisa da Fase 4.1 foi reutilizada. Nenhuma fotografia real pôde ser importada nesta execução, e não foi possível carregar o adaptador de inferência local. Portanto, não há benchmark fotográfico, comparação pareada, métricas novas de qualidade ou decisão fundamentada de IA. Os resultados sintéticos anteriores continuam sendo apenas evidência mecânica, não são reapresentados como fotos.

| Verificação | Resultado real | Interpretação |
|---|---|---|
| Dataset disponível | 80 imagens sintéticas; 0 fotos reais | Nenhuma categoria fotográfica coberta |
| Smoke U²-Net | 1 amostra sintética solicitada; 0/1 inferências concluídas | `model_load_error: ModuleNotFoundError: No module named 'rembg'`; sem máscara ou métricas |
| Provider CUDA | Não disponível | Runtime observado apenas com Azure e CPU; nenhuma operação GPU confirmada |
| BiRefNet Lite | Não executado nesta fase | Histórico de ~6,55 GB RSS e ~54,6 s CPU por imagem permanece fora do orçamento de RAM livre observado |
| Comparação por foto | Não executada | Não há IDs fotográficos comuns entre modelos |
| Revisão humana cega | Não realizada | Não há avaliadores nem notas registradas |
| Modelo de produção | Nenhum selecionado | Qualidade real, licenças finais e custo operacional continuam sem evidência suficiente |

## Ambiente e teste executado

- Windows 11 build 26200; Python 3.13.9; 16 CPUs lógicas; RAM total de 16,44 GB.
- No início do smoke: 1.916.678.144 bytes de RAM disponíveis.
- NVIDIA GeForce RTX 4050 Laptop, 6141 MiB de VRAM, driver 596.21. O campo CUDA 13.2 de `nvidia-smi` representa compatibilidade do driver, não presença do Toolkit.
- ONNX Runtime importável 1.32.0 com `AzureExecutionProvider` e `CPUExecutionProvider`; `CUDAExecutionProvider`, `onnxruntime-gpu`, Toolkit (`nvcc`), CUDA/cuDNN/cuBLAS correspondentes não foram encontrados.
- O smoke pediu `CPUExecutionProvider` para `synthetic-001`; o adaptador falhou ao importar `rembg` antes de criar sessão. O runner registrou 0 sucessos e 1 falha, sem latência de inferência, RSS de modelo, máscara ou métricas. O `nvidia-smi` mediu somente o sistema (670/6141 MiB, 56 °C, 4% na amostragem), valores não atribuíveis ao processo.
- A primeira execução mostrou `onnxruntime: null` no manifesto de ambiente, embora o módulo fosse importável sem metadados de distribuição. O runner agora recorre a `module.__version__` e o teste cobre esse cenário; o smoke repetido registra corretamente 1.32.0.

Comando do smoke repetido:

```powershell
.\.venv\Scripts\python.exe scripts\run_benchmark.py --limit 1 --model u2net-baseline --sample-id synthetic-001 --provider CPUExecutionProvider --output results\phase-4.2\u2net-cpu-smoke
```

Nenhum pacote foi instalado, nenhum driver foi alterado e nenhum serviço GPU externo foi criado. A tentativa local anterior de instalar/consultar pacotes falhou por DNS (`getaddrinfo failed`); não foi repetida. A documentação oficial do ONNX Runtime exige compatibilidade entre versão do runtime, CUDA e cuDNN; as combinações da tabela oficial associam CUDA 13.x a cuDNN 9.x e advertem incompatibilidade entre cuDNN 8 e 9. Não escolhi uma matriz para instalação sem acesso às wheels e validação do ambiente ([matriz oficial CUDA/cuDNN](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html)).

## Dados e direitos

O conjunto local continua com 80 amostras sintéticas e nenhuma fotografia real. O acesso local a `storage.googleapis.com` falhou por DNS na tentativa documentada da Fase 4.1. Foi possível consultar a página oficial Open Images V7 por pesquisa web: ela aponta o fluxo de download oficial e declara que as fotos são listadas como CC BY 2.0, mas avisa que não garante a licença de cada imagem e exige verificação individual da página de origem. As anotações são CC BY 4.0; máscaras de segmentação de instância não equivalem a alpha matte de remoção do fundo ([download oficial](https://storage.googleapis.com/openimages/web/download_v7.html), [descrição/licenças](https://storage.googleapis.com/openimages/web/factsfigures_v7.html)). Nenhuma fotografia ou máscara foi baixada/importada.

O acordo P3M continua sem aceite e não foi baixado. Nenhuma outra fonte alternativa foi adquirida ou verificada item a item. A opção operacional mais concreta segue sendo obter dados do canal oficial Open Images, revisar manualmente cada URL/licença, ou disponibilizar fotos locais com direitos documentados. Para futura importação, preencher `config/openimages-rights-review-template.csv` e manter arquivos em `data/` (ignorado pelo Git). Exemplo após obter localmente os dois CSVs oficiais e as imagens correspondentes:

```powershell
.\.venv\Scripts\python.exe scripts\import_openimages.py --data-root data\openimages --metadata data\openimages\validation-images-with-rotation.csv --segmentations data\openimages\validation-annotations-object-segmentation.csv --rights-review data\openimages\rights-review.csv --output data\openimages\manifest.json --limit 30
```

Esse importador valida dados já presentes; não baixa imagens e não substitui a revisão humana das licenças. Open Images pode compor inspeção visual de fotos e máscaras de instância com escopo próprio, não ground truth de matting. Para avaliar alpha/matting quantitativamente, ainda é necessário um conjunto com alpha mattes licenciadas para esse uso.

## Modelos, métricas e inspeção visual

Não houve inferência concluída na Fase 4.2, então não existem resultados novos para U²-Net, BiRefNet Lite, BiRefNet General, BEN2 ou variantes HR. A linha histórica U²-Net 80/80 sintéticas e o smoke histórico BiRefNet Lite 1/1 sintética permanecem registrados em [benchmark histórico](model-benchmark.md); não foram atualizados nem comparados nesta fase.

Não houve MAE, MSE, SAD, F1, IoU, Boundary F1, Gradient Error, avaliação de cabelo/pelos/transparência, comparação de pós-processamento ou teste de alta resolução nesta fase. Não foi gerada galeria fotográfica, pois não há fotos nem resultados de modelos para ocultar/avaliar. Não inventar notas ou métricas para preencher essas lacunas.

## Licenças e hashes

Os inventários locais de U²-Net e BiRefNet Lite em `config/model-artifacts.json` continuam apontando os artefatos e hashes registrados na Fase 4.1; os pesos seguem em `models/` ignorado pelo Git. Esta execução não os descarregou, redistribuiu nem fez nova revisão jurídica. A proveniência/conversão exata do ONNX U²-Net e a revisão/condições de redistribuição dos pesos BiRefNet permanecem pendentes; licença do wrapper não resolve licença do checkpoint.

## Desempenho e custo

Sem inferência, não há duração de carga, warm-up, inferência, pós-processamento, p50/p95, RSS atribuível, VRAM atribuível ou estabilidade para relatar nesta fase. A medição histórica de RSS do BiRefNet em CPU não é VRAM e não foi convertida em estimativa GPU.

Nenhuma conta, cartão, crédito, serviço, workload ou cobrança foi criado. A tabela oficial Modal consultada em 2026-11-17 mostrava L40S a US$ 0,000542/GPU-s, mais CPU, memória e egress; RunPod mostrava Pod L40S a US$ 1,09/h na página atualizada em 12/11/2026. São tarifas publicadas, não custo por imagem. Não projeto 100/1.000/10.000 imagens por mês sem latência GPU, cold start, memória, disco, tráfego, falhas e política de ociosidade medidos ([Modal](https://modal.com/pricing), [RunPod](https://www.runpod.io/pricing)).

## Validação desta entrega

- Harness: **23 testes aprovados** (`.venv\Scripts\python.exe -m pytest -q`).
- `compileall evaluation scripts tests`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado antes da correção isolada no runner; não houve mudança no frontend desde então.
- Contratos de Utilitários: **9 testes aprovados** (`backend/tests/test_utilities_contracts.py`).
- Smoke U²-Net: executado e falhou antes da inferência por dependência `rembg` ausente; documentado como bloqueio, não como sucesso.
- `git diff --check`: executar novamente antes do commit.
- Sem alterações funcionais em módulos do produto; imagens, máscaras e pesos continuam fora do Git.

## Decisão e ações para desbloquear

**Decisão: nenhum modelo selecionado por falta de evidências fotográficas, inferência reproduzível e revisão visual humana.** Não iniciar worker nem fase de produção com base nesta execução.

1. Restaurar acesso autorizado ao índice PyPI ou fornecer wheels verificáveis offline para um ambiente de pesquisa isolado; instalar dependências do harness sem modificar Python global. Confirmar `rembg` e provider CPU primeiro.
2. Para GPU, usar venv separado e a matriz oficial correspondente; confirmar `CUDAExecutionProvider` ativo e profiling por nó antes de chamar a GPU homologada.
3. Adquirir 20–30 fotos representativas inicialmente por fonte oficial ou fornecimento local com direitos explícitos; revisar cada licença/página e preencher o CSV de direitos. Não aceitar acordo P3M sem aceite do usuário.
4. Executar dois modelos na mesma lista de IDs, produzir galerias cegas e obter avaliação humana registrada. Ampliar a 60–100 imagens apenas depois do smoke.
5. Revisar hashes/licenças dos checkpoints e estimar custos após medições reais.

Fase 4.2: **experimento tentado e bloqueios concretos registrados; homologação parcial, critérios de seleção não atendidos.**
