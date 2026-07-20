# FL Locked-Spec Infrastructure Audit Report

**Branch reviewed:** `cursor/fl-state-locked-spec-70a6`  
**HEAD at review:** `fd63ded` · **PR #25** (draft)  
**Review date:** 2026-07-12 (Cursor chat) · **Logged to disk:** 2026-07-18  
**Mode:** Read-only — no files changed during the review turn  
**Scope:** Florida state page stack (data → guards → CI → UI → docs), with cross-cutting architecture risks

> **Access note for Claude:** This file is the durable copy of the Cursor chat-only
> audit that violated §1.1 J when first delivered. Claude Code cannot see Cursor chat —
> only files on disk. Read this document + `docs/workflows/AGENT_HANDOFF_LOG.md`.

---

## Executive summary

**Structure is approved and largely sound:** rail+canvas dashboard, six sections, SSR route shell, design tokens, county dropdowns, `SampleBadge`, and the new credibility guard are in place.

**Data credibility is materially improved** vs the placeholder blocker, but **not yet airtight.** The biggest remaining risks are:

1. **Dual data paths** — hero/rail/§01 state stats come from `state-economic.json` (slice), while county dropdowns and attainment come from `florida-counties-sample.json` (separate ingest). Different vintages and provenance models can show on one page.
2. **Guard scope is too narrow** — `test:no-unverified-official-data` covers only 3 dashboard JSON files; the slice pipeline and `stateSummary` are partially blind.
3. **Tax `fetchedLive:true` overclaims** — values are correctly computed from published IRS/Tax Foundation tables, but nothing is network-fetched; provenance semantics are misleading.
4. **BEA cost-of-living** — correctly an honest gap until `BEA_API_KEY` is set (expected P0 for the locked figure, not a code bug).
5. **Ops/doc drift** — dashboard ingests are not in `ingest:florida-all` or `refresh-data.yml`; docs say render-integrity runs postbuild but it does not.

**Verdict:** Safe to hold for Claude re-review on structure; **credibility and ops wiring need a follow-up brief** before merge to `main`.

---

## Architecture map (how data reaches `/states/FL`)

```
┌─────────────────────────────────────────────────────────────────┐
│ app/states/[code]/page.tsx (SSR server component)               │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────────┬─────────────────────┐
    ▼                 ▼                  ▼                     ▼
state-economic    counties-sample    bea-rpp-sample    tax-burden-sample
(slice)           (direct JSON)      (direct JSON)     (direct JSON)
    │                 │                  │                     │
    ▼                 │                  │                     │
build-data-slices     │                  │                     │
    │                 │                  │                     │
florida-demographics  florida-counties   florida-rpp         florida-tax
+ bls/*.json          -sample.json       -sample.json        -burden-sample.json
    │                 │                  │                     │
    └────────► FloridaStateDashboard.tsx ◄────────────────────┘
```

**Implication:** The page mixes **two ingestion architectures** — the slice compiler (`build-data-slices.ts`) and **direct JSON loaders** (`lib/data/floridaDashboard.ts`). Only the latter trio is guarded by `test:no-unverified-official-data`.

---

## Grades

| Dimension | Grade | Notes |
|-----------|-------|-------|
| **Structure / layout** | **A-** | Rail+canvas, sections, nav, SSR — approved spec largely met |
| **Data credibility** | **B** | Major placeholder blocker fixed; guard gaps, dual paths, tax semantics remain |
| **Guards / CI** | **B-** | New guard valuable but narrow; render CI good; refresh workflow weak; doc drift |
| **UI fidelity vs mockup** | **B** | Tokens mostly done; frame notes, charts, legislation rows, a11y drift |
| **Ops / docs** | **C+** | Missing ingest wiring, KEYS gaps, FLORIDA_DATA incomplete |

---

## P0 — Ship blockers / honest gaps

