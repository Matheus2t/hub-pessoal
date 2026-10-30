# 2T

2T — Ferramentas. Plataforma de utilidades digitais com calculadora de juros compostos, gráfico interativo e detalhamento mensal. Site oficial: `matheus2t.com.br`.

## Stack
Frontend: Lit, TypeScript, SCSS e esbuild. Backend: Python, FastAPI e Pydantic. Persistência: MySQL, SQLAlchemy e Alembic. Testes: Pytest e Playwright.

## Configuração
Requisitos: Node.js 20+, Python 3.11+ e Docker Desktop.

```powershell
Copy-Item backend/.env.example backend/.env
docker compose up -d db
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
alembic -c backend/alembic.ini upgrade head
```

Execute a API com `uvicorn app.main:app --app-dir backend --reload` e o frontend com `npm install` seguido de `npm run dev`. Acesse http://localhost:3000.

## Vercel

O frontend é gerado em `dist/` e a API FastAPI usa `api/index.py` como função Python. O `vercel.json` instala dependências Python e Node, executa o build existente e preserva a montagem de arquivos estáticos no FastAPI. A calculadora pública funciona sem `DATABASE_URL`. Para ativar persistência futuramente, use um MySQL externo com TLS/SSL e mantenha `PUBLIC_HISTORY_ENABLED=false`. Migrações Alembic são manuais e não são executadas pela função.

```powershell
pytest backend/tests
```

O limite de período é de 1 a 600 meses. Os aportes acontecem ao final de cada mês, depois da aplicação dos juros.

Sem `DATABASE_URL`, a API ainda calcula e retorna a simulação, mas não grava histórico. Quando `DATABASE_URL` está configurada localmente, as simulações são persistidas no MySQL. Em Vercel, o histórico compartilhado permanece desativado.

## Frontend e testes de navegador

Os componentes Lit usam Light DOM deliberadamente: o SCSS compartilhado alcança todos os elementos, sem atravessar Shadow DOM. Tokens semânticos e temas estão em `frontend/styles/_tokens.scss`; regras por área ficam nos demais módulos SCSS. As ferramentas disponíveis estão centralizadas em `frontend/src/catalog.ts`. A navegação usa hash e preserva os caminhos de estáticos e `/api/*` do deploy.

O tema respeita a preferência do sistema quando não existe escolha salva. A escolha manual usa apenas `localStorage['2t:theme']`, aplicada antes do CSS para evitar flashes.

```powershell
npm run typecheck
npm run build
$env:PYTHONPATH='backend'
python -m pytest -q backend/tests
# Em outro terminal, para testar sem persistência:
$env:DATABASE_URL=''
$env:VERCEL='1'
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8123
# No terminal dos testes (Edge instalado):
npm run test:e2e
```

Playwright valida HTTP/MIME dos estáticos, cálculo real pela API, navegação, temas, menu móvel, ausência de overflow, gráfico, tabela, loading e falhas da API nas larguras 1920, 1366, 768, 390 e 320 px. As capturas ficam em `test-results/` (ignorado pelo Git). Para Chromium instalado pelo Playwright, defina `PW_CHANNEL=chromium`. `BASE_URL` permite validar um deploy autorizado.

## GitHub

Repositório existente: https://github.com/Matheus2t/hub-pessoal — branch `main`, com deploy automático no projeto Vercel existente.
