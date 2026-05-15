#!/usr/bin/env bash
set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "StutterNet+ Inference Server — http://localhost:8010"
cd "$PROJECT_DIR"
python3 -m uvicorn inference_server.main:app --host 0.0.0.0 --port 8010 --reload
