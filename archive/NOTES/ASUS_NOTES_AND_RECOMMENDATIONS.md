# ASUS Notes And Recommendations

Purpose: store all actionable notes, recommendations, and capabilities discovered during build and operations.

## Rules
- Save recommendations daily.
- Keep risk-critical issues at top priority.
- Apply changes only with direct approval.

- 2026-03-01T10:21:01Z | Build Integrity layer added: /vyrdon/engineering/build-verify with node check, lockfile hash, dependency checksum, build hash, git commit, rule hash, PASS/FAIL.
- 2026-03-01T10:21:01Z | Build records now archived in /home/t79/ASUS/codex/engine/archive/builds with hash chaining via prevBuildHash/buildRecordHash.
- 2026-03-01T10:21:01Z | ASUS persona lock added: boot loads /home/t79/ASUS/codex/system/{bootstrap.json,identity.json} and validates persona_hash against /home/t79/ASUS/codex/memory/state.json.
- 2026-03-01T10:21:01Z | Boot now prints ENGINE/NODE/MODE/CONTEXT electrical binding markers and increments top-level ASUS memory boot_count.
