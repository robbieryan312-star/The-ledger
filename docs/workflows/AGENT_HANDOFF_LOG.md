# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

---

**Current state (2026-07-18):**
- Branch: `cursor/fl-state-locked-spec-70a6` · HEAD pending CONSOLIDATED BRIEF v2
- PR: **#25** draft · executing Phases -1 → D · **STOP after Phase D** for Claude re-review
- Tree: dirty during brief · merge of #26/#25/#27/#24 planned in Phase D

## Latest session — CONSOLIDATED BRIEF v2 (in progress)

### Objective
Execute Claude+Cursor consolidated brief: log review, fix Phase-0 falsehoods, credibility hardening, ops/CI, UI polish, PR reconciliation. STOP after Phase D.

### Decisions (RESOLVED — do not re-ask)

| Q | Decision |
|---|----------|
| Q1 Census keyless | **CENSUS_API_KEY REQUIRED** — hard-exit; document in KEYS.md; remove "keyless" claims |
| Q2 Tax fetchedLive | Provenance enum: `'fetched-live'` \| `'computed-from-published-tables'` (citation + computedAt) \| `'honest-gap'`. Tax → computed-from-published-tables |
| Q3 Dual data paths | **Single read-path**: county ingest also fetches state B01003/B19013/B25077 (same ACS vintage); `build-data-slices` consumes it; slice is the only accessor components read |
| Q4 CourtListener tier | **`'nonpartisan'`** (committed JSON correct); opinion links to court's own record stay `'official'`. Precedent: official-derived aggregators = nonpartisan |
| Q5 Honest-gap copy | Standardize **"No verified record available"** everywhere; enforce via copy-compliance |

---

## Session — FL infrastructure 3-phase audit (2026-07-12, logged 2026-07-18) — COMPLETE

### Objective
Read-only exhaustive review of FL locked-spec infrastructure before further work. No code changes that session.

### Verdict / outcome
**COMPLETE (review only)** — structure A-; credibility B; guards/CI B-; UI B; ops C+. Grades and findings below. Open questions now **RESOLVED** per CONSOLIDATED BRIEF v2.

### Grades

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Structure / layout | **A-** | Rail+canvas, sections, nav, SSR — approved spec largely met |
| Data credibility | **B** | Placeholder blocker fixed; guard gaps, dual paths, tax semantics remain |
| Guards / CI | **B-** | New guard valuable but narrow; render CI good; refresh workflow weak; doc drift |
| UI fidelity vs mockup | **B** | Tokens mostly done; frame notes, charts, legislation rows, a11y drift |
| Ops / docs | **C+** | Missing ingest wiring, KEYS gaps, FLORIDA_DATA incomplete |

### Architecture (dual path — to be unified in Phase A)

```
state-economic.json (slice) ← florida-demographics + bls/*.json  → hero/rail/§01 cards
counties-sample.json (direct) ← ACS counties + BLS LAUCN         → county dropdowns + attainment
bea-rpp-sample.json / tax-burden-sample.json (direct)
```

### P0 findings
1. BEA honest gap until BEA_API_KEY (expected)
2. Render-guard anchor conflict main `#economy` vs branch `#section-*` (Phase B/D)
3. Census not keyless in practice — API returns Missing Key without CENSUS_API_KEY (**Q1 RESOLVED: key required**)

### P1 findings (selected)
- Dual-source vintage drift on same page (**Q3 RESOLVED: single read-path**)
- `stateSummary` bypasses credibility guard
- Attainment partial-failure → false zeros
- Tax `fetchedLive:true` with zero HTTP (**Q2 RESOLVED: provenance enum**)
- Slice path unguarded; CPI still in slice (not rendered on FL page)
- Dashboard ingests missing from refresh CI / `ingest:florida-all`
- Court tier handoff said official, JSON nonpartisan (**Q4 RESOLVED: nonpartisan**)
- Honest-gap copy "No verified data yet" vs platform default (**Q5 RESOLVED: standardize**)
- SampleBadge misuse on attainment; missing on tax
- render-integrity not in postbuild despite docs
- `refresh-data.yml` weak guard gate
- Fuzzy `findEconomicIndicator('employment')` matches "Unemployment rate" first (Phase 0)

### Open questions — RESOLVED in CONSOLIDATED BRIEF v2
See decisions table above.

---

## Prior session — FL credibility re-verify (PASS — STOP for Claude)