| ID | Area | Finding | Evidence |
|----|------|---------|----------|
| **P0-1** | BEA cost of living | **Honest gap by design** — `florida-rpp-sample.json` has `fetchedLive: false`, `state: null`. UI shows "No verified data yet." Locked spec §01 COL figure cannot ship until `BEA_API_KEY` + `ingest:bea-rpp-fl`. | `data/florida/bea/florida-rpp-sample.json` |
| **P0-2** | Merge to `main` | **Render-guard anchor conflict.** `main` uses `#economy` / `#courts`; this branch uses `#section-01`…`#section-06`. Merging without reconciling `scripts/render-integrity-check.ts` and `guards.yml` will break CI on one side. | Prior handoff + branch diff |
| **P0-3** | Census API vs brief | Brief says Census is **"KEYLESS at low volume."** In practice, `api.census.gov` returns **"Missing Key"** for county queries without a key; `ingest-florida-counties.ts` **requires** `CENSUS_API_KEY` or `DATA_GOV_API_KEY` and exits 1 without it. Committed data was keyed-fetch. **Spec/ops mismatch** — not a regression, but operators may assume keyless works. | `ingest-florida-counties.ts:45–48`; prior curl test |

---

## P1 — Wrong-shipped risk, credibility holes, CI gaps

### Data pipelines & credibility

| ID | Finding | Where | Why it matters |
|----|---------|-------|----------------|
| **D-1** | **Dual-source vintage drift on same page** | `state-economic.json` (`asOf: 2026-07-02`, pop 21,928,881, income $71,711) vs `florida-counties-sample.json` (`asOf: 2026-07-10`, live counties). Hero/rail/§01 cards use slice; county dropdowns + attainment use sample. | User sees official-tier numbers from two batches with different fetch dates. |
| **D-2** | **`stateSummary` bypasses credibility guard** | `florida-dashboard-credibility.ts:42` — when `records` exists, payload is `json.records` only; **`stateSummary.attainment`, rank, growth not audited**. | Failed B15003 fetch could write all-zero attainment with `fetchedLive: true` and guard would pass. |
| **D-3** | **Attainment partial-failure → false zeros** | `ingest-florida-counties.ts` — failed B15003 loop leaves `attainmentFromB15003({})` → 0%; still sets `fetchedLive: true`. | Violates core-rules §6 (failed fetch ≠ empty/zero). UI gates attainment on `countiesLive` and would show **0%** not honest gap. |
| **D-4** | **BLS unemployment bundled under Census `fetchedLive`** | `blsSource` is citation-only; no per-source `fetchedLive`. | Partial BLS failure invisible in meta; guard cannot distinguish. |
| **D-5** | **Tax `fetchedLive: true` with zero HTTP** | `ingest-florida-tax-burden.ts` — all values from hardcoded bracket constants; `provenance.*.fetchedLive: true`. | Passes guard but mislabels static derivation as "live fetch." Should use `derivedFromPublishedTables` or `computedAt` semantics. |
| **D-6** | **Slice path unguarded** | `state-economic.json` built from `florida-demographics.json`, `bls/*.json`, etc. — **no `fetchedLive` in slice meta** (`sliceMeta` drops it). CPI still compiled into slice (`build-data-slices.ts:317–324`) though **not shown on FL page** (good). | Placeholder/stale BLS or census in slice would ship under official tier without `test:no-unverified-official-data`. |
| **D-7** | **Dashboard ingests missing from refresh CI** | `refresh-data.yml` runs `ingest:census-fl` but **not** `ingest:fl-counties`, `ingest:bea-rpp-fl`, `ingest:fl-tax`. Also missing from `ingest:florida-all`. | Automated refresh can update state slice while county/tax/BEA samples go stale. |
| **D-8** | **BEA ingest: no `res.ok` check** | `ingest-bea-rpp-florida.ts` — parses JSON before validating HTTP status. | Opaque failures when key is set. |
| **D-9** | **Court tier mismatch** | Handoff spec: CourtListener `official`. Committed `florida-court-opinions.json` records use `tier: "nonpartisan"`. | UI `TierDot` shows wrong tier class. |

