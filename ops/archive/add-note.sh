#!/usr/bin/env bash
set -euo pipefail
ASUS_ROOT="${ASUS_ROOT:-$HOME/ASUS}"
NOTES_FILE="$ASUS_ROOT/archive/NOTES/ASUS_NOTES_AND_RECOMMENDATIONS.md"
mkdir -p "$(dirname "$NOTES_FILE")"
if [ ! -f "$NOTES_FILE" ]; then
  echo "# ASUS Notes And Recommendations" > "$NOTES_FILE"
  echo >> "$NOTES_FILE"
fi
NOTE_TEXT="${*:-}"
if [ -z "$NOTE_TEXT" ]; then
  echo "usage: add-note.sh <note text>" >&2
  exit 1
fi
printf -- "- %s | %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$NOTE_TEXT" >> "$NOTES_FILE"
echo "NOTE_ADDED"
