# State & County Official Expansion — Proposal

**Status:** Awaiting owner approval. Do **not** implement Phase 2 or 3 until each checkpoint below is explicitly approved.

**Context:** Phase 1 (federal Congress + governors) is live and verified. This document proposes how to extend coverage without fabricating local records or bulk mock data.

---

## Phase 1 — Current (continue)

| Scope | Source | Status |
|-------|--------|--------|
| 537 Congress members | `unitedstates/congress-legislators` (Tier 1 / official-derived) | Live — `npm run sync:legislators` |
| 50 governors | NGA roster + state `.gov` cross-check (Tier 2) | Live — `lib/data/governors.ts` |
| 17 featured profiles | Hand-authored depth + real sync overlays | In progress |
| FEC / votes / stock trades | OpenFEC, Congress.gov, senate.gov, House/Senate eFD | Partial — see audit |

**Continue:** Deepen featured profiles with sourced said/did diffs, official vote/trade overlays, honest gaps elsewhere. Run sync + `verify:office` after data changes.

---

## Phase 2 — Top statewide officials (proposed)

**Goal:** Add sitting **lieutenant governor, attorney general, secretary of state**, and comparable top statewide roles where state `.gov` publishes a current roster.

**Pattern:** Reuse `officeResolution.ts` — authoritative roster → `OfficeRecord` → recency-weighted current label. Same tier badges and “former office” negative resolution as Congress.

**Pilot:** Florida first.

| Role | Primary source (Tier 1) |
|------|-------------------------|
| Governor | `flgov.com` (already in Phase 1) |
| Lt. Gov. | [Florida Governor's Office](https://www.flgov.com) / cabinet pages |
| Attorney General | [myfloridalegal.com](https://www.myfloridalegal.com) |
| Secretary of State | [dos.fl.gov](https://dos.fl.gov) |
| CFO / Agriculture Commissioner | `myfloridacfo.com`, `fdacs.gov` |

**Scale:** After FL proof — one sync script per state or a shared `stateRosters/` module; only states with machine-readable or stable HTML rosters. States without verified feeds get **no profile** (not guessed names).

**Effort estimate:** ~1–2 weeks FL pilot (roster sync + 5–8 lightweight profiles + resolver tests); ~2–4 weeks per additional state at steady pace; national 50-state pass is a multi-month program, not a sprint.

**Owner checkpoint:** Approve FL pilot scope and which offices to include before any statewide roster code ships.

---

## Phase 3 — County officials (proposed)

**Goal:** County sheriffs, commissioners, and similar — **only** where a verified state or county `.gov` pipeline exists.

**We will NOT:**

- Hand-write a national county politician mock roster.
- Present demo templates as if they were official records.
- Infer current office from news or social media without Tier 1/2 corroboration.

**Two-track UI:**

| Track | When | User sees |
|-------|------|-----------|
| **(a) Honest gap** | Most counties (~3,000+) | “Local data not integrated” — county FIPS, state link, no fabricated officials |
| **(b) Verified pilot** | Counties with working pipeline | Rich profile like featured federal — clearly labeled **official** vs **demo template** |

**Pilot county:** Palm Beach, FL — [pbcgov.org](https://www.pbcgov.org) / FL Division of Elections where applicable. Existing Palm Beach sheriff template stays **demo-labeled** until county sync exists.

**Effort estimate:** ~2–3 weeks for Palm Beach proof (scrape/API design + 3–5 offices + tests); national county coverage is **out of scope** without a dedicated data vendor or state aggregation partnership.

**Owner checkpoint:** Approve Palm Beach pilot **or** defer county work entirely until Phase 2 is stable in ≥3 states.

---

## Data sources summary

| Tier | Examples |
|------|----------|
| 1 — Official `.gov` | `florida.gov`, `flgov.com`, `dos.fl.gov`, county `*.gov` sites, FEC, Congress.gov |
| 2 — Nonpartisan | NGA governors roster, `unitedstates/congress-legislators` |
| 3 — Journalism | AP, local papers — corroboration only, flagged |
| 4 — Speculative | Never for current office |

Every integrated fact: **date, tier, link, as-of / checked date.**

---

## Decision checkpoints (owner YES required)

1. **Phase 2 start** — FL statewide officials pilot approved?
2. **Phase 2 scale** — Which states after FL, and which offices per state?
3. **Phase 3 start** — Palm Beach county pilot approved, or keep county UI as honest gap only?
4. **Credibility tradeoffs** — Any Tier 3/4 content allowed on state/county profiles? (Default: no for structural facts.)

---

## Recommended sequence

1. Finish Phase 1 featured depth + Senate PTR sync when eFD maintenance ends.
2. Owner reviews this doc → YES on Phase 2 FL pilot.
3. Ship FL statewide roster + lightweight profiles + `verify:state-office` script.
4. Revisit Phase 3 only after Phase 2 resolver is proven in production.

*Last updated: 2026-06-24 — session audit + proposal draft.*