### Guards & CI

| ID | Finding | Where | Why it matters |
|----|---------|-------|----------------|
| **G-1** | **`test:render-integrity` not in postbuild** | `package.json` postbuild = `test:client-chunks` only. `AGENT_INDEX.md`, `PROGRESS.md`, test file comment claim render-integrity runs postbuild. | Local `npm run build` won't catch layout regressions; operators misled. |
| **G-2** | **`refresh-data.yml` weak guard gate** | Missing `test:no-unverified-official-data`, `test:identity-integrity`, `test:render-integrity`, `audit:profile-credibility`, and most prebuild suites. | Data PRs can land without FL credibility/render nets. |
| **G-3** | **Render integrity section coverage thin** | Required: `#section-01`, `#section-03`, `#section-04` only. §02 jobs/education, §05 legislation, §06 courts unguarded. | Section empty/overflow regressions possible. |
| **G-4** | **Render guard skips §04 images** | `assertImagesLoad` excludes `#section-04` / `#politicians`. | Broken official portraits won't fail render guard (identity guard catches bioguide cross-wire, not broken URLs). |
| **G-5** | **Render test timeout mismatch** | Test timeout 360s; `execSync` timeout 300s. | Long CI runs fail at 300s first. |
| **G-6** | **Node version split** | `guards.yml` Node 20; `refresh-data.yml` Node 22. | Environment drift risk. |

### UI / mockup / semantics

| ID | Finding | Where | Why it matters |
|----|---------|-------|----------------|
| **U-1** | **SampleBadge on state attainment** | Attainment is state-level B15003, not county sample; badge shown when `countiesLive`. | Misleading "sample" label on non-county data. |
| **U-2** | **SampleBadge missing on tax footnote** | Mockup shows sample on tax estimate line; §03 has no badge. | Tax tables are computed sample, not live API — badge should appear or copy should say "computed from published tables." |
| **U-3** | **"Smallest counties" label** | Bottom list is smallest of **top-10 FIPS sample**, not smallest FL counties. | Misleading with `SampleBadge`. |
| **U-4** | **Honest-gap copy drift** | Platform default: `"No verified record available"`. FL uses `"No verified data yet"`. | Intentional per FL handoff, but inconsistent platform-wide. |
| **U-5** | **BEA gap exposes operator detail** | UI: "configure BEA_API_KEY to enable live fetch." | User-facing env var mention; should be owner/ops only. |
| **U-6** | **§01/§02 frame notes missing** | Mockup `.frame-note` under headers; only §03 Taxes has `note` in `SectionShell`. | Visual/content drift vs locked mockup. |
| **U-7** | **Legislation headline format** | Full LegiScan description as headline vs mockup short "HB 11 — …" style. | Scanability drift. |
| **U-8** | **Hardcoded colors in row components** | `FloridaLegislationBillRow.tsx`, `FloridaCourtDecisionRow.tsx` use `text-white`, `text-gray-*` vs CSS vars elsewhere. | Token migration incomplete on nested components. |
| **U-9** | **a11y gaps** | Bill/court expand buttons lack `aria-expanded`/`aria-controls`; unemployment chart has no text alternative. | WCAG risk. |
| **U-10** | **§05 nav orphan** | Nav always links `#section-05`; section only renders when `legislationRecords.length > 0`. | Dead anchor if data empty. |

### Phase-0 factual falsehoods (Claude re-review; surfaced later)

