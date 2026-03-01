#!/usr/bin/env bash
set -euo pipefail

ROOT="${ASUS_CODEX_ROOT:-/home/t79/ASUS/codex}"
ENGINE_ROOT="${ASUS_ENGINE_ROOT:-$ROOT/engine}"
SECRET_DIR="${ASUS_SECRET_DIR:-$HOME/.asus_secrets}"
BOOTSTRAP_PATH="${ENGINE_ROOT}/system/bootstrap.json"
SIG_PATH="${ENGINE_ROOT}/system/bootstrap.sig"
PRIV_KEY="${SECRET_DIR}/bootstrap_ed25519.pem"
PUB_KEY="${SECRET_DIR}/bootstrap_ed25519.pub"

mkdir -p "$SECRET_DIR"
chmod 700 "$SECRET_DIR"

if [ ! -f "$PRIV_KEY" ]; then
  openssl genpkey -algorithm Ed25519 -out "$PRIV_KEY"
fi

openssl pkey -in "$PRIV_KEY" -pubout -out "$PUB_KEY"
chmod 600 "$PRIV_KEY" "$PUB_KEY"

tmp_sig="$(mktemp)"
openssl pkeyutl -sign -inkey "$PRIV_KEY" -rawin -in "$BOOTSTRAP_PATH" -out "$tmp_sig"
xxd -p -c 1000 "$tmp_sig" > "$SIG_PATH"
rm -f "$tmp_sig"
chmod 600 "$SIG_PATH"

echo "bootstrap signed: $SIG_PATH"
