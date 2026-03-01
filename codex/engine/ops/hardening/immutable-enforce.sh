#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/t79/ASUS/codex"
CRITICAL=(
  "$ROOT/system/bootstrap.json"
  "$ROOT/system/bootstrap.sig"
  "$ROOT/system/identity.json"
  "$ROOT/system/doctrine.json"
  "$ROOT/system/architecture-lock.json"
  "$ROOT/system/hardware-profile.json"
)

for f in "${CRITICAL[@]}"; do
  test -f "$f" || { echo "missing critical file: $f"; exit 1; }
  chmod 440 "$f"
done

chmod 600 "$ROOT/memory/state.json" "$ROOT/memory/integrity.hash" "$ROOT/memory/journal.log"
chmod 700 "$ROOT/memory/checkpoints" "$ROOT/workspace"

echo "immutable baseline permissions applied"
