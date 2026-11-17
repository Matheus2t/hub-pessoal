# 2T Background Removal — pesquisa isolada

Ambiente de avaliação local da Fase 4. **Não é serviço de produção**, não atende requisições do app, não instala dependências no projeto principal e não habilita a ferramenta pública.

## Ambiente

Python 3.11–3.13 em venv próprio. Para reproduzir exatamente o ambiente medido no Windows/Python 3.13, instale `python -m pip install -r requirements.lock.txt`; `requirements.txt` lista somente os pins diretos e serve como base para outras plataformas. Todos os pesos e imagens são armazenados localmente nesta subárvore e ignorados pelo Git. Os scripts não enviam fotos a APIs.

## Execução em modo controlado

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.lock.txt
python scripts/generate_synthetic.py --count 80
python scripts/build_manifest.py
python scripts/export_synthetic_manifest.py
python -m pytest -q
python scripts/run_benchmark.py --limit 3 --model u2net-baseline
python scripts/run_benchmark.py
```

Leia `docs/model-licenses.md` antes de baixar o P3M. A flag `--accept-p3m-terms` é uma confirmação local de leitura; imagens não são adicionadas ao Git. O downloader usa somente split face-blurred P3M-500-P e não imprime URLs temporárias. Interrompa antes da execução completa se a memória ou temperatura se aproximar dos limites do dispositivo.

## Saídas

- `data/manifest.json`: IDs, origem, licença, dimensões, ground truth e SHA-256.
- `models/rembg/`: checkpoints usados, não versionados.
- `results/`: JSON/CSV por imagem, sumário por modelo/categoria, máscaras e cutouts.
- Contact sheets cegos de avaliação visual: `python scripts/make_contact_sheet.py p3m-p-001`.

As métricas são medidas pelo código nesta pasta. Não copie fotos de terceiros, pesos ou resultados por imagem para documentos publicados; agregados e hashes são permitidos. Ver limitações em `docs/model-research.md` e `docs/model-benchmark.md`.

## Fase 4.1 — fotos licenciadas, pareamento e GPU

O importador Open Images não baixa imagens e não trata a licença geral do dataset como autorização individual. Primeiro obtenha os arquivos oficiais descritos em `docs/phase-4.1-homologacao.md`, revise manualmente cada página original e preencha um CSV local (`ImageID,LicenseVerified,VerifiedLandingURL,Category,ReviewedAt`). O importador só inclui itens marcados como revisados, cuja licença oficial seja CC BY 2.0 e cuja URL de origem coincida. As máscaras são **instâncias binárias**, não mattes alpha nem referência de remoção da cena completa; essa limitação acompanha cada linha do manifesto.

```powershell
python scripts/hardware_report.py
python scripts/import_openimages.py --metadata <validation-images-with-rotation.csv> --segmentations <validation-annotations-object-segmentation.csv> --rights-review data/openimages/rights-review.csv --limit 100
python scripts/run_benchmark.py --manifest data/openimages/manifest.json --model u2net-baseline --model birefnet-general-lite-advanced --sample-id <id-1> --sample-id <id-2> --provider CPUExecutionProvider --output results/openimages-cpu-paired
python scripts/analyze_paired.py results/openimages-cpu-paired/results.json --metric boundary_f1@2px
python scripts/make_contact_sheet.py <sample-id> --manifest data/openimages/manifest.json --run results/openimages-cpu-paired --output results/review-gallery --key-output results/review-keys
```

Para uma sessão CUDA, crie outro venv e instale o extra `rembg[gpu]` junto às DLLs runtime CUDA/cuDNN documentadas pelo ONNX Runtime. No Windows, a simples presença de `CUDAExecutionProvider` não basta; use `--provider CUDAExecutionProvider`. O runner pré-carrega as DLLs NVIDIA, falha se o provider não ativar, gera profiling ONNX por nó e registra telemetria global de GPU, sem atribuí-la falsamente ao processo. Veja `docs/phase-4.1-homologacao.md` antes de iniciar uma execução pesada.
