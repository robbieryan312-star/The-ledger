# The Ledger — Progress Log

**Last updated:** 2026-06-28
**Branch:** `phase-5-national-wiring`
**Live demo:** https://the-ledger-gamma.vercel.app

---

## Current phase

**National coverage complete. Next: SSR conversion + quote layer.**

All 537 Congress members have integrated votes, FEC finance, and GDELT news. GitHub Actions secrets are pushed — live demo auto-refreshes. Build passes. The core product feature (verbatim "Said → Did" quote layer) is the next priority.

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
| 2026-06-28 | Phase 10 | Banner truncation, guard comment on countProfilesWithTopicRecord | (uncommitted) |
| 2026-06-28 | — | GitHub Actions secrets pushed via `setup-github-secrets.sh` — live auto-refresh unlocked | — |

---

## Active work

| Item | Status |
|------|--------|
| `sync:news-national` | Running — estimated completion ~107 min from start |
| Phase 10 fixes | Uncommitted — commit after sync confirms |
| `MemberNewsPanel` wiring | Uncommitted — part of Brief 2 |

---

## Architecture debt (flagged, not yet scheduled)

| Item | Impact |
|------|--------|
| `app/politicians/[id]/page.tsx` is `'use client'` | Individual profiles not crawler-visible — critical for "Beat Google" goal |
| `/lobbying`, `/elections` show mock data | Credibility risk — need disclaimers or real data pipeline |
| Nav sub-links "Lobbyist Tracker", "PACs & Advocacy", "Election Calendar" point to unbuilt views | Silent broken navigation |

---

## Next priorities (in order)

1. **Commit Phase 10 + Brief 2 results** after sync completes and build passes
2. **"Said → Did" verbatim quote layer** — wire verbatim journalism quotes into Track Record tab for featured profiles; this is the core product differentiator
3. **SSR conversion** — convert `app/politicians/[id]/page.tsx` from `'use client'` to server component shell with client sub-components
4. **Mock data disclaimers** — add visible banners to `/lobbying` and `/elections` until real pipelines replace them
5. **Fix broken nav sub-links** — remove or route correctly

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
