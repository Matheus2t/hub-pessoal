# Fase 4.2 — Execução real e decisão de modelo

**Atualizado:** 2026-11-17
**Estado:** execução CPU corrigida e demonstrada em sintéticos; homologação fotográfica parcial; nenhum modelo selecionado.
**Branch:** `feature/2t-remover-fundo-benchmark-real` · **PR:** [#184](https://github.com/Matheus2t/hub-pessoal/pull/184), ainda aberto e baseado em #183.

## Resultado desta retomada

| Frente | Evidência atual | Estado |
|---|---|---|
| Ambiente Python | Venv isolado curto; `rembg 2.0.87`, `onnxruntime 1.32.0`; `pip check` limpo | Resolvido para pesquisa local |
| U²-Net | 6 inferências CPU em 5 IDs sintéticos; todas concluídas | Inferência real aprovada em sintéticos |
| PNG transparente | PNG RGBA 512×512, alpha de 0 a 255; máscara 512×512 | Transparência comprovada |
| Segundo modelo | Um smoke histórico do BiRefNet Lite em `synthetic-001`; 54,59 s e pico RSS 6,55 GB | Evidência técnica limitada, não repetida nesta retomada |
| Comparação pareada | U²-Net atual e smoke BiRefNet anterior usam o mesmo ID e o mesmo hash de manifesto; n=1 sintético | Apenas observação exploratória |
| Fotografias | 0 fotos importadas; os 80 itens locais continuam sintéticos | Bloqueado por fonte/acesso e revisão individual de direitos |
| GPU | Só `AzureExecutionProvider` e `CPUExecutionProvider`; 730 nós do perfil U²-Net executaram na CPU | Não homologada |
| Revisão visual | Inspeção técnica de uma galeria sintética cega; sem avaliador humano independente | Não homologada |
| Produção/custo | Nenhum recurso externo criado ou pago | Nenhum modelo recomendado para produção |

## Ambiente e causa da falha anterior

O venv de pesquisa mais profundo, em `services/background-research/.venv`, não tinha `rembg`. A tentativa de instalar o lock nesse caminho falhou no Windows ao gravar um módulo do ONNX Runtime cujo caminho excedia o limite de caminho (`MAX_PATH`). O DNS local também havia expirado ao consultar PyPI/Open Images (`getaddrinfo failed` / resolvedor `127.0.0.1` sem resposta).

Para não mudar o Python global nem desabilitar TLS, criei um venv descartável fora do repositório, em um caminho curto sob o diretório de visualizações desta tarefa, e instalei `services/background-research/requirements.lock.txt` contra `https://pypi.org/simple`. Os wheels disponíveis no cache foram usados com validação TLS normal. O ambiente isolado importa `rembg`, ONNX Runtime, NumPy e Pillow; `pip check` retornou **No broken requirements found**. Nenhum pacote global, driver ou variável permanente foi alterado. O venv curto e seu cache não são versionados.

Versões verificadas: Python 3.13.9, `rembg 2.0.87`, `onnxruntime 1.32.0`, NumPy 2.3.5, Pillow 12.3.0 e psutil 7.1.0.

## Inferências e artefatos

### U²-Net — smoke principal

Entrada `synthetic-001` (512×512, `synthetic-fine_edges`), manifesto SHA-256 `dd1c40ef69699fcce52a1cc205fac2456588b4fb182dd5dac0dd1a63d9c538cc`. O checkpoint `u2net.onnx` foi lido e verificado antes da inferência: 175.997.641 bytes, SHA-256 `8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491`, igual ao inventário versionado.

- Carga do modelo: **2,979 s**; warm-up: **0,765 s**; inferência fim a fim do adaptador: **0,730 s**.
- RSS máximo do processo: **1.041.973.248 bytes**. RAM disponível no início: **1.409.294.336 bytes** (a carga ficou próxima do limite disponível; não escalonar resolução ou concorrência local sem nova checagem).
- Entrada/modelo/saída: 512×512 / `[1, 3, 320, 320]` / máscara e PNG 512×512.
- Métricas desta única imagem sintética: MAE 0,00684; MSE 0,00334; SAD 1,792; F1@0,5 0,9880; IoU@0,5 0,9763; Boundary F1@2 px 0,8834; Gradient MAE 0,00577. São métricas contra matte sintética, não qualidade fotográfica.
- O PNG `cutouts/synthetic-001.png` está em RGBA; alpha min/max 0/255, com 199.058 pixels totalmente transparentes, 53.894 parcialmente transparentes e 9.192 opacos. A máscara L mede 512×512 e não está vazia. Isso comprova transparência real e dimensões coerentes.
- O perfil ONNX registrou **730 eventos de nós, todos `CPUExecutionProvider`**, zero nós CUDA; `cuda_execution_confirmed=false`. O `nvidia-smi` é telemetria de sistema, não atribuível ao processo.

Saída ignorada pelo Git: `results/phase-4.2/u2net-cpu-smoke-20261117/`.

### U²-Net — cinco casos sintéticos adicionais

O runner processou mais cinco IDs, um de cada categoria, todos com status `ok`. Latência de inferência (adaptador, em segundos) e RSS máximo do processo:

| ID | Categoria sintética | Segundos | RSS pico |
|---|---|---:|---:|
| `synthetic-001` | fine edges | 1,073 | 1.041.240.064 bytes |
| `synthetic-002` | translucency | 1,120 | 1.045.397.504 bytes |
| `synthetic-003` | low contrast | 1,028 | 1.045.975.040 bytes |
| `synthetic-004` | clutter | 0,925 | 1.045.659.648 bytes |
| `synthetic-005` | thin geometry | 0,951 | 1.045.499.008 bytes |

Esse lote repete `synthetic-001` do smoke e totaliza **6 execuções U²-Net, 5 imagens sintéticas distintas**. Saída ignorada pelo Git: `results/phase-4.2/u2net-cpu-five-synthetic-20261117/`. O lote não é uma amostra de pessoas, cabelos, animais ou produtos.

### BiRefNet General Lite — evidência anterior

O diretório local já contém o smoke histórico `results/smoke-birefnet-lite/`, que registrou sucesso em `synthetic-001`, CPU, 54,588 s de inferência e RSS máximo de 6.546.853.888 bytes. O resultado e o atual U²-Net referenciam o mesmo ID e o mesmo SHA-256 do manifesto. O arquivo local `birefnet-general-lite.onnx` tem 224.005.088 bytes e SHA-256 `5600024376f572a557870a5eb0afb1e5961636bef4e1e22132025467d0f03333`, que coincide hoje com o inventário. **O JSON do smoke histórico não registrou a associação do arquivo** (`model_artifacts` vazio); por isso, essa verificação atual não equivale a uma cadeia de custódia registrada no instante daquele run.

| Métrica em `synthetic-001` | U²-Net desta retomada | BiRefNet Lite, smoke anterior |
|---|---:|---:|
| MAE | 0,00684 | 0,00515 |
| SAD | 1,792 | 1,349 |
| F1@0,5 | 0,98800 | 0,99189 |
| Boundary F1@2 px | 0,88338 | 0,92792 |
| Inferência CPU | 0,730 s | 54,588 s |
| RSS máximo | 1,042 GB | 6,547 GB |

Esta é uma comparação **exploratória de um único caso sintético**, não uma avaliação representativa. O modelo B não foi repetido agora: seu pico histórico supera a RAM atualmente disponível, e o ambiente não oferece CUDA. Não foi executado lote de cinco imagens para BiRefNet.

## GPU

A RTX 4050 Laptop (driver 596.21, 6.141 MiB de VRAM; 16,44 GB RAM total) foi detectada, mas o ONNX Runtime ativo só disponibiliza Azure e CPU; não há wheel `onnxruntime-gpu` no cache consultado nem runtime CUDA/cuDNN/cuBLAS instalado. `nvidia-smi` mostrar compatibilidade CUDA do driver não significa que Toolkit, bibliotecas, Execution Provider ou inferência GPU estejam disponíveis. Não criei venv GPU nem instalei drivers/runtime sem wheels e matriz compatíveis.

A documentação oficial informa que os pacotes GPU atuais precisam de CUDA/cuDNN compatíveis e que versões/cuDNN diferentes não são intercambiáveis; não há validação GPU nesta máquina para a combinação instalada ([matriz CUDA/cuDNN do ONNX Runtime](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html), [instalação oficial](https://onnxruntime.ai/docs/install/)).

## Fotografias, inspeção e métricas de qualidade

O manifesto tem 80 sintéticos e zero fotografias; não encontrei arquivos JPG/JPEG/WebP/TIFF em `data/`. A tentativa de acesso local anterior ao host oficial do Open Images falhou por DNS. A página oficial alerta que a situação de licença precisa ser conferida por imagem; nenhuma foto foi baixada ou importada. P3M não foi aceito nem baixado. A página Open Images e o template de revisão por ativo continuam documentados em [Fase 4.1](phase-4.1-homologacao.md) e `config/openimages-rights-review-template.csv`.

A galeria cega local de `synthetic-001` foi inspecionada tecnicamente. Nesse caso procedural, U²-Net perde alguns traços finos; o BiRefNet conserva mais deles, mas também deixa passar elementos finos do fundo. Isso é uma observação de uma imagem gerada, não aprovação humana nem evidência sobre cabelo/pelos. Não houve avaliador humano independente, imagens de fundo branco/preto/cinza, métrica fotográfica, alpha matte real, teste 1/2/4 MP ou revisão por categoria fotográfica.

## Licenças, custos e decisão

- O código upstream de U-2-Net publica licença Apache-2.0; isso, por si só, não resolve a proveniência/licença do ONNX convertido servido pelo release de rembg. O hash e o tamanho locais batem com o inventário, mas a cadeia do artefato exato ainda exige revisão ([licença U-2-Net](https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE), [rembg](https://github.com/danielgatis/rembg)).
- O repositório BiRefNet publica MIT; o wrapper rembg também não transfere automaticamente direitos aos pesos. O ONNX local coincide com o hash esperado, porém não houve revisão independente suficiente das condições aplicáveis ao artefato convertido específico ([licença BiRefNet](https://github.com/ZhengPeng7/BiRefNet/blob/main/LICENSE)).
- Nenhum modelo foi redistribuído pelo PR. Pesos, imagens, máscaras, predições e perfil permanecem ignorados pelo Git.
- Nenhum serviço, conta, workload, cartão ou cobrança foi criado. Os preços oficiais já consultados (Modal/RunPod) são apenas tarifas de referência; sem execução GPU, cold start, recursos e volume medidos não é possível estimar custo por imagem para 100/1.000/10.000 imagens. Tarifas não equivalem a contratação ([Modal](https://modal.com/pricing), [RunPod](https://www.runpod.io/pricing)).

**Decisão: nenhum modelo para produção.** U²-Net pode continuar como baseline técnico de CPU; BiRefNet Lite é candidato, não vencedor. A amostra sintética n=1 não justifica seleção.

## Validação executada

- Imports: `rembg 2.0.87`; ONNX Runtime `1.32.0` com `AzureExecutionProvider`/`CPUExecutionProvider`; NumPy e Pillow importáveis — aprovados.
- `pip check`: **No broken requirements found** — aprovado.
- Smoke U²-Net CPU com profiling: **1/1 sucesso**, saída RGBA e métricas reais sobre matte sintética — aprovado.
- Lote U²-Net CPU: **5/5 sucessos**, cinco categorias sintéticas — aprovado.
- PNG/máscara: dimensões e canal alpha validados por Pillow — aprovado.
- Harness: **23 testes aprovados** (`python -m pytest -q`).
- `compileall evaluation scripts tests`: aprovado.
- `npm run typecheck`: aprovado nesta retomada.
- `npm run build`: aprovado nesta retomada. O script reescreveu um JSON gerado do Learn; como a árvore estava limpa no início, esse arquivo gerado foi restaurado e não integra o diff desta tarefa.
- `PYTHONPATH=backend python -m pytest backend/tests/test_utilities_contracts.py -q`: **9 testes aprovados**. Sem o `PYTHONPATH`, a primeira coleta falhou por não localizar `app`; a execução com o caminho correto passou. A suíte completa do backend não foi executada.
- Sem contratação, publicação, alteração de driver ou mudança funcional do produto. Repetir `git diff --check` antes do commit.

## Pendências que bloqueiam a homologação final

1. Restabelecer DNS/rede autorizada ou fornecer fotos locais com direitos documentados; revisar individualmente 20–30 ativos antes de usar e ampliar apenas se permitido.
2. Preparar venv GPU isolado com wheels e bibliotecas compatíveis segundo a matriz oficial; validar `CUDAExecutionProvider` e nós CUDA no profiling. Não alterar o driver global.
3. Reexecutar BiRefNet (ou outro candidato avançado licenciado) com cadeia de checkpoint registrada, após avaliar RAM/VRAM disponível; comparar ambos numa lista fixa de fotos reais.
4. Produzir comparações em fundos diversos, alta resolução e condições difíceis; obter avaliação humana registrada para cabelos/pelos, bordas, halos e integridade.
5. Revisar licença/proveniência dos checkpoints ONNX exatos e calcular custos somente após medições de infraestrutura real.

Até esses itens serem resolvidos, a Fase 4.2 permanece **parcial**; a homologação definitiva e a liberação de produção não estão aprovadas.