### Objective

Re-verify credibility blocker fix on `cursor/fl-state-locked-spec-70a6` per brief; regenerate render contact-sheet.

### Verdict / outcome

**PASS** — committed data meets credibility rules; **STOP for Claude re-review** (not merged).

### fetchedLive status (committed JSON)

| Field | Status |
|-------|--------|
| Census counties (B19013, B25077, B01003) | `fetchedLive:true` — ACS 2023, n=10 |
| Census attainment (B15003) | `fetchedLive:true` — FL 33.2% bachelor's+ |
| County unemployment (BLS LAUCN) | `fetchedLive:true` — per-county rates; null → honest gap in UI |
| BEA cost of living | **honest gap** — `state:null`, `fetchedLive:false` (no `BEA_API_KEY`) |
| Federal tax | `fetchedLive:true` — IRS Rev. Proc. 2023-34 computed |
| FL state tax $0 | `fetchedLive:true` |
| NY/CA comparison | `fetchedLive:true` — Tax Foundation 2024 brackets (`nonpartisan`) |
| Total burden | `fetchedLive:true` — Tax Foundation cited (`nonpartisan`) |

### Commits (this task)

- `f7ccb4f` — fix(fl): data credibility — live Census/BLS/tax, honest BEA gap, guard
- `8f17226` — docs: handoff log

### Commands run (this session)

- `npm run test:no-unverified-official-data` → 4/4 pass
- `npm run prebuild` → exit 0
- `npm run build` → exit 0
- `npx playwright install chromium` → exit 0 (env bootstrap)
- `RENDER_INTEGRITY_EXTERNAL_SERVER=1 npm run test:render-integrity` → 2/2 pass

### Acceptance evidence

- `data/florida/census/florida-counties-sample.json` — `meta.fetchedLive: true`
- `data/florida/bea/florida-rpp-sample.json` — `state: null`, `fetchedLive: false`
- `data/florida/taxes/florida-tax-burden-sample.json` — provenance per-section `fetchedLive: true`
- Contact-sheet `generatedAt`: 2026-07-12T03:36:27Z

### Open / next

- Owner: set `BEA_API_KEY` → `npm run ingest:bea-rpp-fl` → commit for live cost-of-living
- Claude re-review PR #25 with contact-sheet

---

## Prior session — FL data credibility fix (2026-07-10)

**From:** Claude Code · **To:** Cursor · **Status:** design locked (owner-approved), ready to build.

## HANDOFF 2026-07-10 — Florida state page redesign: LOCKED design + build brief
Cursor executes in this order; each step gated on the previous:
0. **Baseline merge FIRST** — merge the Claude-verified **#20 (platform) → then #21 (docs)** into
   `main`, reconciling the divergent guard lists (governor-identity vs docs-consistency — keep BOTH
   guard sets, union them). Confirm `npm run prebuild` + `npm run build` green on `main` and the live
   demo reflects the baseline. This is the visible baseline everything else iterates against.
1. **Verification guards** (`test:identity-integrity`, `test:render-integrity`) — build + wire into
   prebuild/CI before generating any page/profile (§3 below). The net exists before we scale.
2. **Florida flagship page** — build to the locked spec (§1) on a review branch, small-sample data
   (§2), honest gaps elsewhere. Hold for ONE combined Claude review (rendered-screenshot review, not
   source). **Nothing merges until that review clears.**
3. **Propagation comes ONLY AFTER FL is reviewed + locked** — menus/tabs, the politician-profile
   template on already-migrated members, `/politicians` filtering. Anti-rut law: lock the one
   gold-standard flagship before scaling to other surfaces. Do NOT start this in the same pass.

### 0. Locked visual reference
- **Design mockup (owner-approved):** Option 3 "Rail + Canvas", refined — a static HTML wireframe with
  placeholder ("sample") numbers. It defines **structure, hierarchy, sections, and content**, not the
  final token-level polish. Claude holds the file (`docs/design/fl-state-page-mockup.html` — open it in a browser to see the target); the
  section-by-section spec below is the authority Cursor builds to.
- **Aesthetic:** rich dashboard — data-dense, most stats visible, sparklines + one full chart, inline
  comparison chips, restrained gold accent, subtle depth over hard borders. Left **sticky rail**
  (flag + state name + section nav + two quick-stats) and a **main canvas** of numbered sections.

