# Pilot state checklist — Florida (`FL`) reference

**Pilot state:** `FL` (Florida) — `/states/FL`  
**Purpose:** Define what a *complete* Ledger state profile requires before scaling the state
pipeline to other states using the same per-conduit ladder (`docs/workflows/DUAL_REFERENCE_ROADMAP.md`).

Honest gaps are required — never fill with paraphrase or fabrication. Provenance must be
`fetched-live`, `computed-from-published-tables`, or `honest-gap` (see `unverifiedOfficialDataGuard`).

**Presentation:** Owner visual sign-off **LOCKED** 2026-07-19 — UI changes need new owner direction.

**Source routing:** FL-local journalists → `docs/sources/florida/media.md`. FL-native agencies →
`docs/sources/florida/agencies.md`. Keys + multi-state vendors → `OBJECTIVE_SOURCES.md` +
`docs/FLORIDA_DATA.md` (never in state source sub-files).

---

## Required data conduits

| # | Data need | Source (tier) | Destination view | Sync / build | FL status (2026-07-19) |
|---|-----------|---------------|------------------|--------------|------------------------|
| 1 | State economic indicators | Census ACS + BLS LAUS (`official`) | By the Numbers cards | `ingest:fl-counties`, `ingest:fl-state-rankings`, BLS ingests, `build:data-slices` | **filled** — 67 counties; ranks keyed when `CENSUS_API_KEY` set |
| 2 | Cost of living / RPP | BEA via FRED mirror (`official`) | COL card | `ingest:bea-rpp-fl` | **filled** or honest-gap on fetch fail (preserve prior) |
| 3 | State tax burden | Tax Foundation tables (`nonpartisan`) | Taxes card | `ingest:fl-tax` | **computed-from-published-tables** |
| 4 | Federal delegation roster | `allPoliticians` + office resolution | Officials section | `sync:legislators`, `verify:office` | **filled** |
| 5 | State legislation | LegiScan (`official`) | Legislation panel | `ingest:legiscan-fl` | **sample committed** — 10 bills in `legislation-florida.json`; live refresh needs `LEGISCAN_API_KEY` |
| 6 | State courts | CourtListener (`nonpartisan`) | Courts panel | `ingest:courts-fl` | **filled** / thin with note |
| 7 | State legislators | OpenStates (`nonpartisan`) | (future panel) | `ingest:openstates-fl` | **honest-gap** without key |
| 8 | State political news | NewsAPI (`media`) | News bundle | `ingest:news-fl` | **sample committed** — 48 articles in `news-florida.json`; live refresh deferred (`KEYS.md`); corroborate per `'media'` tier rules |
| 9 | Federal contracts (FL) | SAM.gov (`official`) | (future) | `ingest:sam-fl` | **honest-gap** — login.gov / key |
| 10 | Federal register (FL-tagged) | GovInfo (`official`) | (future) | `ingest:govinfo-fl` | **honest-gap** without key |
| 11 | County map drilldown | Census + local `.gov` | Map explorer | *not wired* | **gap** — `USAMap` county literals empty (product decision) |
| 12 | Metro CPI / MERIC COL | BLS + state source | Supplementary cards | `ingest:bls-metro-cpi-fl`, `ingest:meric-col-fl` | **partial** — verify vintage alignment |

---

## Verification commands

```bash
npm run ingest:fl-counties -- 2>&1 | tee /tmp/ledger-fl-counties.log
npm run ingest:fl-state-rankings -- 2>&1 | tee /tmp/ledger-fl-rankings.log
npm run build:data-slices
npm run build
# Spot-check: curl -s localhost:4100/states/FL | head   # dev on non-3000 port only
```

---

## Scale checklist (per state, after FL locked)

For each state code when rolling beyond `FL`:

- [ ] State economic slice exists with provenance
- [ ] State page route in `SUPPORTED_STATE_CODES` + sitemap entry
- [ ] Keyed ingests documented in `docs/OBJECTIVE_SOURCES.md`
- [ ] Honest-gap copy for every missing keyed source
- [ ] Owner 👁 on state dashboard layout
- [ ] Conduit ladder stage recorded in `PROGRESS.md` status board
