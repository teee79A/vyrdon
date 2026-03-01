#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/ASUS/codex/engine"
if [ ! -f dist/index.js ]; then
  npm run build
fi
./bin/start-codex.sh