| ID | Finding | Where |
|----|---------|-------|
| **F-1** | Unemployment 12-mo delta **negated** — rising rate shows as falling with positive color | `FloridaStateDashboard.tsx` ~560–563: `formatDelta(-unempDelta.delta, '%')` |
| **F-2** | Fuzzy `findEconomicIndicator('employment')` matches **"Unemployment rate"** first (substring) — Employed can render as % | Local helper in dashboard; must use exact `findIndicator` from `lib/format/stateEconomicDisplay` |
| **F-3** | Income vs U.S. chip **negates** delta | ~447–448: `formatDelta(-incomeNatDelta, 'USD')` |
| **F-4** | Income/home lack `nationalValue` from US ACS — vs-U.S. chips often absent | Need B19013/B25077 `for=us:1` wired into slice |

### Documentation & types

| ID | Finding | Where |
|----|---------|-------|
| **X-1** | `FLORIDA_DATA.md` omits `ingest:fl-counties`, `ingest:bea-rpp-fl`, `ingest:fl-tax` | `docs/FLORIDA_DATA.md` |
| **X-2** | `BEA_API_KEY` in `.env.example` but not `KEYS.md` | Ops onboarding gap |
| **X-3** | `floridaDashboard.ts` uses unsafe `as` casts; `tier: string` not `SourceTier` | No runtime schema validation |
| **X-4** | Duplicate `FloridaCountyRow`, `topBottomCounties`, `findEconomicIndicator` in dashboard + loader | Drift risk |

---

## P2 — Polish, scalability, methodological notes

| Category | Items |
|----------|-------|
| **Ingest robustness** | Census sentinel `-666666666` coerced to `0` not `null`; unguarded `popRankUrl` fetch; hardcoded BEA year `2023` without fallback loop; only 2 metros (no rural/nonmetro per mockup ~89); population growth compares adjacent ACS vintages (methodologically weak) |
| **Tax math** | Federal $250K → $53,015 vs mockup ~$48,900 (2024 brackets vs older estimate — document tax year); NY comparison ignores NYC local tax (label as "state only") |
| **Guard scalability** | Manual `FL_DASHBOARD_CREDIBILITY_FILES` list; string numerics in BLS JSON bypass `hasNumericPayload`; ingest scripts don't call `assertFloridaDashboardCredibility` at write time |
| **UI polish** | Rail nav lacks active state/icons; sparkline gold not mockup green; tax tables lack `.taxspot` wrapper; non-compact legislation/court branches dead code; `stateName` prop unused in `FloridaStatePoliticians` |
| **Identity guard** | O(n) full roster scan — fine now, may need batching later; not FL-layout-specific |
| **Stale data** | County sample `fetchedAt` 2026-07-10 — no CI refresh path |

---

## What is working well (credit)

| Area | Status |
|------|--------|
| SSR route shell | `app/states/[code]/page.tsx` — no `'use client'` on route; correct pattern |
| CPI removed from FL UI | No CPI references in `FloridaStateDashboard.tsx`; slice still has CPI internally but not rendered |
| BEA honest gap | No fake 99.4 fallback; `state: null` + gap card |
| Census county sample (committed) | `fetchedLive: true`, real ACS 2023 + BLS LAUCN rates |
| Tax bracket math | IRS 2024 progressive calc + TF NY/CA schedules; tiers correct (`official` / `nonpartisan`) |
| Credibility guard + fixtures | Bad/good/gap frozen examples; passes on committed artifacts |
| Identity guard | DeSantis/D000628 regression fixture; full roster scan |
| Render integrity in CI | External server mode, education panel overflow check, contact-sheet emission |
| Design tokens (main dashboard) | `var(--gold)`, `--bg-*`, `--foreground`, `--muted`; flag hex only decorative |
| Sitemap | `/states/FL` in `app/sitemap.ts` |
| Doc count enforcement | 18 prebuild commands machine-gated via `docsConsistencyGuard` |

---

## fetchedLive status (committed artifacts at review)

