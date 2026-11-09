#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose --env-file .env -f ai/compose.yaml)
if [[ "${AI_RUNTIME_GPU:-0}" == "1" ]]; then
  COMPOSE+=(-f ai/compose.gpu.yaml)
fi
"${COMPOSE[@]}" up --build -d --wait runtime
