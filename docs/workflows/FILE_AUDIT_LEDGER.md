# File audit ledger

Master checklist for the Sync & Code Optimization Program. Update status in the same commit as each review or fix.

**Inventory source:** `data/reports/file-inventory.json` (regenerate via `npm run audit:inventory`)

## Checklist keys

| Key | Meaning |
|-----|---------|
| R | Read path — consumers wired correctly |
| W | Write path — output matches SOURCE_LOOKUP / dataPaths |
| T | Tests or build-gated guards cover this file |
| §6 | Failed fetch never overwrites prior good data |
| D | Docs cite correct npm scripts and paths |
| C | Client-bundle safe (no runtime import of generated JSON) |

## Status values

`pending` | `reviewed` | `fixed` | `waived`

---

## L1 — `scripts/lib/` (shared infra)

| File | R | W | T | §6 | D | C | Status |
|------|---|---|---|----|---|---|--------|
| `scripts/lib/dataPaths.ts` | | | | | | | pending |
| `scripts/lib/resilientFetch.ts` | | | | | | | pending |
| `scripts/lib/syncKernel.ts` | | | | | | | pending |
| `scripts/lib/syncLock.ts` | | | | | | | pending |
| `scripts/lib/ingest-utils.ts` | | | | | | | pending |
| `scripts/lib/profileMigrate.ts` | | | | | | | pending |
| `scripts/lib/profileReprocess.ts` | | | | | | | pending |
| `scripts/lib/crecProceduralFilter.ts` | | | | | | | pending |
| `scripts/lib/crecOpener.ts` | | | | | | | pending |
| `scripts/lib/approvedMediaQuotes.ts` | | | | | | | pending |
| `scripts/lib/articleVerificationCache.ts` | | | | | | | pending |

## L2 — `lib/data/` accessors

See `file-inventory.json` → `layers.L2` for the full list. High-priority first:

| File | Status |
|------|--------|
| `lib/data/memberProfile.ts` | pending |
| `lib/data/topicPositions.ts` | pending |
| `lib/data/sourceIntegrity.ts` | pending |
| `lib/data/buildSaidDidDiffs.ts` | pending |
| `lib/data/congressClient.ts` | pending |
| `lib/data/fecClient.ts` | pending |
| `lib/data/nationalCongressVotes.ts` | pending |
| `lib/data/nationalFecFinance.ts` | pending |

## L3 — Sync & profile scripts

| File | Status |
|------|--------|
| `scripts/sync-votes-national.ts` | pending |
| `scripts/sync-fec-national.ts` | pending |
| `scripts/sync-stock-trades.ts` | pending |
| `scripts/sync-topic-positions.ts` | pending |
| `scripts/sync-legislation.ts` | pending |
| `scripts/sync-news-national.ts` | pending |
| `scripts/sync-news-rss.ts` | pending |
| `scripts/sync-legislators.ts` | pending |
| `scripts/profile-build.ts` | pending |
| `scripts/reprocess-profiles.ts` | pending |

## L4 — Florida ingest

All files under `scripts/ingest/florida/` — see inventory `layers.L4`.

## L5–L8

Process after L1–L4 complete. See inventory layers L5 (components/politicians), L6 (app), L7 (components), L8 (tests).

---

## Wave progress

| Wave | State |
|------|-------|
| W0 Audit infra | in progress |
| W1 Sync kernel | pending |
| W2 Organization | pending |
| W3 File review | pending |
| W4 Guards | pending |
| W5 Collection tuning | pending |
