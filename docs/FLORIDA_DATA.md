# Florida data pipeline

Florida has the deepest state-level integration. Scripts ingest raw snapshots; `build:data-slices`
merges them into `lib/data/generated/slices/` for UI panels on Florida politician profiles.

## Script location

All Florida ingest scripts: **`scripts/ingest/florida/`**

Run all: `npm run ingest:florida-all` (alias: `npm run ingest:all`)

No-key subset: `npm run ingest:no-key`

## Raw snapshot paths (do not move without updating `build-data-slices.ts`)

| npm script | Script | Output JSON |
|------------|--------|-------------|
| `ingest:fec-fl` | `ingest-fec-florida.ts` | `data/fec/florida-candidates.json` |
| `ingest:congress-fl` | `ingest-congress-florida.ts` | `data/congress/florida-votes.json` |
| `ingest:govtrack-fl` | `ingest-govtrack-florida.ts` | `data/govtrack/florida-members.json` |
| `ingest:usaspending-fl` | `ingest-usaspending-florida.ts` | `data/usaspending/florida-awards.json` |
| `ingest:fara-fl` | `ingest-fara-florida.ts` | `data/fara/florida-registrations.json` |
| `ingest:civic-fl` | `ingest-civic-florida.ts` | `data/civic/florida-officials.json` |
| `ingest:census-fl` | `ingest-census-florida.ts` | `data/census/florida-demographics.json` |
| `ingest:lobbying-fl` | `ingest-lobbying-florida.ts` | `data/lobbying/florida-lda.json` |
| `ingest:openstates-fl` | `ingest-openstates-florida.ts` | `data/openstates/florida-bills.json` |
| `ingest:legiscan-fl` | `ingest-legiscan-florida.ts` | `data/legiscan/florida-legislation.json` |
| `ingest:news-fl` | `ingest-news-florida.ts` | `data/news/florida-articles.json` |
| `ingest:sam-fl` | `ingest-sam-florida.ts` | `data/sam/florida-contractors.json` |
| `ingest:fedregister-fl` | `ingest-fedregister-florida.ts` | `data/fedregister/florida-documents.json` |
| `ingest:courts-fl` | `ingest-courtlistener-florida.ts` | `data/courts/florida-cases.json` |
| `ingest:bls-fl` | `ingest-bls-florida.ts` | `data/bls/florida-employment.json` |
| `ingest:fldoe-fl` | `ingest-fldoe-finance-florida.ts` | `data/fldoe/florida-education-finance.json` |
| `ingest:govinfo-fl` | `ingest-govinfo-florida.ts` | `data/govinfo/florida-records.json` |
| `ingest:secedgar-fl` | `ingest-secedgar-florida.ts` | `data/secedgar/florida-filings.json` |
| `ingest:voteview-fl` | `ingest-voteview-florida.ts` | `data/voteview/florida-ideology.json` |
| `ingest:fllobbyist-fl` | `ingest-fllobbyist-florida.ts` | `data/fllobbyist/florida-registrations.json` |
| `ingest:gdelt-fl` | `ingest-gdelt-florida.ts` | `data/gdelt/florida-news.json` |

## UI slice accessors

| Slice module | Panel |
|--------------|-------|
| `lib/data/slices/legislationFlorida.ts` | FL state legislation (LegiScan) |
| `lib/data/slices/lobbyingFllobbyist.ts` | FL lobbying registrations |
| `lib/data/slices/financeFldoe.ts` | FL education finance |
| `lib/data/slices/judiciaryCourts.ts` | FL federal court records |
| `lib/data/slices/filingsSecedgar.ts` | SEC EDGAR filings |
| `lib/data/slices/stateEconomic.ts` | FL economic indicators (BLS, Census) |
| `lib/data/slices/voteview.ts` | DW-NOMINATE ideology (national, keyed by bioguideId) |

Rebuild slices after ingest: `npm run build:data-slices`

## Scheduled refresh

`.github/workflows/refresh-data.yml` runs Florida ingest on schedule (see workflow for cadence).

## Shared utilities

Florida scripts import from `scripts/lib/ingest-utils.ts` (`writeFloridaSnapshot`, `fetchJson`, etc.).
