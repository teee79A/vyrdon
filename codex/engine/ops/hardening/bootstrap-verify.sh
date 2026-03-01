#!/usr/bin/env bash
set -euo pipefail

ENGINE_ROOT="${ASUS_ENGINE_ROOT:-/home/t79/ASUS/codex/engine}"
SECRET_DIR="${ASUS_SECRET_DIR:-$HOME/.asus_secrets}"

export BOOTSTRAP_SIGNATURE_REQUIRED=true
export BOOTSTRAP_SIGNATURE_FILE="${ENGINE_ROOT}/system/bootstrap.sig"
export BOOTSTRAP_PUBLIC_KEY_FILE="${SECRET_DIR}/bootstrap_ed25519.pub"

cd "$ENGINE_ROOT"
node -e "require('./dist/system/bootstrapLoader').loadBootstrap(); console.log('bootstrap signature verification: PASS')"
