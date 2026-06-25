# The Ledger — Progress Log

**Last updated:** 2026-06-24  
**Branch:** `main`  
**Live demo:** https://the-ledger-gamma.vercel.app

---

## Current phase

**Sprint 1 — National depth + Follow the Money v1 (in progress)**

- ✅ ~21 Florida data sources ingested; `/sources` explorer; in-page slices on finance, profiles, legislation, map, lobbying
- ✅ Daily GitHub Actions refresh for no-key ingests + data slices
- 🔄 **Sprint 1:** National FEC/votes sync for all 537 Congress members; FL profile depth; Follow the Money v1; House PTR for full House roster
- ⏳ **GitHub Actions secrets:** `scripts/setup-github-secrets.sh` ready — requires `gh auth login` once, then run script (blocked: gh not authenticated in agent shell)

---

## Completed log

| Date | Task | Commit |
|------|------|--------|
| 2026-06-24 | In-page data slices: finance, profiles, legislation, map, lobbying, news + `/sources` explorer | `608332c` |
| 2026-06-24 | Florida ingestion pipeline (17+ sources) + auto-refresh workflow | `51b7896` |
| 2026-06-24 | Florida Congress votes — 29/29 members, 232 positions | `243ad02` |
| 2026-06-24 | UX: donor split, map labels, Follow-the-Money leaderboard, StockTrades time range | `cb58ace` |
| 2026-06-24 | API keys wired: Census, LegiScan, OpenStates, NewsAPI, DATA_GOV | (session) |

---

## Sprint 1 step status

| Step | Status | Notes |
|------|--------|-------|
| 1 GitHub secrets | ⏳ Blocked | Run `gh auth login` then `./scripts/setup-github-secrets.sh` |
| 2 Update docs | ✅ | PROGRESS.md + DATA_INTEGRATION_PLAN.md |
| 3 National FEC sync | ✅ Done | 222 members with FEC totals → `data/fec/national/congress-finance.json` |
| 4 National votes sync | ✅ Done | 537/537 members, 5,370 positions → `data/votes/national/congress-votes.json` |
| 5 FL federal depth | ✅ Code | Merge by `bioguideId` — lightweight FL members get real FEC + votes |
| 6 Follow the Money v1 | ✅ Code | Schedule A + donor/vote linkage panel; domestic/foreign lobbying labels |
| 7 House STOCK Act PTR | ✅ Code | Extended `sync:stock-trades` to full House roster (Senate eFD still down) |

---

## Blockers

| Item | Status |
|------|--------|
| GitHub Actions secrets | Needs `gh auth login` on owner machine, then `scripts/setup-github-secrets.sh` |
| Senate eFD stock trades | HTTP 503 maintenance — House PTR sync proceeds |
| FARA eFile | Fetch blocked — domestic/foreign labels documented honestly in UI |
| SAM.gov | login.gov identity verification required |

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
