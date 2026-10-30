# Hub Pessoal

Primeira versão do Hub Pessoal, com calculadora de juros compostos e histórico local das simulações.

## Stack
Frontend: Lit, TypeScript, SCSS e esbuild. Backend: Python, FastAPI e Pydantic. Persistência: MySQL, SQLAlchemy e Alembic. Testes: Pytest.

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

```powershell
pytest backend/tests
```

O limite de período é de 1 a 600 meses. Os aportes acontecem ao final de cada mês, depois da aplicação dos juros.

## GitHub
O projeto está preparado para a branch `main`. Após criar um repositório vazio: `git remote add origin https://github.com/SEU_USUARIO/hub-pessoal.git` e `git push -u origin main`. Não há credenciais no repositório.
