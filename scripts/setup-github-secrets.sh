#!/usr/bin/env bash
# Reads API keys from .env.local and sets GitHub Actions repository secrets.
#
# One-time GitHub auth (pick one):
#   gh auth login -h github.com -p https -w
#   echo "$GH_TOKEN" | gh auth login --with-token   # fine-grained PAT with repo + secrets
#
# Then: ./scripts/setup-github-secrets.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in to GitHub. Run: gh auth login"
  exit 1
fi

ENV_FILE="$ROOT/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local"
  exit 1
fi

declare -A ENV
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="$(echo "$line" | xargs)"
  [[ -z "$line" ]] && continue
  [[ "$line" != *=* ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  ENV["$key"]="$val"
done < "$ENV_FILE"

SECRETS=(
  FEC_API_KEY
  CONGRESS_API_KEY
  CENSUS_API_KEY
  DATA_GOV_API_KEY
  GOVINFO_API_KEY
  LEGISCAN_API_KEY
  OPENSTATES_API_KEY
  NEWSAPI_KEY
  VOTESMART_API_KEY
)

for name in "${SECRETS[@]}"; do
  val="${ENV[$name]:-}"
  if [[ -z "$val" ]]; then
    echo "SKIP $name (not in .env.local)"
    continue
  fi
  printf '%s' "$val" | gh secret set "$name"
  echo "SET $name"
done

echo ""
echo "Repository secrets:"
gh secret list
