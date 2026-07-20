# Florida data pipeline

**State-specific sources (local media + FL-native providers — no API keys):**
[`docs/sources/florida.md`](./sources/florida.md) → [`media.md`](./sources/florida/media.md) ·
[`agencies.md`](./sources/florida/agencies.md)

**Keys & multi-state vendors:** `docs/OBJECTIVE_SOURCES.md` · `KEYS.md`

Florida has the deepest state-level integration. Scripts ingest raw snapshots; `build:data-slices`
merges them into `lib/data/generated/slices/` for UI panels on Florida politician profiles.

## Script location

All Florida ingest scripts: **`scripts/ingest/florida/`**

Run all: `npm run ingest:florida-all` (alias: `npm run ingest:all`)

No-key subset: `npm run ingest:no-key`

## Raw snapshot paths (under `data/florida/` — do not move without updating `build-data-slices.ts`)

| npm script | Script | Output JSON |
|------------|--------|-------------|
| `ingest:fec-fl` | `ingest-fec-florida.ts` | `data/florida/fec/florida-candidates.json` |
| `ingest:congress-fl` | `ingest-congress-florida.ts` | `data/florida/congress/florida-votes.json` |
| `ingest:govtrack-fl` | `ingest-govtrack-florida.ts` | `data/florida/govtrack/florida-members.json` |
| `ingest:usaspending-fl` | `ingest-usaspending-florida.ts` | `data/florida/spending/florida-contracts.json` |
| `ingest:fara-fl` | `ingest-fara-florida.ts` | `data/florida/fara/florida-registrants.json` |
| `ingest:civic-fl` | `ingest-civic-florida.ts` | `data/florida/civic/florida-districts.json` |
| `ingest:census-fl` | `ingest-census-florida.ts` | `data/florida/census/florida-demographics.json` |
| `ingest:lobbying-fl` | `ingest-lobbying-florida.ts` | `data/florida/lobbying/florida-disclosures.json` |
| `ingest:openstates-fl` | `ingest-openstates-florida.ts` | `data/florida/openstates/florida-legislators.json` (Wave-1 preserve-on-failure; honest-gap if key EMPTY) |
| `ingest:legiscan-fl` | `ingest-legiscan-florida.ts` | `data/florida/legiscan/florida-legislation.json` |
| `ingest:news-fl` | `ingest-news-florida.ts` | `data/florida/news/florida-coverage.json` |
| `ingest:sam-fl` | `ingest-sam-florida.ts` | `data/florida/sam/florida-contractors.json` |
| `ingest:fedregister-fl` | `ingest-fedregister-florida.ts` | `data/florida/fedregister/florida-documents.json` |
| `ingest:courts-fl` | `ingest-courtlistener-florida.ts` | `data/florida/courts/florida-court-opinions.json` |
| `ingest:bls-fl` | `ingest-bls-florida.ts` | `data/florida/bls/florida-labor.json` |
| `ingest:fldoe-fl` | `ingest-fldoe-finance-florida.ts` | `data/florida/fldoe/florida-contributions.json` |
| `ingest:govinfo-fl` | `ingest-govinfo-florida.ts` | `data/florida/govinfo/florida-legislative-docs.json` |
| `ingest:secedgar-fl` | `ingest-secedgar-florida.ts` | `data/florida/secedgar/florida-filings.json` |
| `ingest:voteview-fl` | `ingest-voteview-florida.ts` | `data/florida/voteview/florida-ideology.json` |
| `ingest:fllobbyist-fl` | `ingest-fllobbyist-florida.ts` | `data/florida/fllobbyist/florida-lobbying-firm-directories.json` |

**Florida GDELT ingest (`ingest:gdelt-fl`):** optional raw snapshot only — **not** profile News path.
Profile news: `sync:news-rss` (RSS → GDELT). FL NewsAPI snapshot: `ingest:news-fl` (pipeline only;
local outlets in `docs/sources/florida/media.md`).

## UI slice accessors

See lib/data/generated/slices/ for Florida UI accessors. Florida panels on
politician profiles read slice JSON at build time — not the raw `data/florida/` files directly.

## Refresh

Daily refresh workflow: `.github/workflows/refresh-data.yml` (no-key subset always; keyed sources
when GitHub secrets are set).

See also: `data/florida/README.md`, `docs/AGENT_INDEX.md`.
