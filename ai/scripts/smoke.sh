#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIGURED_BASE_URL=""
if [[ -f "$ROOT/.env" ]]; then
  CONFIGURED_BASE_URL="$(sed -n 's/^AI_RUNTIME_BASE_URL=//p' "$ROOT/.env" | tail -n 1)"
fi
BASE_URL="${AI_RUNTIME_BASE_URL:-${CONFIGURED_BASE_URL:-http://127.0.0.1:8001}}"
curl --fail --silent --show-error "$BASE_URL/health/live"
curl --fail --silent --show-error "$BASE_URL/health/ready"
echo
