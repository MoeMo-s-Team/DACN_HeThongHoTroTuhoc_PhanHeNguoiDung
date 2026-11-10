#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
uv sync --locked --dev
uv run --locked ruff check app tests
uv run --locked ruff format --check app tests
