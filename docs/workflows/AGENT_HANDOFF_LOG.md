# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

---

**Current state (2026-07-19T03:35Z):**
- Branch: `cursor/fl-by-numbers-ux-70a6` @ `d3bacd4` · PR [#39](https://github.com/robbieryan312-star/The-ledger/pull/39) · guards GREEN
- **Approved production (canonical):** https://the-ledger-s4dn.vercel.app — formerly project `the-ledger-s4dn` (owner: rename/alias to "Approved" in Vercel dashboard)
- **Beta:** reserve at most one other project if needed; pause/delete the rest (`the-ledger`, `the-ledger-jcjh`)
- Stale: `the-ledger-gamma.vercel.app` (rate-limited Hobby quota — owner consolidate)
- Phase P **GATED** until owner visual sign-off on **deployed mobile** Approved URL


## Improvement backlog

| Date | Item | Status |
|------|------|--------|
| 2026-07-19 | **OWNER DASHBOARD:** name **Approved** = formerly `the-ledger-s4dn`; keep at most one **Beta**; pause/delete the other project(s); re-point gamma/custom domain at Approved. Triple projects burned Hobby quota. | open — owner only |
| 2026-07-18 | `npm audit`: 7 vulns remain after safe `npm audit fix` — need upstream Next/react-simple-maps (see `docs/workflows/NPM_AUDIT_2026-07-18.md`) | open |
| 2026-07-11 | Add an explicit guard for national news refresh semantics so a successful empty response cannot be confused with fetch failure or stale-window retention. | open |


## Latest session — By-the-numbers UX + keyless ranks/COL (STOP for owner visual)

### Objective
Owner visual refinements: clearer titles, 1-decimal stats, ranks of 50, age drop-down, top/lowest 5 counties, better COL sources, condense §01; name Approved (ex-s4dn) vs single Beta.

### Verdict / outcome
**PASS (local + CI)** — PR [#39](https://github.com/robbieryan312-star/The-ledger/pull/39) @ `d3bacd4`; guards GREEN run `29671998668`. Ranks/age live; BEA RPP via FRED (103.4, #41/50); UI shipped. **STOP for Claude review + owner visual** on Approved URL after deploy (all 3 Vercel projects still Hobby rate-limited). Phase P gated.

### Data
| Artifact | Provenance | Notes |
|---|---|---|
| `florida-state-rankings-sample.json` | fetched-live | income #34, home #21, pop #3, bach+ #26, unemp #21; age groups filled |
| `florida-rpp-sample.json` | fetched-live (FRED) | BEA all-items 103.4; rankAmong50=41; components/metros need BEA_API_KEY |
| counties sample | fetched-live | still **n=10** SAMPLE — full 67 counties need `CENSUS_API_KEY` |

### Commands run (this session)
- Merged PR #38 → `82fe58f` (docs handoff)
- `npm run ingest:fl-state-rankings` → live via data.census.gov
- `npm run ingest:bea-rpp-fl` → live via FRED
- `npm run test:state-economic-display` → 13/13
- `npm run test:copy-compliance` → 3/3
- `npm run test:no-unverified-official-data` → 7/7
- `npm run test:typecheck` → exit 0
- `npm run test:render-integrity` → 4/4 (after killing stale :4112)

### Owner dashboard action (REQUEST)
1. Treat **s4dn** as **Approved** production; pause/delete `the-ledger` + `the-ledger-jcjh` (or keep one as **Beta** only).
2. Re-point `the-ledger-gamma` (or custom domain) at Approved once rate-limit clears.
3. Visual sign-off on deployed mobile `/states/FL` unlocks Phase P.

### Open / next
- PR #39 open; guards GREEN — await Claude APPROVAL before merge
- Deploy blocked until Vercel rate-limit clears / owner consolidates to Approved
- Do **not** start Phase P until owner sign-off logged

## Latest session — Deploy pipeline: merge #36/#37 + live production (COMPLETE)

### Objective
Merge Claude-approved PR #36; fix Vercel production so owner can review deployed `/states/FL` with `#section-01` By the numbers.

### Verdict / outcome
**COMPLETE** — approved page is live on a Vercel **Production** URL. Owner final visual sign-off is on that deployed mobile site (not screenshots). Phase P remains gated until that sign-off.

### Process rule
- Merged #36 only after `guards` GREEN on tip `9ed7693` (run `29668533928`)
- Merged #37 only after `guards` GREEN on tip `9c8d6c2` (run `29671126969`)

### Root causes (logged — no guessing)

| # | Symptom | Root cause | Fix |
|---|---------|------------|-----|
| 1 | Vercel builds failing postbuild | `test:render-integrity` needs Chromium; Vercel builders lack it | `package.json` postbuild skips render-integrity when `VERCEL=1` or `RENDER_INTEGRITY_SKIP_POSTBUILD=1`; still runs `test:client-chunks`. Full RI enforced in GitHub CI + local |
| 2 | `the-ledger` / `the-ledger-jcjh` Production for `6500b2d` not updating | GitHub status: **Deployment rate limited — retry in 24 hours** (Hobby quota; three projects × every push) | Cannot agent-fix. Owner must consolidate projects (see backlog). Working Production is `the-ledger-s4dn` |
| 3 | `the-ledger-gamma.vercel.app` stale (`id="economy"`, no `#section-01`) | Bound to rate-limited `the-ledger` project; last successful deploy pre-#36 layout | Owner: wait for rate-limit window **or** re-alias gamma → s4dn / surviving project |

### Commits
- `ea33649` — Merge pull request #36 (By-the-numbers)
- `9c8d6c2` — fix(ci): skip render-integrity postbuild on Vercel builders
- `6500b2d` — Merge pull request #37

### Commands run (this session)
- `gh pr checks` / merge #36 → `ea33649`; merge #37 → `6500b2d`
- `curl` `https://the-ledger-gamma.vercel.app/states/FL` → HTTP 200; **no** `id="section-01"`; has `id="economy"`
- `curl` `https://the-ledger-s4dn.vercel.app/states/FL` → HTTP 200; **has** `id="section-01"` + `By the numbers` + MERIC/CPI YoY copy
- `gh api …/commits/6500b2d/status` → `the-ledger`/`jcjh` failure rate-limit; `s4dn` success
- Ad-hoc Playwright mobile @ 390×844 against live s4dn → `#section-01` present, no horizontal overflow, no broken images
- CI contact-sheet: Guards run `29671202617` artifact `render-integrity-contact-sheet` (`generatedAt` `2026-07-19T03:07:10.881Z`)

### Acceptance evidence
- **Live URL:** https://the-ledger-s4dn.vercel.app/states/FL
- **Deployment id:** GitHub `5507426105` · Vercel `J8s7ui7w1LpQa4XeRmoc82SJgD4e` · SHA `6500b2d`
- HTML grep: `id="section-01"` True; heading `By the numbers`; no stale `id="economy"`
- Mobile live check: overflow docW=innerW=390, offenders=[]; CI mobile PNG cited above
- Artifacts (agent session): `/opt/cursor/artifacts/s4dn-fl-mobile.png`, `ci-states-FL-mobile-6500b2d.png`

### Owner dashboard action (REQUEST — Cursor cannot do this)
Consolidate Vercel projects to **one** canonical project. Pause or delete `the-ledger-jcjh` and whichever of `the-ledger` / `the-ledger-s4dn` is not chosen as canonical (today only **s4dn** successfully shipped `6500b2d`). Re-point production domain (`the-ledger-gamma.vercel.app` or custom) at that single project. Report which project/domain is canonical once confirmed.

### Open / next
- **STOP for owner:** visual sign-off on **deployed mobile** https://the-ledger-s4dn.vercel.app/states/FL — that unlocks Phase P
- Owner: Vercel project consolidation + rate-limit recovery for gamma alias
- Do **not** start Phase P until owner sign-off is logged


## Latest session — Claude review defect fixes 1–3 (STOP for final approval)

### Objective
Fix three rendered defects on PR #36: metro CPI YoY meaning, MERIC user copy, education mid-word wrap. Re-gate; STOP for Claude final approval. Do not merge. Phase P gated.

### Verdict / outcome
**PASS** — defects fixed; local + CI guards GREEN on `58d1f9f` (run `29668477259`, artifact `render-integrity-contact-sheet`). **STOP for Claude final approval. Do not merge.**

### Fixes

| # | Defect | Fix |
|---|--------|-----|
| 1 | Bare CPI index | Ingest computes `yoyPct` (13-mo); UI shows `Miami–Fort Lauderdale · +X.X% vs a year ago`; short series → honest gap; unit tests |
| 2 | Process vocabulary | Label `Cost of living index (MERIC)`; period `Q1 2026` via `formatMericPeriodDisplay`; copy-compliance bans interim/headline/sample batch in string lits |
| 3 | Education mid-word wrap | Stacked label-above-values + `break-normal` / `word-break: keep-all`; render-integrity asserts no mid-word splits in `#section-01` |

### Commands run (this session)
- `npm run ingest:bls-metro-cpi-fl` → exit 0; yoy Miami≈3.4% Tampa≈3.2%
- `npm run test:state-economic-display` → 12/12 (incl. YoY + MERIC period)
- `npm run test:copy-compliance` → 3/3
- `npm run test:no-unverified-official-data` → 7/7
- `npm run test:typecheck` → exit 0
- `npm run build` → exit 0; render-integrity **4/4**
- CI tip `c404f74` failed: postbuild ignored `RENDER_INTEGRITY_SKIP_POSTBUILD` → image waitForFunction 15s timeout; wired skip into `package.json` postbuild + image wait 45s
- CI tip `e7b6073` failed: DeSantis flgov.com portrait → initials on mobile; switched to same-origin `/portraits/ron-desantis.jpg` + avatar eager/no-referrer + fallback settle wait

### Acceptance evidence
- Contact-sheet metadata (gitignored — cite fields only): generatedAt `2026-07-19T01:13:51.046Z` — regenerate per gate; CI artifact **`render-integrity-contact-sheet`**
- No bare CPI index in UI; no "interim"/"headline"/"sample batch" in user-facing string literals

### Open / next
- Confirm CI GREEN on tip → Claude final APPROVAL
- Owner: BEA + Census keys still needed for full T0/T4/T5
- Phase P gated; **do not merge** without Claude APPROVAL


## Session log 1 — Claude audit FIX-1/2/3 (COMPLETE — STOP for owner)

### Objective
Clear main RED (docs-integrity gitignored citation), fix inverted income chip, upload render-integrity CI artifact; full gate; STOP for owner visual sign-off. Phase P gated.

### Verdict / outcome
**COMPLETE** — FIX-1/2/3 on `main` @ `27fa4dc`. Local + CI gates green. **READY FOR OWNER VISUAL SIGN-OFF of /states/FL**. Phase P remains **BLOCKED**.

### Process rule (binding)
**A merge with pending CI is a violation** — even for docs-only PRs. Wait until `guards` concludes **pass** on the PR tip before merge. Never merge on pending/unstable checks. Confirmed: PR #33 merged only after guards GREEN; main push guards also GREEN.

### Commits
- `b418d12` — fix(fl): Claude audit FIX-1/2/3 — docs-integrity, income chip, CI artifact
- `27fa4dc` — Merge pull request #33 from …/cursor/fl-audit-fixes-70a6

### Fixes

| ID | What | Evidence |
|----|------|----------|
| FIX-1 | Rewrite contact-sheet citation (no gitignored repo path); fixture + guard ban gitignored backtick paths | `docsIntegrityGuard.fixture.ts` + `test:docs-integrity` 6/6; main guards GREEN (was RED on #32) |
| FIX-2 | Income below U.S. → `var(--negative)`; above → `var(--positive)` via `incomeVsUsChipClass` | `test:state-economic-display` 5/5 |
| FIX-3 | `guards.yml` uploads render-integrity report dir as artifact **`render-integrity-contact-sheet`** (retention 14d, `if: always()`) | CI step ✓ on PR run + main run `29666598584` |

### Commands run (this session)
- `npm run test:docs-integrity` → exit 0, 6/6
- `npm run test:state-economic-display` → exit 0, 5/5
- `npm run test:typecheck` → exit 0
- `npm run test:docs-consistency` → exit 0, 8/8
- `npm run build` → exit 0; postbuild render-integrity **4/4**
- `gh run watch` PR guards `29666474950` → exit 0 (GREEN) before merge
- `gh run watch` main guards `29666598584` → exit 0 (GREEN) after merge

### Files touched
| Path | Action | What changed |
|------|--------|--------------|
| `docs/workflows/AGENT_HANDOFF_LOG.md` | modified | Removed gitignored path citations; gate evidence; STOP |
| `lib/data/__fixtures__/docsIntegrityGuard.fixture.ts` | created | Known-bad gitignored path citation |
| `scripts/__tests__/docsIntegrityGuard.test.ts` | modified | Gitignore citation guard |
| `lib/format/stateEconomicDisplay.ts` | modified | `incomeVsUsChipClass` |
| `components/states/FloridaStateDashboard.tsx` | modified | Income chip uses true sentiment |
| `scripts/__tests__/stateEconomicDisplay.test.ts` | modified | FL < US ⇒ negative class + "-$…" |
| `.github/workflows/guards.yml` | modified | upload-artifact `render-integrity-contact-sheet` |

### Acceptance evidence
- Contact-sheet metadata (gitignored — cite fields only): generatedAt `2026-07-19T00:14:17.380Z` — regenerate per gate; review via CI artifact **`render-integrity-contact-sheet`**
- `guards.yml` on `main` @ `27fa4dc`: **GREEN** (run 29666598584) — includes Upload render-integrity contact-sheet ✓
- Prior main RED on #32 (docs-integrity) cleared by FIX-1

### Open / next
- **READY FOR OWNER VISUAL SIGN-OFF of /states/FL**
- Phase P (propagation) starts **ONLY** after owner sign-off is recorded in this log
- Propagation remains **BLOCKED** until then


### Decisions still binding (RESOLVED — do not re-ask)

| Q | Decision |
|---|----------|
| Q1 Census keyless | **CENSUS_API_KEY REQUIRED** — hard-exit; document in KEYS.md; remove "keyless" claims |
| Q2 Tax fetchedLive | Provenance enum: `'fetched-live'` \| `'computed-from-published-tables'` (citation + computedAt) \| `'honest-gap'`. Tax → computed-from-published-tables |
| Q3 Dual data paths | **Single read-path**: county ingest also fetches state B01003/B19013/B25077 (same ACS vintage); `build-data-slices` consumes it; slice is the only accessor components read |
| Q4 CourtListener tier | **`'nonpartisan'`** (committed JSON correct); opinion links to court's own record stay `'official'` |
| Q5 Honest-gap copy | Standardize **"No verified record available"** everywhere; enforce via copy-compliance |

---

## Session log 2 — CONSOLIDATED BRIEF v2 Phases -1→D (COMPLETE)

Landed on `main` via #26→#25→#27; gate @ `4216712` / tip `7fda2b9`. Claude re-review found FIX-1/2/3 (this Latest session). Audit on disk: `docs/workflows/FL_INFRASTRUCTURE_AUDIT_2026-07-12.md`.

---

## Session log 3 — Why Claude could not see the FL audit + fix (COMPLETE)

### Objective
Investigate and fix why Claude Code could not access Cursor's infrastructure
audit recommendations (the chat-only 3-phase review).

### Root cause (verified)

| Factor | Detail |
|--------|--------|
| **Primary** | §1.1 J violation: the 2026-07-12 exhaustive FL infrastructure audit was delivered **only in Cursor chat**. Claude Code **cannot see Cursor chat** — only committed files. |
| **Timing** | Between 2026-07-12 (chat audit) and 2026-07-18 (CONSOLIDATED BRIEF), disk had only credibility-session logs (`f7ccb4f` / `fd63ded`) — **no audit findings, grades, or recommended fix list**. |
| **Partial remediation** | Commit `2429dd2` logged a **summary** of the audit into `AGENT_HANDOFF_LOG.md`, but (1) it was days late, (2) it was not the full report Claude needed for re-review, (3) `AUDIT_DEBT_BRIEF.md` is only a stub redirect — Claude must open `AGENT_HANDOFF_LOG.md` or this new artifact. |
| **PR #25 body** | PR description covered credibility status only; never linked an on-disk audit artifact. |

Binding rule: *“Claude Code cannot see Cursor chat. Unlogged session = failed turn.”*
(`.cursor/rules/ledger-core-rules.mdc` §1.1 J)

### Fix this turn
1. Write full audit verbatim to **`docs/workflows/FL_INFRASTRUCTURE_AUDIT_2026-07-12.md`**
2. Point Current state + Latest session here so Claude’s session-start read finds it
3. Update PR #25 body with the artifact link
4. Commit + push on `cursor/fl-state-locked-spec-70a6`

### Verdict
**COMPLETE** — Claude can now read the full review on disk. CONSOLIDATED BRIEF v2 execution resumes after this commit.

### Full audit location
→ **[`docs/workflows/FL_INFRASTRUCTURE_AUDIT_2026-07-12.md`](./FL_INFRASTRUCTURE_AUDIT_2026-07-12.md)**

---

## Session log 3 — Phase D PR merges (COMPLETE)

| PR | Result |
|----|--------|
| #26 Said-Did preserve | MERGED `402818b` |
| #25 FL locked-spec (Phases 0/A/B/C) | MERGED `a5f76ad` |
| #27 Portrait / render guard (rebased `#section-*`) | MERGED `4216712` |
| #24 bioguideId joins | CLOSED — joins shipped via #25 |
| #23 FL Step 2 polish | Already MERGED (superseded by #25) |

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
