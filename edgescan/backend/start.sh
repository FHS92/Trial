#!/bin/bash
exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info
