#!/usr/bin/env bash
# Exclude artifacts that record fetch failures from a data-refresh commit (§6).
set -euo pipefail

PATTERNS=('fetch-failed' 'fetch-blocked' '"status": "unavailable"')

while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue
  for pat in "${PATTERNS[@]}"; do
    if grep -q "$pat" "$f" 2>/dev/null; then
      echo "Excluding fetch-failed artifact: $f (matched $pat)"
      git checkout HEAD -- "$f" 2>/dev/null || git restore --source=HEAD --staged --worktree "$f" 2>/dev/null || true
      break
    fi
  done
done < <(git diff --name-only HEAD -- data/ lib/data/generated/ 2>/dev/null | tr '\n' '\0')
