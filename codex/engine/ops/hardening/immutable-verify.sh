#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/t79/ASUS/codex"
sha256sum \
  "$ROOT/system/bootstrap.json" \
  "$ROOT/system/bootstrap.sig" \
  "$ROOT/system/identity.json" \
  "$ROOT/system/architecture-lock.json" \
  "$ROOT/system/doctrine.json" \
  "$ROOT/system/hardware-profile.json" \
  "$ROOT/memory/state.json" \
  "$ROOT/memory/integrity.hash" > "$ROOT/archive/immutable-manifest.sha256"

echo "immutable checksum manifest written: $ROOT/archive/immutable-manifest.sha256"
