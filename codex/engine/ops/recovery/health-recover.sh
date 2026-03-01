#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://127.0.0.1:4000/health}"
PRIMARY_SERVICE="${VYRDON_PRIMARY_SERVICE:-vyrdon-codex.service}"
FALLBACK_SERVICE="${VYRDON_FALLBACK_SERVICE:-asus-codex-container.service}"

if curl --fail --silent --max-time 3 "$API_URL" >/dev/null; then
  echo "health check pass: $API_URL"
  exit 0
fi

echo "health check failed: $API_URL"

if systemctl list-unit-files | grep -q "^${PRIMARY_SERVICE}"; then
  echo "restarting ${PRIMARY_SERVICE}"
  systemctl restart "$PRIMARY_SERVICE"
  sleep 2
fi

if curl --fail --silent --max-time 3 "$API_URL" >/dev/null; then
  echo "recovery pass after primary restart"
  exit 0
fi

if systemctl list-unit-files | grep -q "^${FALLBACK_SERVICE}"; then
  echo "restarting ${FALLBACK_SERVICE}"
  systemctl restart "$FALLBACK_SERVICE"
  sleep 3
fi

if curl --fail --silent --max-time 3 "$API_URL" >/dev/null; then
  echo "recovery pass after fallback restart"
  exit 0
fi

echo "recovery failed; escalating"
exit 1
