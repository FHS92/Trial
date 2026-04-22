#!/bin/bash
# start.sh — Cloud Run / Render startup script
# DB init and initial data scan happen inside main.py on startup (non-blocking).
# Start the server immediately so Cloud Run health checks pass.

set -e

echo "EdgeScan startup — starting API server on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
