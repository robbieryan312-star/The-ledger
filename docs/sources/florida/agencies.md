# Florida — state-native information providers

**Scope:** Florida-specific official records and state-hosted data providers only — agencies,
portals, and published tables that exist **because Florida publishes them**. These are not API keys;
they are **who** to trust for FL-native facts.

**Parent index:** [`docs/sources/florida.md`](../florida.md)

**Pipeline wiring (commands, env vars, output paths):** [`docs/FLORIDA_DATA.md`](../../FLORIDA_DATA.md)
and [`lib/data/SOURCE_LOOKUP.md`](../../../lib/data/SOURCE_LOOKUP.md). Multi-state vendors
(LegiScan, OpenStates, Census, BLS, BEA, CourtListener, NewsAPI, etc.) are **never** listed here —
they live in `docs/OBJECTIVE_SOURCES.md` (key matrix) and the ingest script that consumes them.

---

## State official sources

| Provider | Tier | What it provides | Ingest script | Output (see FLORIDA_DATA) |
|----------|------|------------------|---------------|---------------------------|
| Florida Division of Elections / FLDOE | `official` | State campaign finance filings | `ingest:fldoe-fl` | `data/florida/fldoe/` |
| myflorida.gov / state `.gov` portals | `official` | Governor portraits, state agency pages | office resolution + roster ingest | see `FLORIDA_DATA.md` |
| Florida lobbyist firm directories | `official` | State lobbying firm listings | `ingest:fllobbyist-fl` | `data/florida/fllobbyist/` |
| Tax Foundation — Florida published tables | `nonpartisan` | State tax burden (computed from published tables) | `ingest:fl-tax` | `data/florida/tax/` |

---

## What does NOT belong in this file

| Item | Where it lives instead |
|------|------------------------|
| `LEGISCAN_API_KEY`, `OPENSTATES_API_KEY`, `CENSUS_API_KEY`, etc. | `KEYS.md` + `docs/OBJECTIVE_SOURCES.md` key matrix |
| LegiScan, OpenStates, Census ACS, BLS, BEA, CourtListener | Multi-state vendors — `OBJECTIVE_SOURCES.md` + `FLORIDA_DATA.md` script table |
| NewsAPI / GDELT | National retrieval path — `AGENT_INDEX.md` §3 + `SOURCE_LOOKUP.md` |
| Federal FEC / Congress.gov (FL-filtered extracts) | National keys + `ingest:*-fl` rows in `FLORIDA_DATA.md` only |

---

## Collection rules (binding)

1. Read **this file** for FL-native **who**; read **`FLORIDA_DATA.md`** for **how** (command + destination).
2. One destination view per pipeline output — no parallel JSON for the same UI section.
3. Honest gaps when a state portal is down — never silent empty; preserve prior good snapshots.

---

*Template for other states: `docs/sources/<state>/agencies.md`*
