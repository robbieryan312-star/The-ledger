# The Ledger — Progress Log

**Last updated:** 2026-06-30
**Branch:** `main`
**Live demo:** https://the-ledger-gamma.vercel.app

---

## Current phase

**Phase 16 complete (537/537 member deep ingest). Phase 17 next: full-profile pilot on S000033.**

Said→Did live for 442/537 via Ballotpedia + roll-call votes. VoteSmart deferred. Source catalog: `lib/data/sourceCatalog.ts` + `lib/data/SOURCE_LOOKUP.md`.

---

## Completed log

| Date | Phase | Task | Commit |
|------|-------|------|--------|
| 2026-06-30 | Phase 16 | Cosponsor ingest optimization (early-stop, retry, no broken sort); 537/537 deep JSON + manifest; topicAliases panel fix | `1b8a4a0`, `5d76c86` |
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
| Phase 17 pilot (S000033) | Next — GovInfo CREC Said + FEC Schedule A org→topic votes; see `PILOT_PROFILE_CHECKLIST` |

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