### 1. Page structure (build to this exactly)
Route: **new SSR page `app/states/[code]/page.tsx`** (Florida first, `/states/FL`). Server component —
no `'use client'` on the route shell; interactive bits (drop-downs, filters) are child client
components. Add `/states/FL` to the sitemap.

**Header:** eyebrow "State profile" → `Florida` H1 → one-line lede. **Population hero** (top-right):
`21.9M`, `▲1.6%/yr · 3rd largest state`, with a drop-down listing the **top-5 counties by population**.

**Rail quick-stats:** Median income `$71.7K` · Employment rate `95.6%`. (Do NOT lead with the income
tax figure — owner directive.)

**§01 Economy & cost of living** — 3 stat cards, each with a working drop-down:
- **Median household income** `$71.7K` · "$6.3K below the U.S. average" · sparkline · drop-down =
  **top-5 & bottom-5 counties** by median household income.
- **Median home value** `$325K` · "23% below the U.S. average" · sparkline · drop-down =
  **most-expensive & most-affordable counties**.
- **Cost of living** index `99.4` (US = 100) · "0.6% below the U.S. average" · drop-down =
  **component RPPs** (housing / groceries / utilities / transport) + **metro RPPs** (Miami ~110, Tampa
  ~100, rural ~89). **Replaces the old CPI/inflation card entirely.**
- One source line at the bottom of the section (not per card).

**§02 Jobs & workforce** — **2 stat cards** (NOT three — the standalone unemployment card was removed
as redundant with employment):
- **Employment rate** `95.6%` · "0.2 pts below the U.S. rate" · **small sub-detail line beneath the
  number: "Unemployment 4.4% ▼0.5 vs a year ago"** · drop-down "workforce, counties & trend" =
  workforce drawer (labor force 10.7M / employed 10.2M / unemployed 493K / unemp rate 4.4%) +
  **top-5 & bottom-5 counties by unemployment** + the **full trailing-12-month unemployment chart**.
