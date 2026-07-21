# M8 — Florida county-map drilldown: Option A (owner 2026-07-20)

**Status:** Owner chose **Option A** (wire). **Reference-2 only** — Miami-Dade `12086` + Liberty `12077`.  
⛔ STOP for Claude review of the 2-county reference **before scaling to 67**.

**Implementation:** `lib/data/generated/countyMap/fl-reference-counties.json` → `lib/data/countyMap.ts` → `USAMap` / `OfficialCard`.

**Sources:** Ballotpedia (nonpartisan) primary for Miami-Dade; Liberty SOE + county.gov (official) where Ballotpedia lacked a full table; honest-gap for offices not verified.

**Canonical live URL:** https://the-ledger-main.vercel.app (sole Vercel project **`the-ledger-main`**; renamed from `the-ledger-s4dn` 2026-07-21).

---

## Defect (was)

| Field | Detail |
|-------|--------|
| **What** | County map drilldown never showed real county officials |
| **Where** | `components/map/USAMap.tsx` previously hardcoded `countyByFips = {}` |
| **Repair (this PR)** | Generated reference JSON + accessor; pending panel uses honest-gap copy |

---

## Option A — Wire county data into the map

**Intent:** Populate `countyByFips` from a real pipeline so FL (then other states) county clicks show verified officials + optional elections.

| Layer | Approach |
|-------|----------|
| Identity / FIPS | unitedstates or Census county list keyed by 5-digit FIPS |
| Demographics | Already available for FL via Census ACS slice (population, income) |
| Officials | State-native or multi-state: OpenStates / state `.gov` / SoS — **must be keyed + Wave-1 preserve** |
| Elections | Optional later; honest-gap until pipeline exists |
| UI | Keep `USAMap` + `OfficialCard`; feed props from generated JSON (`lib/data/generated/…`) |

**Effort (technical, not calendar):**

| Step | Scope |
|------|-------|
| 1 | Schema + generator: `CountyData[]` → `countyByFips` JSON keyed by FIPS | Small (~1–2 files + types) |
| 2 | FL officials ingest (OpenStates already has FL key path; may need county-office filter) | Medium (ingest + preserve + fixtures) |
| 3 | Wire `USAMap` to import generated map instead of `{}` | Small |
| 4 | Guards: empty `countyByFips` fails build if map route claims filled; honest-gap status | Small |
| 5 | Owner 👁 on FL map drilldown | Owner only |

**Risks:** Officials coverage uneven by county; OpenStates egress flakes (seen on M7b); must never invent officials.

**Acceptance if chosen:** FL map click shows ≥1 verified official OR documented `honest-gap` per county; prebuild green; no silent empty.

---

## Option B — Remove the dead county cluster

**Intent:** Delete or hide county-drilldown UI so users never hit an empty panel. Keep state-level map / economic cards.

| Change | Detail |
|--------|--------|
| Remove or gate | County click handlers, county sidebar, `OfficialCard` path when `countyByFips` empty |
| Keep | State zoom, governor fills, FL economic compact already wired |
| Docs | Checklist row 11 → permanent honest-gap / removed; Dual Reference update |

**Effort:** Small — UI trim + inventory/docs + guard that county panel cannot render empty literals as if live.

**Risks:** Owner may later want county depth (Option A redo). Prefer soft-hide (`if (!hasCountyData) disable click`) over hard-delete if reuse is likely.

**Acceptance if chosen:** No county click affordance (or explicit “No verified county record” without fake panel); prebuild green; inventory no longer claims live county drilldown.

---

## Recommendation frame (not a decision)

| If owner priority is… | Prefer |
|-----------------------|--------|
| Ship FL lock without map work | **B** (remove/hide) |
| County civic utility for FL voters | **A** (wire, start FL-only) |

**Cursor will build neither until OWNER picks A or B.**

---

## Owner decision needed

Reply with **A**, **B**, or **A-FL-only then scale** (subset of A). Claude issues the implementer brief after that.
