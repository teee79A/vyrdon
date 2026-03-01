#!/usr/bin/env bash
set -euo pipefail

ASUS_ROOT="${ASUS_ROOT:-$HOME/ASUS}"
ENGINE_ROOT="$ASUS_ROOT/codex/engine"
REPORT_DIR="$ASUS_ROOT/archive/ARCHIVE_DAILY_REPORT"
OPS_DIR="$ASUS_ROOT/archive/ARCHIVE_DAILY_OPERATION"
NOTES_DIR="$ASUS_ROOT/archive/NOTES"
ALERTS_DIR="$ASUS_ROOT/archive/ALERTS"
INDEX_FILE="$ASUS_ROOT/archive/index.md"
NOTES_FILE="$NOTES_DIR/ASUS_NOTES_AND_RECOMMENDATIONS.md"

mkdir -p "$REPORT_DIR" "$OPS_DIR" "$NOTES_DIR" "$ALERTS_DIR"

STAMP_LOCAL="$(date +%Y-%m-%d_%A_%H-%M-%S)"
DATE_LOCAL="$(date +%Y-%m-%d)"
TIME_LOCAL="$(date +%H:%M:%S)"
DAY_NAME="$(date +%A)"
UTC_NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

REPORT_FILE="$REPORT_DIR/${STAMP_LOCAL}_DAILY_REPORT.md"
OPS_FILE="$OPS_DIR/${STAMP_LOCAL}_DAILY_OPERATION.md"

HOSTNAME_VAL="$(hostname)"
KERNEL_VAL="$(uname -r)"
UPTIME_VAL="$(uptime -p 2>/dev/null || true)"
LOAD_VAL="$(cat /proc/loadavg 2>/dev/null || echo unknown)"
NODE_VAL="$(node -v 2>/dev/null || echo missing)"

DISK_USED_PCT="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}' 2>/dev/null || echo 0)"
DISK_USED_PCT="${DISK_USED_PCT:-0}"
MEM_USED_PCT="$(free | awk '/Mem:/ {printf "%d", ($3/$2)*100}' 2>/dev/null || echo 0)"
MEM_USED_PCT="${MEM_USED_PCT:-0}"

UFW_STATE="$(systemctl is-active ufw 2>/dev/null || echo unknown)"
if systemctl is-active ssh >/dev/null 2>&1; then
  SSH_STATE="active(service)"
elif systemctl is-active ssh.socket >/dev/null 2>&1; then
  SSH_STATE="active(socket)"
else
  SSH_STATE="inactive"
fi

CODEX_HEALTH="$(curl -s --max-time 2 http://127.0.0.1:4000/health 2>/dev/null || echo '{"status":"down"}')"
CODEX_STATUS="$(curl -s --max-time 2 http://127.0.0.1:4000/status 2>/dev/null || echo '{}')"

BACKLOG_COUNT="0"
ACTIVE_TASK_ID=""
ACTIVE_TASK_STATE=""
if [ -f "$ENGINE_ROOT/workspace/backlog.json" ]; then
  BACKLOG_COUNT="$(jq 'length' "$ENGINE_ROOT/workspace/backlog.json" 2>/dev/null || echo 0)"
fi
if [ -f "$ENGINE_ROOT/workspace/active.json" ]; then
  ACTIVE_TASK_ID="$(jq -r '.taskId // ""' "$ENGINE_ROOT/workspace/active.json" 2>/dev/null || echo "")"
  ACTIVE_TASK_STATE="$(jq -r '.state // ""' "$ENGINE_ROOT/workspace/active.json" 2>/dev/null || echo "")"
fi

JOURNAL_FILE="$ENGINE_ROOT/memory/journal.log"
TODAY_UTC_PREFIX="$(date -u +%Y-%m-%d)"
TODAY_EVENT_COUNT="0"
RECENT_JOURNAL="(no journal available)"
if [ -f "$JOURNAL_FILE" ]; then
  TODAY_EVENT_COUNT="$(grep -c "^${TODAY_UTC_PREFIX}" "$JOURNAL_FILE" 2>/dev/null || true)"
  RECENT_JOURNAL="$(tail -n 20 "$JOURNAL_FILE" 2>/dev/null || true)"
fi

RISK_LEVEL="LOW"
RISK_ITEMS=()
if [ "$DISK_USED_PCT" -ge 95 ]; then
  RISK_LEVEL="CRITICAL"
  RISK_ITEMS+=("Disk usage at ${DISK_USED_PCT}% (>=95%)")
elif [ "$DISK_USED_PCT" -ge 85 ]; then
  RISK_LEVEL="HIGH"
  RISK_ITEMS+=("Disk usage at ${DISK_USED_PCT}% (>=85%)")
fi

if [ "$MEM_USED_PCT" -ge 90 ]; then
  [ "$RISK_LEVEL" = "LOW" ] && RISK_LEVEL="HIGH"
  RISK_ITEMS+=("Memory usage at ${MEM_USED_PCT}% (>=90%)")
fi

if [ "$UFW_STATE" != "active" ]; then
  [ "$RISK_LEVEL" = "LOW" ] && RISK_LEVEL="HIGH"
  RISK_ITEMS+=("UFW state is ${UFW_STATE}")
