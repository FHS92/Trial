#!/bin/bash
# start.sh — used by Railway on first boot
# Seeds the DB if empty, then starts the API server

set -e

echo "EdgeScan startup..."
python -c "
import os, sys
sys.path.insert(0, '.')
os.environ.setdefault('DATABASE_URL', 'sqlite:///./edgescan.db')
from database import init_db, SessionLocal
from models import ScanResult
init_db()
db = SessionLocal()
count = db.query(ScanResult).count()
db.close()
print(f'DB has {count} scan results.')
if count == 0:
    print('DB empty — running initial seed (top 30 tickers)...')
    import subprocess
    subprocess.run(['python', 'seed_live.py', '--n', '30'], check=True)
else:
    print('DB already seeded — skipping.')
"

echo "Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
