#!/usr/bin/env bash
# Exclude artifacts that record fetch failures from a data-refresh commit (§6).
set -euo pipefail

PATTERNS=('fetch-failed' 'fetch-blocked' '"status": "unavailable"')

candidate_files() {
  git diff --name-only HEAD -- data/ lib/data/generated/ 2>/dev/null || true
  git ls-files --others --exclude-standard -- data/ lib/data/generated/ 2>/dev/null || true
}

while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue
  for pat in "${PATTERNS[@]}"; do
    if grep -q "$pat" "$f" 2>/dev/null; then
      echo "Excluding fetch-failed artifact: $f (matched $pat)"
      if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
        git restore --source=HEAD --staged --worktree "$f" 2>/dev/null || git checkout HEAD -- "$f" 2>/dev/null || true
      else
        rm -f "$f"
      fi
      break
    fi
  done
done < <(candidate_files | sort -u | tr '\n' '\0')
