#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/ASUS/codex"
docker compose -f docker/docker-compose.yml down
