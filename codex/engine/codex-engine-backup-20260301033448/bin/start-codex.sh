#!/usr/bin/env bash
set -euo pipefail

export CODEX_ROOT="${HOME}/VYRDON/codex-engine"
export CODEX_MEMORY="${CODEX_ROOT}/memory"
export CODEX_WORKSPACE="${CODEX_ROOT}/workspace"
export CODEX_SYSTEM="${CODEX_ROOT}/system"

cd "${CODEX_ROOT}"

node dist/index.js \
  --system "${CODEX_SYSTEM}/system-prompt.txt" \
  --memory "${CODEX_MEMORY}/state.json" \
  --workspace "${CODEX_WORKSPACE}/active.json"
