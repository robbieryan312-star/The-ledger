# The Ledger — Progress Log

**Last updated:** 2026-06-29
**Branch:** `phase-5-national-wiring`
**Live demo:** https://the-ledger-gamma.vercel.app

---

## Current phase

**Phases 10–15 complete. Phase 16 in progress — member deep ingest scaling.**

Said→Did panel wired with Ballotpedia platform positions + vote links (428/537 members). Topic panel shows platform positions first, votes second, legislation collapsed last. Phase 16 adds `--all` ingest with checkpointing and dynamic member file loading.

---

## Completed log

| Date | Phase | Task | Commit |
|------|-------|------|--------|
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
| Phase 16: Member deep ingest `--all` | In progress — script + dynamic loader done; full 537 run pending |
| VoteSmart NPAT re-sync | Blocked locally — `VOTESMART_API_KEY` not in agent env; re-run when key present |

---

## Architecture debt (flagged, not yet scheduled)

| Item | Impact |
|------|--------|
| `membersWithStatedPosition: 0` in topicPositions.json | VoteSmart NPAT skipped — needs re-run with key |
| `lib/data/generated/members/` has only S000033 | Full `--all` ingest not yet run |
| `memberPositions.json` has hollow GovInfo data | Same statements for every member — discard and replace |

---

## Next priorities (in order)

1. **Phase 16 — Run `npm run ingest:member-all`** — generate all 537 `lib/data/generated/members/{bioguideId}.json` files (checkpointed, resumable)
2. **Phase 15c — VoteSmart NPAT re-sync** — clear `/tmp/sync-topic-positions-checkpoint.json`, re-run with `VOTESMART_API_KEY` set
3. **Phase 17 — Donor sector breakdown** — FEC sector data per topic; show "Funded by healthcare industry: $X" next to vote summary

---

## Blockers

| Item | Status |
|------|--------|
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
