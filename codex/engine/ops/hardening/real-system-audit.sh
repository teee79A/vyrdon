#!/usr/bin/env bash
set -euo pipefail

ENGINE_ROOT="${ASUS_ENGINE_ROOT:-/home/t79/ASUS/codex/engine}"
CODEX_ROOT="${ASUS_CODEX_ROOT:-/home/t79/ASUS/codex}"
SECRETS_DIR="${ASUS_SECRET_DIR:-$HOME/.asus_secrets}"

pass=0
fail=0

ok() { echo "PASS: $1"; pass=$((pass+1)); }
bad() { echo "FAIL: $1"; fail=$((fail+1)); }

check_file() {
  local p="$1"
  if [ -f "$p" ]; then ok "file exists $p"; else bad "missing file $p"; fi
}

check_contains() {
  local p="$1"; local pattern="$2"; local msg="$3"
  if rg -q "$pattern" "$p"; then ok "$msg"; else bad "$msg"; fi
}

check_file "$CODEX_ROOT/system/bootstrap.json"
check_file "$CODEX_ROOT/system/bootstrap.sig"
check_file "$CODEX_ROOT/system/architecture-lock.json"
check_file "$CODEX_ROOT/memory/integrity.hash"
check_file "$ENGINE_ROOT/src/security/executionToken.ts"
check_file "$ENGINE_ROOT/src/memory/hashChain.ts"
check_file "$ENGINE_ROOT/ops/systemd/vyrdon-codex-recovery.service"
check_file "$ENGINE_ROOT/ops/systemd/vyrdon-codex-recovery.timer"
check_file "$ENGINE_ROOT/ops/apparmor/asus-codex-engine.profile"

check_contains "$ENGINE_ROOT/src/security/executionToken.ts" "crypto\.verify" "execution token uses cryptographic signature verification"
check_contains "$ENGINE_ROOT/src/memory/hashChain.ts" "prevHash" "journal hash-chain links previous hash"
check_contains "$ENGINE_ROOT/ops/systemd/vyrdon-codex.service" "NoNewPrivileges=true" "systemd no-new-privileges enabled"
check_contains "$ENGINE_ROOT/ops/systemd/vyrdon-codex.service" "AppArmorProfile=asus-codex-engine" "systemd apparmor profile configured"
check_contains "$CODEX_ROOT/docker/docker-compose.yml" "read_only: true" "container root filesystem read-only"
check_contains "$CODEX_ROOT/docker/docker-compose.yml" "REQUIRE_CONTAINER_RUNTIME" "container runtime policy enforced"

if node -e "const fs=require('fs');const p='$CODEX_ROOT/memory/integrity.hash';const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version!=='v2-merkle')process.exit(1);" 2>/dev/null; then
  ok "integrity hash is v2-merkle envelope"
else
  bad "integrity hash is not v2-merkle envelope"
fi

if [ -d "$SECRETS_DIR" ]; then
  mode_dir=$(stat -c '%a' "$SECRETS_DIR")
  if [ "$mode_dir" = "700" ]; then ok "secrets directory permissions 700"; else bad "secrets directory permissions expected 700 got $mode_dir"; fi
else
  bad "secrets directory missing: $SECRETS_DIR"
fi

if [ -f "$SECRETS_DIR/bootstrap_ed25519.pem" ]; then
  mode_key=$(stat -c '%a' "$SECRETS_DIR/bootstrap_ed25519.pem")
  if [ "$mode_key" = "600" ]; then ok "bootstrap private key permissions 600"; else bad "bootstrap private key permissions expected 600 got $mode_key"; fi
else
  bad "bootstrap private key missing"
fi

export BOOTSTRAP_SIGNATURE_REQUIRED=true
export BOOTSTRAP_SIGNATURE_FILE="$CODEX_ROOT/system/bootstrap.sig"
export BOOTSTRAP_PUBLIC_KEY_FILE="$SECRETS_DIR/bootstrap_ed25519.pub"
if (cd "$CODEX_ROOT" && node "$ENGINE_ROOT/dist/system/bootstrapLoader.js" >/dev/null 2>&1); then
  ok "bootstrap signature verification passes"
else
  bad "bootstrap signature verification failed"
fi

echo "---"
echo "TOTAL PASS: $pass"
echo "TOTAL FAIL: $fail"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
