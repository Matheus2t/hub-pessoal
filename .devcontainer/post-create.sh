#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
npm ci
python -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
# Pin the CLI; installation is cached by npx and no Supabase service starts here.
npx --yes supabase@3.2.0 --version