fi

if [[ "$CODEX_HEALTH" == *"down"* ]]; then
  [ "$RISK_LEVEL" = "LOW" ] && RISK_LEVEL="HIGH"
  RISK_ITEMS+=("Codex health endpoint unavailable")
fi

RISK_TEXT="No immediate risk detected."
if [ "${#RISK_ITEMS[@]}" -gt 0 ]; then
  RISK_TEXT="$(printf '%s; ' "${RISK_ITEMS[@]}")"
  echo "${UTC_NOW} | ${RISK_LEVEL} | ${RISK_TEXT}" >> "$ALERTS_DIR/risk-alerts.log"
fi

cat > "$REPORT_FILE" <<EOF
# ASUS DAILY REPORT

Date: ${DATE_LOCAL}
Day: ${DAY_NAME}
Time: ${TIME_LOCAL}
Generated UTC: ${UTC_NOW}
Node: ${HOSTNAME_VAL}
Mode: Development

## Professional Language (Executive Summary)
System remained in monitored deterministic mode. Archive was generated with operational snapshot, task summary, and risk posture. Current risk level: **${RISK_LEVEL}**.

## Engineering Language (Technical Summary)
- Kernel: ${KERNEL_VAL}
- Uptime: ${UPTIME_VAL}
- LoadAvg: ${LOAD_VAL}
- Node: ${NODE_VAL}
- Memory Used: ${MEM_USED_PCT}%
- Disk Used (/): ${DISK_USED_PCT}%
- UFW: ${UFW_STATE}
- SSH: ${SSH_STATE}
- Backlog items: ${BACKLOG_COUNT}
- Active task: ${ACTIVE_TASK_ID:-none} (${ACTIVE_TASK_STATE:-none})
- Journal events today (UTC): ${TODAY_EVENT_COUNT}

## Commercial Language (Business Readout)
Operational continuity is stable with documented daily evidence. Risk exposure status: **${RISK_LEVEL}**. This supports controlled progress toward production-grade governance and audit readiness.

## Achievements (Today)
- Daily archive generated automatically.
- Operational metrics captured.
- Task state and journal activity captured.

## Risks / Damage Watch
${RISK_TEXT}

## Diagram (Mermaid)
\`\`\`mermaid
flowchart LR
  Anchor[Anchor] --> ASUS[ASUS Brain]
  ASUS --> Engine[Codex Engine]
  Engine --> Memory[memory/state + journal]
  Engine --> Workspace[backlog/active/daily]
  Engine --> Report[Daily Report Archive]
  Engine --> Ops[Daily Operation Archive]
\`\`\`

## Raw Health Payload
\`\`\`json
${CODEX_HEALTH}
\`\`\`
EOF

cat > "$OPS_FILE" <<EOF
# ASUS DAILY OPERATION

Date: ${DATE_LOCAL}
Day: ${DAY_NAME}
Time: ${TIME_LOCAL}
Generated UTC: ${UTC_NOW}

## Runtime Status
- Hostname: ${HOSTNAME_VAL}
- Kernel: ${KERNEL_VAL}
- Uptime: ${UPTIME_VAL}
- UFW: ${UFW_STATE}
- SSH: ${SSH_STATE}
- Codex API: $(echo "$CODEX_HEALTH" | jq -r '.status // "unknown"' 2>/dev/null || echo unknown)

## Resource Snapshot
- Memory used: ${MEM_USED_PCT}%
- Disk used (/): ${DISK_USED_PCT}%
- Load average: ${LOAD_VAL}

## Workspace Snapshot
- Backlog count: ${BACKLOG_COUNT}
- Active task id: ${ACTIVE_TASK_ID:-none}
- Active task state: ${ACTIVE_TASK_STATE:-none}

## Journal Tail (20)
\`\`\`
${RECENT_JOURNAL}
\`\`\`

## Risk Classification
- Level: ${RISK_LEVEL}
- Notes: ${RISK_TEXT}
EOF

if [ ! -f "$NOTES_FILE" ]; then
  cat > "$NOTES_FILE" <<'EOF'
# ASUS Notes And Recommendations

Purpose: store all actionable notes, recommendations, and capabilities discovered during build and operations.

## Rules
- Save recommendations daily.
- Keep risk-critical issues at top priority.
- Apply changes only with direct approval.

EOF
fi

if ! grep -q "^# ASUS Archive Index" "$INDEX_FILE" 2>/dev/null; then
  cat > "$INDEX_FILE" <<'EOF'
# ASUS Archive Index

## Daily Reports

## Daily Operations

EOF
fi

echo "- ${DATE_LOCAL} ${TIME_LOCAL} | [Report](${REPORT_FILE#$ASUS_ROOT/archive/})" >> "$INDEX_FILE"
echo "- ${DATE_LOCAL} ${TIME_LOCAL} | [Operation](${OPS_FILE#$ASUS_ROOT/archive/})" >> "$INDEX_FILE"

echo "DAILY_ARCHIVE_OK"
echo "REPORT_FILE=$REPORT_FILE"
echo "OPS_FILE=$OPS_FILE"
