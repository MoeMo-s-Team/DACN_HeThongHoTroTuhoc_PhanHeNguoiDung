#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi
chmod 600 .env

if ! grep -Eq '^AI_RUNTIME_TOKEN=.{20,}$' .env; then
  if grep -q '^AI_RUNTIME_TOKEN=$' .env; then
    TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
    sed -i "s|^AI_RUNTIME_TOKEN=$|AI_RUNTIME_TOKEN=${TOKEN}|" .env
  else
    echo "Set a private AI_RUNTIME_TOKEN of at least 20 characters in .env." >&2
    exit 1
  fi
fi

if grep -q '^AI_RUNTIME_BASE_URL=$' .env; then
  sed -i 's|^AI_RUNTIME_BASE_URL=$|AI_RUNTIME_BASE_URL=http://127.0.0.1:8001|' .env
fi

echo "Local AI runtime token is configured in .env. Keep it private."

COMPOSE=(docker compose --env-file .env -f ai/compose.yaml)
if [[ "${AI_RUNTIME_GPU:-0}" == "1" ]]; then
  COMPOSE+=(-f ai/compose.gpu.yaml)
fi

SOURCE_MODEL="$(python3 -c 'import json; print(json.load(open("deployment/model-manifest.json"))["ollama"]["sourceModel"])')"
EXPECTED_DIGEST="$(python3 -c 'import json; print(json.load(open("deployment/model-manifest.json"))["modelDigest"])')"
"${COMPOSE[@]}" up -d --wait ollama
"${COMPOSE[@]}" exec -T ollama ollama pull "$SOURCE_MODEL"
ACTUAL_PREFIX="$("${COMPOSE[@]}" exec -T ollama ollama list | awk -v model="$SOURCE_MODEL" '$1 == model {print $2}')"
if [[ "$ACTUAL_PREFIX" != "${EXPECTED_DIGEST:0:12}" ]]; then
  echo "Downloaded model digest does not match deployment/model-manifest.json; runtime will remain unavailable." >&2
  exit 1
fi

"${COMPOSE[@]}" up --build -d --wait runtime
echo "Runtime ready at http://127.0.0.1:${AI_RUNTIME_PORT:-8001}; readiness requires the pinned model digest."