| Field | Status | Notes |
|-------|--------|-------|
| Census counties (income, home, pop) | **`fetchedLive: true`** | ACS 2023, n=10 |
| Census attainment (B15003) | **`fetchedLive: true`** | 33.2% bachelor's+ |
| County unemployment (BLS) | **`fetchedLive: true`** | LAUCN per county |
| State hero stats (slice) | **Live at ingest time** | From `florida-demographics.json` → slice; **not covered by new guard** |
| BEA cost of living | **Honest gap** | Needs `BEA_API_KEY` |
| Federal tax | **Computed, `fetchedLive: true`** | IRS Rev. Proc. 2023-34 — semantics debatable |
| FL state $0 | **Fact, `fetchedLive: true`** | |
| NY/CA comparison | **Computed, `nonpartisan`** | Tax Foundation 2024 brackets |
| Total burden | **Static cited, `nonpartisan`** | TF Facts & Figures constants |

---

## Recommended fix order (guidance at review time)

### Phase A — Credibility hardening (before merge)
1. Extend guard to audit **`stateSummary`** + union payload; add fixture for failed-attainment zeros.
2. Split county ingest provenance: `censusFetchedLive`, `blsFetchedLive`, `attainmentFetchedLive`.
3. Retire tax `fetchedLive: true` → honest `computedFromPublishedTables` + citations (guard rules updated accordingly).
4. Wire dashboard ingests into **`ingest:florida-all`** + **`refresh-data.yml`** (key-gated).
5. Unify or document dual-source architecture (slice vs county sample) — ideally hero stats read from same vintage as county batch.

### Phase B — Ops & CI alignment
6. Fix **postbuild vs docs** — either wire `test:render-integrity` into postbuild or correct `AGENT_HANDOFF_LOG` / `AGENT_INDEX` / `PROGRESS`.
7. Align **`refresh-data.yml`** guards with `guards.yml` minimum.
8. Reconcile **render-guard anchors** for `main` merge (`#economy` vs `#section-*`).
9. Add **`BEA_API_KEY`** to `KEYS.md`; owner sets key and re-ingests.

### Phase C — UI/mockup polish (post-credibility)
10. SampleBadge placement (remove from attainment, add to tax/computed footnote).
11. Frame notes §01/§02; legislation headline format; token migration on bill/court rows.
12. a11y on expand buttons and charts.
13. Expand render `REQUIRED_SECTIONS` to §02 + conditional §05/§06.

---

## Open questions — RESOLVED in CONSOLIDATED BRIEF v2 (2026-07-18)

| Q | Decision |
|---|----------|
| Q1 Census keyless | **CENSUS_API_KEY REQUIRED** — hard-exit; document in KEYS.md; remove "keyless" claims |
| Q2 Tax fetchedLive | Provenance enum: `'fetched-live'` \| `'computed-from-published-tables'` (citation + computedAt) \| `'honest-gap'`. Tax → computed-from-published-tables |
| Q3 Dual data paths | **Single read-path**: county ingest also fetches state B01003/B19013/B25077 (same ACS vintage); `build-data-slices` consumes it; slice is the only accessor components read |
| Q4 CourtListener tier | **`'nonpartisan'`** (committed JSON correct); opinion links to court's own record stay `'official'` |
| Q5 Honest-gap copy | Standardize **"No verified record available"** everywhere; enforce via copy-compliance |

---

## Bottom line

| Dimension | Grade | Notes |
|-----------|-------|-------|
| **Structure / layout** | **A-** | Rail+canvas, sections, nav, SSR — approved spec largely met |
| **Data credibility** | **B** | Major placeholder blocker fixed; guard gaps, dual paths, tax semantics remain |
| **Guards / CI** | **B-** | New guard valuable but narrow; render CI good; refresh workflow weak; doc drift |
| **UI fidelity vs mockup** | **B** | Tokens mostly done; frame notes, charts, legislation rows, a11y drift |
| **Ops / docs** | **C+** | Missing ingest wiring, KEYS gaps, FLORIDA_DATA incomplete |

**Original review mode:** no action. Execution now follows CONSOLIDATED BRIEF v2 Phases -1 → D.
