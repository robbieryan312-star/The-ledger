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
| `scripts/lib/dataPaths.ts` | | | | | | | reviewed |
| `scripts/lib/resilientFetch.ts` | | | | | | | reviewed |
| `scripts/lib/syncKernel.ts` | | | | | | | reviewed |
| `scripts/lib/syncLock.ts` | | | | | | | reviewed |
| `scripts/lib/ingest-utils.ts` | | | | | | | reviewed |
| `scripts/lib/profileMigrate.ts` | | | | | | | reviewed |
| `scripts/lib/profileReprocess.ts` | | | | | | | reviewed |
| `scripts/lib/crecProceduralFilter.ts` | | | | | | | reviewed |
| `scripts/lib/crecOpener.ts` | | | | | | | reviewed |
| `scripts/lib/approvedMediaQuotes.ts` | | | | | | | reviewed |
| `scripts/lib/articleVerificationCache.ts` | | | | | | | reviewed |

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
| W0 Audit infra | ✅ complete |
| W1 Sync kernel | ✅ complete |
| W2 Organization | W2A committed; W2B–D landing in commit 1 |
| W3 File review | L1 only (11/175 files) |
| W4 Guards | optimization suite landing; tsc + syncKernelGuard in commit 2 |
| W5 Collection tuning | profile:build --validate-only landing |
