# Florida — state-specific sources

**Scope:** Florida-local media outlets and state agencies. National wire/national outlets live in
[`docs/OBJECTIVE_SOURCES.md`](../OBJECTIVE_SOURCES.md) only — do not duplicate them here.

**Routing (commands, destinations, fallback order):** [`docs/AGENT_INDEX.md`](../AGENT_INDEX.md) §3 ·
[`lib/data/SOURCE_LOOKUP.md`](../../lib/data/SOURCE_LOOKUP.md).

**Ingest scripts & slice outputs:** [`docs/FLORIDA_DATA.md`](../FLORIDA_DATA.md).

---

## Local media (Florida)

Used by the approved-outlet RSS registry (`lib/data/newsFeedRegistry.ts`) when syncing Florida
politician news via `npm run sync:news-rss`. Same tier/corroboration rules as national media.

| Outlet | Tier | Feed | Status |
|--------|------|------|--------|
| Miami Herald | `media` | miamiherald.com politics RSS | active |
| Tampa Bay Times | `media` | tampabay.com Arc RSS | active |
| Florida Phoenix | `media` | floridaphoenix.com/feed | active |
| Sun Sentinel | `media` | sun-sentinel.com Arc politics RSS | feed unavailable (HTML not XML) |
| Orlando Sentinel | `media` | orlandosentinel.com Arc politics RSS | feed unavailable (timeout) |
| WUSF | `media` | wusf.org politics | feed unavailable (404) |
| WLRN | `media` | wlrn.org politics | feed unavailable (timeout) |

**News path for FL politician profiles:** **RSS primary** (`sync:news-rss`) → **GDELT secondary**
(`sync:news-rss` / `sync:news-national`) → **NewsAPI tertiary** only if `NEWSAPI_KEY` plan is
upgraded (426-limited today). See AGENT_INDEX §3 — not `ingest:news-fl` for profile News tabs.

---

## State agencies & official data

| Source | Tier | Env var | Command | Output |
|--------|------|---------|---------|--------|
| Florida Division of Elections / FLDOE campaign finance | `official` | — | `ingest:fldoe-fl` | `data/florida/fldoe/` |
| LegiScan (FL state bills) | `nonpartisan` | `LEGISCAN_API_KEY` | `ingest:legiscan-fl` | `data/florida/legiscan/` |
| Open States (FL legislators) | `nonpartisan` | `OPENSTATES_API_KEY` | `ingest:openstates-fl` | `data/florida/openstates/` |
| Census ACS (FL counties + state rankings) | `official` | `CENSUS_API_KEY` (keyless fallback) | `ingest:fl-counties`, `ingest:fl-state-rankings` | `data/florida/census/` |
| BLS LAUS / CPS / metro CPI (FL) | `official` | optional `BLS_API_KEY` | `ingest:bls-*` | `data/florida/bls/` |
| BEA Regional Price Parities (FL) | `official` | `BEA_API_KEY` (FRED fallback) | `ingest:bea-rpp-fl` | `data/florida/bea/` |
| CourtListener (FL opinions) | `nonpartisan` | optional `COURTLISTENER_API_KEY` | `ingest:courts-fl` | `data/florida/courts/` |
| myflorida.gov / state .gov portraits | `official` | — | office resolution + ingest roster | see `FLORIDA_DATA.md` |

Full script table: [`docs/FLORIDA_DATA.md`](../FLORIDA_DATA.md).

---

## Florida news snapshot (pipeline only — not profile News tab)

`npm run ingest:news-fl` writes `data/florida/news/florida-coverage.json` via NewsAPI when
`NEWSAPI_KEY` is SET. This is a **raw FL snapshot** for slices/pipeline review — **not** the primary
path for politician profile News tabs (`profiles/{id}/news.json`). Profile news uses the national
RSS → GDELT → NewsAPI order in AGENT_INDEX §3.

---

*Template for other states: copy this file to `docs/sources/<state>.md` as coverage scales.*
