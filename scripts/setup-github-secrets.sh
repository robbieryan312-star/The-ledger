#!/usr/bin/env bash
# Push all API keys from .env.local to GitHub Actions repository secrets.
#
# Run once after gh auth login, then re-run any time you add a new key to .env.local.
#   gh auth login -h github.com -p https -w    # opens browser — one-time only
#   ./scripts/setup-github-secrets.sh
#
# Keys marked EMPTY are skipped — add the value to .env.local first, then re-run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v gh >/dev/null 2>&1 || { echo "gh CLI not found. Install: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Not logged in. Run: gh auth login"; exit 1; }
[[ -f "$ROOT/.env.local" ]] || { echo "Missing .env.local"; exit 1; }

declare -A ENV
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"; line="$(echo "$line" | xargs)"
  [[ -z "$line" || "$line" != *=* ]] && continue
  ENV["${line%%=*}"]="${line#*=}"
done < "$ROOT/.env.local"

push_group() {
  local label="$1"; shift
  echo ""; echo "── $label"
  for name in "$@"; do
    val="${ENV[$name]:-}"
    if [[ -z "$val" ]]; then
      echo "  SKIP  $name  (empty — register at see KEYS.md)"
    else
      printf '%s' "$val" | gh secret set "$name" && echo "  SET   $name"
    fi
  done
}

push_group "Official government APIs (votes · finance · roster)" \
  CONGRESS_API_KEY FEC_API_KEY GOVINFO_API_KEY CENSUS_API_KEY DATA_GOV_API_KEY

push_group "Nonpartisan research (positions · scores · journalism)" \
  VOTESMART_API_KEY PROPUBLICA_CONGRESS_KEY

push_group "State-level data (legislation · state legislators)" \
  LEGISCAN_API_KEY OPENSTATES_API_KEY

push_group "News (restricted — upgrade plan to unlock full coverage)" \
  NEWSAPI_KEY

echo ""; echo "── Current repository secrets:"; gh secret list
