#!/usr/bin/env bash
set -euo pipefail
printf 'ASUS engine path: %s\n' "$HOME/ASUS/codex/engine"
if [ -f "$HOME/ASUS/codex/engine/system/bootstrap.json" ]; then
  echo 'bootstrap: present'
else
  echo 'bootstrap: missing'
fi
if ss -ltnp 2>/dev/null | grep -q ':4000'; then
  echo 'api: listening on 127.0.0.1:4000'
else
  echo 'api: not listening'
fi
