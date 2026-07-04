# The Ledger — Progress Log

**Last updated:** 2026-07-03
**Branch:** `main`
**Live demo:** https://the-ledger-gamma.vercel.app

---

## Current phase

**Phase 17b batch #1 (6 migrated profiles) locked: S000033, O000172, M000355, M001184,
W000817, C001098. Next: scale the same per-destination pipeline to the remaining 531 members.**

Batch #1 status (2026-07-03, local commits `fafcc3e`…`f0390ca`, not yet pushed):
- Gendered-honorific CREC bug fixed (Senate search + opener regex were male-only, silently
  zeroing ~28% of Congress) — verified on female members, regression fixture added.
- CREC search decoupled search-pool (150, paginated, congress 119+118) from the 12-statement
  display cap; topic classifier moved from substring `includes()` to word-boundary + weighted
  bucket scoring (`scoreTopicBuckets`) to kill false-positive topic hits (e.g. "price of" → ICE).
- Said→Did pairing now requires `saidDidSubjectsOverlap()` — cross-topic false pairs (e.g.
  Warren tax statement ↔ War Powers vote) dropped; guard added to `test:source-integrity`
  to reject subject-mismatched pairs permanently (append-only fixture).
- Display pipeline centralized in `lib/data/displaySummary.ts` (`leadSummary`, abbreviation-aware
  sentence segmentation) + `lib/data/htmlEntities.ts` — fixed the "Mr./Ms." truncation bug and
  undecoded `&#160;`-style entities leaking into Key Issues summaries.
  `positions.json` purged of vote-restatement tautologies; new `validatePlatformPositionsFile`
  guard added to `test:source-integrity` (41/41 green as of this update).
- `scripts/reprocess-profiles.ts` added to backfill parsing/classification fixes into already-
  collected data without re-fetching from external APIs.
- News pipeline (`scripts/sync-profile-news.ts`, GDELT) run for all 6 profiles: W000817 has 1
  verified article; S000033 has 1; the other 4 profiles verified zero relevant results
  (`news: honest-gap`, not `fetch-blocked` — GDELT rate-limit cleared and was re-queried).
- 2026-07-03 cleanup: fixed a residual topic misclassification (Cruz's Ganjei judicial-
  confirmation floor remark was filed under `education` on an incidental "public school
  teacher" biographical mention outweighing the actual `civil-liberties` keywords — added
  `district judge`/`circuit judge` to the civil-liberties keyword list and refiled it).
  Also resolved a long-standing `[OWNER TO CONFIRM]` flag in `ledger-core-rules.mdc` re: news
  corroboration threshold — kept the platform-wide 2+ source standard rather than a
  news-specific 1-source carve-out (credibility-tradeoff decision, not a visual/UX one).

Phase 17a (S000033 pilot) verified 2026-06-30: CREC boilerplate filter live; zero procedural
boilerplate, zero dupes, per `PILOT_PROFILE_CHECKLIST.md` Said rule. Single always-read
ruleset: `.cursor/rules/ledger-core-rules.mdc` (binds Claude Code + all Cursor agents).

Said→Did live for 442/537 via Ballotpedia + roll-call votes. VoteSmart deferred. Source catalog: `lib/data/sourceCatalog.ts` + `lib/data/SOURCE_LOOKUP.md`.

---

## Completed log

