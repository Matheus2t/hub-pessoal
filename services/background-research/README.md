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