- **Adults with a bachelor's+** `31.5%` · "4 pts below the U.S. average" · drop-down = attainment
  breakdown (HS+ 89.2% / some college 29.8% / bachelor's 20.6% / graduate 10.9%).
- **Full-width block: "Median earnings & unemployment by education level"** (annual earnings) — its own
  panel below the cards, all four tiers shown completely, **fluid columns so nothing overflows the
  card edge** (this was a real bug the owner caught): Less-than-HS $40,768 / 5.5% · HS $50,804 / 4.2% ·
  Bachelor's $83,668 / 2.5% · Advanced $103,064 / 1.9%.
- **Fastest-growing occupations** (10-yr projection) rows + an honest "sample / pending real BLS
  projections" note until the pipeline lands.

**§03 Taxes** (new section) — **do NOT lead with a big "$0" headline** (owner directive). Show a
**realistic total including FEDERAL income tax**:
- Table 1 (single filer, $50K / $100K / $250K): **Federal income tax** row (~$4,000 / $13,900 /
  $48,900, same in every state) → **Florida state income tax** row ($0, highlighted) → **Total paid
  living in Florida** row (= federal only).
- Table 2 "for comparison — extra state tax others add on top of the same federal bill": TX·TN +$0;
  NY +$2,200 / +$5,400 / +$16,100; CA +$1,100 / +$4,500 / +$18,700.
- Drop-down "the full picture — total tax burden": combined state+local burden (sales ~7% avg,
  property ~0.8% effective, **total 9.1% of income vs U.S. avg 11.2%**), with a note that federal sits
  on top of all of it and is the same nationwide.

**§04 Officials** — office-ranked (governor → senators → house), avatar + name + role + party pill +
"profile →"; "+N more · filter by chamber/party/name". **Real portraits required** (see guard below).

**§05 Legislation** — recent FL bills, plain-language summary headline + "full text ▾" + source.

**§06 Courts** — FL Supreme Court decisions, plain-language summary + "syllabus ▾" + source.

### 2. Data sourcing (each figure → source + tier + path). Small-sample only; do NOT scale to full corpus.
| Data | Source (tier) | Notes / path |
|------|---------------|--------------|
| Population, median income, median home value, educational attainment | **Census ACS** (`official`) | already ingested state-level (`data/florida/census/`); county tables via `for=county:*&in=state:12` (net-new, same key) |
| County top-5/bottom-5 (income, home value, population) | **Census ACS county tables** (`official`) | new small ingest |
| Employment / unemployment / labor force + 12-mo history | **BLS LAUS** (`official`) | state history already ingested & currently discarded (`data/florida/bls/florida-labor.json`); county series net-new |
| Earnings & unemployment by education | **BLS CPS** (`official`) | new small pipeline (`data/florida/bls/florida-education-labor.json` earnings already corrected) |
| Fastest-growing occupations (10-yr) | **BLS Employment Projections + FL Commerce LMI** (`official`) | new small pipeline; show projection-vs-actual where a prior forecast exists; honest "sample/pending" until then |
| **Cost of living** (index + components + metros) | **BEA Regional Price Parities** (`official`) | BEA Data API, *Regional* dataset, MARPP tables (state + metro). Owner-surfaced org `github.com/us-bea` (`beaapi`/`bea.R` wrap the same REST API) |
| Taxes: federal brackets, FL $0 state | **IRS + FL Dept. of Revenue** (`official`) | estimated effective tax by income level |
| Taxes: other-state comparison + total burden | **Tax Foundation** (`nonpartisan`) | comparison rows + state+local burden |
| State bills (plain-language summary) | **LegiScan** (`nonpartisan`) | bill `description` as summary; already sampled (`data/florida/legiscan/`) |
| Court decisions (syllabus) | **CourtListener** (`official`) | already ingested (`data/florida/courts/florida-court-opinions.json`) |
| Officials roster + portraits | **unitedstates/congress-legislators** + official `.gov` portraits (`official`/`nonpartisan`) | portraits keyed by correct `bioguideId` (see guard) |

### 3. NEW verification guards — build these FIRST; they are the net that scales to every profile
The owner correctly flagged that obvious rendered mistakes (a column running off-screen; DeSantis
showing the wrong portrait because `D000628` = Neal Dunn was mis-keyed) passed source-only review.
Two new build-gated guards close this permanently (now HARD RULES in core-rules):
- **`test:identity-integrity`** — for every roster/officials entry: the portrait/asset must be keyed to
  the correct `bioguideId`, and name + party + state + office + photo must all resolve to the SAME
  identity (no cross-wired ids). Every current officeholder has a real portrait OR an explicit
  honest-gap — never a silently wrong or placeholder image where one is expected. Freeze the
  DeSantis/Dunn case as a regression fixture (fixtures append-only).
- **`test:render-integrity`** — headless render (Playwright is pre-installed; `/states/FL` + sampled
  profiles) asserting: **zero horizontal overflow** (`documentElement.scrollWidth ≤ innerWidth`; no
  element's right edge past the viewport at mobile + desktop widths), **every `<img>` loads**
  (`naturalWidth > 0`), **no empty required section**. Also emit a **screenshot contact-sheet** per
  page so Claude reviews the render, not the source, at the gate. Freeze the education-table-overflow
  case as a regression fixture.
- Wire both into `npm run prebuild` and `.github/workflows/guards.yml` alongside the existing 13 suites.

### 4. Reusable code (don't reinvent — reference the plan for exact paths)
`lib/format/number.ts` (new compact/full formatter — consolidate the ~12 copied `formatMoney`);
`components/ui/TierDot.tsx` (new corner tier bubble reusing `TIER_CONFIG` colors from
`components/ui/SourceBadge.tsx`); office-rank sort `comparePoliticiansByOffice`/`getOfficeSortTier`
(`lib/politicianSort.ts`); filter/search engine `components/dashboard/StateRosterControls.tsx` +
`lib/dashboard/stateRosterClient.ts`; expand/collapse `ProfileSectionAccordion`/`ProfileExpandableRow`
or native `<details>`; bill row `LegislationBillRow`/`ExpandableEvidenceRow`; economic slice carries
raw value + unit + `recent[]` history (`scripts/build-data-slices.ts`, `lib/types/snapshotTypes.ts`).

### 5. Scope, sequencing & guardrails
- **Small-sample only** — every pipeline (incl. new BEA/CPS/EP/tax ones) proven on ~10 records max, the
  same discipline as the FL court/LegiScan samples. **No scaling any sync to full corpus** until owner
  reviews and approves.
- **Nothing merges to `main`.** Build on a review branch; commit per completed task; hold for **one
  combined Claude review** when code-complete. Per §1.1, autonomous failure reporting if anything
  fails; STOP after 2 failures on a task.
- **Honest gaps** everywhere real data isn't wired yet ("No verified data yet") — never fabricate, never
  silent-empty. Objective voice, no moral labels (editorial-voice rules).
- **Propagation (menus/tabs/politician profile template, `/politicians` filtering) comes AFTER** the FL
  page is built and passes review — lock the flagship first, then scale (anti-rut law).

---

## Latest session — Step 2 polish (STOP for Claude)

### Objective

Complete remaining Step 2 gaps from locked handoff: map sidebar slim, officials preview, §05/§06 source lines; fix render-integrity CI flake.

### Verdict / outcome

**STOP for Claude review** — Step 2 polish complete; Step 3 (propagation) **not started**.

| Step | Status | Evidence |
|------|--------|----------|
| 0 Baseline merge | **PASS** | `a1f9652` on `main` |
| 1 Guards | **PASS** | `df36b3f` + `4cbdd78` on `main` |
| 2 Florida page | **PASS (review branch)** | Rail+canvas `/states/FL`; map sidebar slim; officials preview; source lines |
| 3 Propagation | **NOT STARTED** | Awaits Claude approval of FL page |

### Commits (this session)

- `9826aff` — feat(fl): step-2 polish — map sidebar, officials preview, source lines, render wait fix

### Commands run (this session)

- `npm run prebuild` → exit 0
- `npm run build` → exit 0 (postbuild render-integrity pass)
- `CI=1 npx tsx scripts/render-integrity-check.ts` → 3/3 pass (flake fix verified)
- `npm run test:render-integrity` → 2/2 pass

### Files touched

| Path | Action | What changed |
|------|--------|--------------|
| `components/map/USAMap.tsx` | modified | FL sidebar: economic summary first, 3 officials max, link to `/states/FL` |
| `components/states/FloridaStatePoliticians.tsx` | modified | 4-row preview, +N more expands filters, mockup source line |
| `components/states/FloridaStateDashboard.tsx` | modified | §05/§06 frame notes + source lines; compact legislation/courts |
| `components/states/FloridaLegislationBillRow.tsx` | modified | `compact` prop for dashboard embedding |
| `components/states/FloridaCourtDecisionRow.tsx` | modified | `compact` prop for dashboard embedding |
| `scripts/render-integrity-check.ts` | modified | `waitForSelector` on required sections (fixes CI=1 flake) |

### Acceptance evidence

- `/states/FL`: `#section-01`–`#section-06` present; officials preview 4 + expand
- Map FL sidebar: `FloridaStateEconomicCompact` + 3 officials + `+N more · full Florida profile →`
- Render: `data/reports/render-integrity/_states_FL_mobile.png`, `_desktop.png`
- `CI=1` render-integrity: 3 consecutive passes

### Open / next

- Claude combined review (render screenshots + code)
- Owner visual pass after APPROVAL
- Step 3 propagation after FL locked
- Optional: county/BEA/tax small ingest scripts (static sample JSON in place)

---

## HANDOFF 2026-07-10 — Florida state page redesign (reference spec)

*(Full locked spec — see `docs/design/fl-state-page-mockup.html` and `origin/claude/ledger-progress-review-jmd6gl` handoff)*

### Build order (binding)
0. Baseline merge — **DONE** (`main` `4cbdd78`)
1. Verification guards — **DONE**
2. Florida flagship — **DONE on review branch** — STOP for Claude
3. Propagation — **NOT STARTED**

---

## Improvement backlog (selected updates)

| ID | Status | Note |
|----|--------|------|
| IMP-011 | **done** | Guards reconciled on main (17 prebuild) |
| IMP-013 | **done** | #20+#21 merged to main |
| IMP-015 | open | handoff-log guard optional |
| IMP-NEW | open | Sanders profile mobile overflow — deferred from render batch |
| IMP-NEW | **done** | Render CI flake — `waitForSelector` fix |

---

## Session log (last 3 only)

### 3 — Step 2 polish (2026-07-10)

Map sidebar slim, officials preview, §05/§06 sources, render wait fix. STOP for Claude.

### 2 — Handoff 2026-07-10 execution (2026-07-10)

Merge, guards, FL page on review branch. STOP for Claude.

### 1 — Handoff log rename (2026-07-09)

Agent handoff log + improvement backlog.