| Date | Phase | Task | Commit |
|------|-------|------|--------|
| 2026-06-30 | Phase 17a | S000033 pilot: GovInfo CREC Said, org→vote topic joins, PILOT_PROFILE_CHECKLIST | pending |
| 2026-06-24 | — | In-page data slices: finance, profiles, legislation, map, lobbying, news + `/sources` explorer | `608332c` |
| 2026-06-24 | — | Florida ingestion pipeline (17+ sources) + auto-refresh workflow | `51b7896` |
| 2026-06-24 | — | Florida Congress votes — 29/29 members, 232 positions | `243ad02` |
| 2026-06-24 | — | UX: donor split, map labels, Follow-the-Money leaderboard, StockTrades time range | `cb58ace` |
| 2026-06-24 | Phase 5 | National vote + finance merge into generated profiles (553 votes / 238 finance) | `462ee94` |
| 2026-06-25 | Phase 6 | FEC national coverage raised to 527/537 via fecIds dataset; rate-limit backoff | `863ca06` |
| 2026-06-25 | Phase 7 | Honest empty states: DonorChart, ConsistencyScore; isDisplayableFecEntry guard | `57311f1`, `863ca06` |
| 2026-06-28 | Phase 8/9a | Topic record panel (537/537 members), FL member news, self-hosted Inter font | `32c3fba` |
| 2026-06-29 | Phase 10 | Deep profile pilot (S000033), positions sync scripts, rule file updates | `0bf2468` |
| 2026-06-29 | Phase 11 | SSR conversion — politician profile page now server-rendered | `a2d76ee` |
| 2026-06-29 | Phase 12 | Said → Did panel component — wired into Track Record tab | `b48b205` |
| 2026-06-29 | Phase 13 | Mock data disclaimers on /lobbying and /elections | `830a25d` |
| 2026-06-29 | Phase 14 | Remove broken nav sub-links (Lobbyist Tracker, PACs & Advocacy, Election Calendar) | `376aff9` |
| 2026-06-29 | Phase 15a | Topic panel hierarchy — stated positions first, legislation collapsed last | `8cd4c0f` |
| 2026-06-29 | Phase 15b | Ballotpedia platform positions + Said→Did vote correlation (442 members) | `56a8cd2` |
| 2026-06-28 | — | GitHub Actions secrets pushed via `setup-github-secrets.sh` — live auto-refresh unlocked | — |

---

## Active work

| Item | Status |
|------|--------|
| Phase 16: Member deep ingest `--all` | **Done** — 537/537 checkpointed; manifest + JSON on disk |
| Phase 17 pilot (S000033) | **Done (17a)** — CREC Said + org→vote join + checklist; see `PILOT_PROFILE_CHECKLIST.md` |

---

## Architecture debt (flagged, not yet scheduled)

| Item | Impact |
|------|--------|
| `membersWithStatedPosition: 0` in topicPositions.json | Expected — VoteSmart deferred; wire GovInfo CREC + Ballotpedia |
| `lib/data/generated/members/` | **537/537** — PR #6 merged; checkpoint matches disk |
| Phase 17 org→vote join | Schedule A exists; needs org registry + topic match (not index-paired rows) |

---

## Next priorities (in order)

1. **Phase 17a — S000033 full profile pilot** — GovInfo CREC statements + FEC Schedule A org registry + topic-vote donor context (see `SOURCE_LOOKUP.md`)
2. **Phase 17b — Scale donor/org joins to 537** — same pipelines with checkpointing

---

## Blockers

| Item | Status |
|------|--------|
| VoteSmart NPAT | Deferred — use Ballotpedia + GovInfo CREC (`SOURCE_LOOKUP.md`) |
| OpenSecrets API | Deferred — FEC Schedule A for Phase 17 donor/org data |
| Senate eFD stock trades | HTTP 503 maintenance — House PTR proceeds |
| FARA eFile | Fetch blocked — documented honestly in UI |
| SAM.gov | login.gov identity verification required |
| NewsAPI | 426 plan restriction — using GDELT instead |

---

## Registered no-key endpoints (`.env.local`)

| Variable | URL |
|----------|-----|
| `FARA_ENDPOINT` | https://efts.fara.justice.gov/motd-search/api/documents |
| `USASPENDING_ENDPOINT` | https://api.usaspending.gov/api/v2 |
| `GOVTRACK_ENDPOINT` | https://www.govtrack.us/api/v2 |
| `SENATE_LDA_ENDPOINT` | https://lda.senate.gov/api/v1 |
| `HOUSE_DISCLOSURES_URL` | https://disclosures.house.gov/public_disc/financial-pdfs |
| `SENATE_DISCLOSURES_URL` | https://efts.senate.gov/LATEST/search-index |
| `CENSUS_ENDPOINT` | https://api.census.gov/data |
| `GDELT_ENDPOINT` | https://api.gdeltproject.org/api/v2 |
| `MIT_ELECTIONS_URL` | https://electionlab.mit.edu/data |
| `OPENCORPORATES_ENDPOINT` | https://api.opencorporates.com/v0.4 |
