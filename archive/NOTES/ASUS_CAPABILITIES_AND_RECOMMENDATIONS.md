# ASUS Capabilities And Recommendations

## Saved Capabilities (Current Build)
- Deterministic boot with fail-closed behavior.
- State machine guarded execution flow.
- Journal + integrity hashing discipline.
- Hardware-profile binding and verification.
- Guarded local API on localhost.
- Daily auto-archive generation (report + operation).
- Risk logging to alerts file when dangerous thresholds are exceeded.

## Recommendations Queue (Review + Approve Later)
1. Add signed intent verification to `/codex/intent` path.
2. Add preflight script as a daily prerequisite before archive generation.
3. Add redaction scanner pass before writing archive content.
4. Add immutable archive hash chain (prev hash -> current hash).
5. Add backup manifest linkage to archive entries.
6. Add service health checks for Redis/Postgres once integrated.
7. Add CI validation for archive document schema.

## Risk Escalation Rule
- If critical risk is detected (disk >=95%, mem >=90%, UFW inactive, codex down), alert is written immediately to:
  - `/home/t79/ASUS/archive/ALERTS/risk-alerts.log`

