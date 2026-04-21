#!/bin/bash
# start.sh — Render / Railway startup script
# Always seeds the DB on boot (Render free tier has no persistent disk)

set -e

echo "EdgeScan startup — initialising DB..."
python -c "
import os, sys
sys.path.insert(0, '.')
from database import init_db
init_db()
print('Tables ready.')
"

echo "Seeding live data (top 30 tickers)..."
python seed_live.py --n 30

echo "Starting API server..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
