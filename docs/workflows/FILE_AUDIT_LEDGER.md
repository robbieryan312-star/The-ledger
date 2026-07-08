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
| `scripts/lib/profileDisplayIdentity.ts` | | | | | | | reviewed |

## L2 — `lib/data/` accessors (high-priority)

| File | Status | Notes |
|------|--------|-------|
| `lib/data/memberProfile.ts` | reviewed | Manifest-driven via `profiles/index.ts`; migrated bioguides never read mega-bundle for profile categories |
| `lib/data/topicPositions.ts` | reviewed | `getMemberTopicPositions` prefers `getMemberProfileTopicPositions` |
| `lib/data/sourceIntegrity.ts` | reviewed | Build-gated via `test:source-integrity` |
| `lib/data/buildSaidDidDiffs.ts` | reviewed | Subject-match + prune guards |
| `lib/data/congressClient.ts` | reviewed | Timeout on all fetches |
| `lib/data/fecClient.ts` | reviewed | Timeout on all fetches |
| `lib/data/nationalCongressVotes.ts` | reviewed | Reads `data/national/votes/` |
| `lib/data/nationalFecFinance.ts` | reviewed | Reads `data/national/fec/` |

## L3 — Sync & profile scripts (high-priority)

| File | Status | Notes |
|------|--------|-------|
| `scripts/sync-votes-national.ts` | reviewed | syncKernel + dataPaths |
| `scripts/sync-fec-national.ts` | reviewed | syncKernel |
| `scripts/sync-stock-trades.ts` | reviewed | syncKernel + checkpoint guard |
| `scripts/sync-topic-positions.ts` | reviewed | emitSyncSummary; ingest-utils fetch |
| `scripts/sync-legislation.ts` | reviewed | syncKernel §6 preserve |
| `scripts/sync-news-national.ts` | reviewed | syncKernel |
| `scripts/sync-news-rss.ts` | reviewed | direct-run guard + `--members` |
| `scripts/sync-legislators.ts` | reviewed | No network; roster output |
| `scripts/profile-build.ts` | reviewed | `--validate-only` + depth JSON artifact |
| `scripts/reprocess-profiles.ts` | reviewed | No network reprocess |

## L4 — Florida ingest

All files under `scripts/ingest/florida/` use `AbortSignal.timeout` or `ingest-utils.fetchJson` — verified by `test:optimization` raw-fetch guard.

## L5–L8

Process after L1–L4 complete. See inventory layers L5 (components/politicians), L6 (app), L7 (components), L8 (tests).

---

## Wave progress

| Wave | State |
|------|-------|
| W0 Audit infra | ✅ complete |
| W1 Sync kernel | ✅ complete (national + topic-positions emit syncKernel summary) |
| W2 Organization | ✅ complete (W2A manifest; W2B read-path guard; W2C archive one-offs; W2D docs) |
| W3 File review | L1 + L2/L3 high-priority reviewed (22 files); L5–L8 pending scale |
| W4 Guards | ✅ complete (`test:optimization` + syncKernelGuard in prebuild/CI) |
| W5 Collection tuning | ✅ `profile:build --validate-only` + depth JSON artifact |
