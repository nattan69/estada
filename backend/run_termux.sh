#!/usr/bin/env bash
# Estada PMS — arrencada del backend al CAMP DE PROVES (Termux/Android, SQLite).
# Ús:  bash run_termux.sh
# La BD és ./estada.db (auto-bootstrap: crea taules + admin inicial si està buida).
set -e

cd "$(dirname "$0")"

echo "==> Instal·lant dependències (SQLite, sense Postgres)…"
pip install -r requirements-sqlite.txt

echo "==> Arrencant el backend a http://0.0.0.0:8001 …"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
