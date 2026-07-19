# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

---

**OWNER VISUAL SIGN-OFF RECEIVED** on live `/states/FL` (the-ledger-s4dn) 2026-07-19 — FL flagship
**LOCKED/FROZEN** including the new plain-language labels (owner: "looks honestly fantastic… everything
else looks perfect"). **Phase P UNLOCKED**, sequenced AFTER Wave 0 merge + Wave 1 data-loss prevention.
Visual changes to the FL page now require new owner direction.

**Current state (2026-07-19T06:05Z):**
- Branch: `cursor/fl-by-numbers-ux-70a6` · PR [#39](https://github.com/robbieryan312-star/The-ledger/pull/39) · Wave 0 chip fixes + keyed re-ingest committed (`fea6a43`, `5beb765`) · **merging on CI green per Claude conditional approval**
- Census key stored in gitignored `.env.local` only (length 40, suffix 685c); GitHub Actions secret still an owner step (`scripts/setup-github-secrets.sh`)
- **Deep read-only platform audit** (4 parallel passes + real gates) rewritten accurately in `docs/workflows/PLATFORM_AUDIT_READ_ONLY_2026-07-19.md` — **no product fixes until Claude briefs**
- Gates this session: `tsc --noEmit` clean; `eslint` 76 problems (23 err/53 warn, not build-gating); `npm run prebuild` **GREEN** after fixing a self-introduced `docsIntegrityGuard` break in the audit doc
- **P0 (owner):** Cursor Cloud injected rules still reference deleted `agent-ops.mdc` + `AUDIT_DEBT_BRIEF.md` — re-sync dashboard project rules with on-disk core-rules §7
- Census KeySignup re-submitted → `create_success.html` (owner activate email → `CENSUS_API_KEY`)
- Vercel rename: **no `VERCEL_TOKEN`** — owner dashboard singular rename (see audit §Owner actions)
- **Approved:** https://the-ledger-s4dn.vercel.app · Phase P **GATED**


## Improvement backlog

| Date | Item | Status |
|------|------|--------|
| 2026-07-19 | **Platform audit (read-only)** — P0 DOC-01 work-log path; P1 FL/FED/DOC findings in `PLATFORM_AUDIT_READ_ONLY_2026-07-19.md` | open — Claude brief before any fix |
| 2026-07-19 | **OWNER DASHBOARD:** rename `the-ledger-s4dn` → Approved; optional one Beta; pause/delete others; optional later `VERCEL_TOKEN` for `vercel project rename` | open — owner only |
| 2026-07-19 | **OWNER EMAIL:** activate Census API key from re-signup; add Runtime Secret `CENSUS_API_KEY` | open — owner only |
| 2026-07-19 | Full FL county set via keyless data.census.gov (was SAMPLE n=10) | done on PR #39 |
| 2026-07-18 | `npm audit`: 7 vulns remain after safe `npm audit fix` — need upstream Next/react-simple-maps (see `docs/workflows/NPM_AUDIT_2026-07-18.md`) | open |
| 2026-07-11 | Add an explicit guard for national news refresh semantics so a successful empty response cannot be confused with fetch failure or stale-window retention. | open |




## Latest session — Wave 0 (chip fixes + keyed re-ingest + slice) (IN PROGRESS → merge on CI green)

### Objective
Claude repair brief Wave 0: fix same-card rank mismatch (0a), COL direction copy (0b), keyed
Census re-ingest + slice rebuild (0c / DATA-01), then merge PR #39 on CI green (0d). Plus S1
(log owner sign-off) and S3 groundwork.

### Done this session
- **S1:** Logged owner visual sign-off; FL flagship FROZEN; Phase P UNLOCKED (sequenced after Wave 0 + Wave 1).
- **0a:** Joblessness chip → `senseNote="1 = least joblessness"` + explicit `basis="ranks ACS 5-yr rate 4.8%"` (distinct from BLS LAUS headline). No same-card metric mismatch.
- **0b:** COL chip → `#41 of 50 · 1 = lowest cost` (removed "Lower cost → #1").
- **0c:** `CENSUS_API_KEY` in gitignored `.env.local`; re-ran `ingest:fl-counties` (67, coverage=full) + `ingest:fl-state-rankings` (all ranks + 5-row age breakdown, via api.census.gov); `build:data-slices` → ACS indicators now share 2026-07-19 vintage with counties. BLS LAUS unemployment keeps 2026-07-02 (separate source; chip labels ACS basis).

### Gates (this session)
| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run prebuild` | exit 0 (19 guards green) |
| `RENDER_INTEGRITY_SKIP_POSTBUILD=1 npm run build` | exit 0 |

### Commits
- `fea6a43` — fix(fl): rank chips declare basis/direction (Wave 0a/0b)
- `5beb765` — data(fl): keyed Census re-ingest + slice rebuild (Wave 0c / DATA-01)

### Independent verification
- Ranks: income #34 (71711), home #21 (325000), pop #3, bach+ #26 (33.2), unemp #21 (4.8); age % sum 100.0
- Counties: coverage=full, count=67, asOf 2026-07-19; slice population/income asOf 2026-07-19

### Open / next (this turn)
- Push branch → watch GitHub `guards` CI → merge PR #39 on GREEN (0d) → confirm s4dn deploy + curl `section-01`
- S3: create `beta` branch + document main/beta flow in `docs/SETUP.md`
- Then STOP for Claude review before S2 (profile-drawer UX) / Wave 1

## Latest session — DEEP platform audit (4 passes + real gates) (COMPLETE — findings only)

### Objective
Owner: intensely thorough, flip-every-stone read-only audit of every file/process/instruction/line
for errors, contradictions, duplicates, and improvements — **no changes until Claude reviews**.
Also: Vercel rename (agent if possible), Census key retry, ideal model, owner-only actions.

### Verdict / outcome
**COMPLETE (findings only)** — Four parallel read-only passes (instructions; app+components;
lib+scripts; config/CI/data) + real gate runs. Findings consolidated and **corrected** in
`docs/workflows/PLATFORM_AUDIT_READ_ONLY_2026-07-19.md`. **No product/data changes. No merge of PR #39.**
Vercel rename not agent-doable (no `VERCEL_TOKEN`). Census KeySignup **302 → create_success.html**.
Ideal auditor: **Claude Opus 4.8 Thinking High**.

### Real gates (this session)
| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS (clean) |
| `eslint .` | 76 problems (23 err / 53 warn) — NOT build-gating |
| `npm run prebuild` | **GREEN** after fixing self-introduced `docsIntegrityGuard` break in the audit doc |

### Key findings (full detail in audit doc)
- **P0 (owner):** Cursor Cloud injected rules still reference deleted `agent-ops.mdc` + mandate `AUDIT_DEBT_BRIEF.md`; on-disk core-rules already resolved this → re-sync dashboard rules.
- **P1 product:** Consistency Score still ships (`app/compare/CompareContent.tsx`, dead `components/politicians/ConsistencyScore.tsx`/`CredibilityConsistency.tsx`); DonorChart individuals-before-PACs; topic-title 80 / evidence-117 drift; silent-empty sections; non-canonical honest-gap strings; lingering "(demo)" labels with FEC data.
- **P1 data/CI:** dual-vintage `asOf` on FL page (rebuild `state-economic.json` slice); ingest overwrite-on-failure risks (rankings/BEA/counties/openstates/sam/govinfo/news); missing `--members` on national syncs; `react-simple-maps` peer-invalid with React 19; `refresh-data.yml` missing Playwright install.
- **P1 docs:** push/merge gate ambiguity; corroboration/`'alleged'` rule disagreement; migrated count 6-vs-7; Census keyless policy; session-start order + handoff retention.

### Self-introduced defect (fixed same session — Owner visibility)
First audit-doc draft cited nonexistent/renamed paths (`agent-ops.mdc`, `BillCard.tsx`,
`FloridaByTheNumbers.tsx`, wrong county path, `-sample` script name) → broke `docsIntegrityGuard`
→ `prebuild` failed. Corrected all citations to real paths; re-ran prebuild GREEN. No product/data touched.

### Commands run (this session)
- `npx tsc --noEmit` → exit 0
- `npx eslint .` → 76 problems, exit 1
- `npm run prebuild` → fail (docsIntegrityGuard, this file) → fixed → exit 0
- `npx tsx --test scripts/__tests__/docsIntegrityGuard.test.ts` → 6/6
- 4× read-only explore subagents (instructions / app+components / lib+scripts / config-CI-data)
- Census `KeySignup` POST → 302 create_success.html

### Files touched (this session)
| Path | Action | What changed |
|------|--------|--------------|
| `docs/workflows/PLATFORM_AUDIT_READ_ONLY_2026-07-19.md` | rewritten | Accurate consolidated deep-audit findings + corrected citations |
| `docs/workflows/AGENT_HANDOFF_LOG.md` | modified | Current state + this session |

### Open / next
- Owner: re-sync Cursor Cloud rules (P0); Vercel consolidate rename; Census email activate
- Claude: review audit + PR #39 → APPROVAL + ordered repair brief (order in audit doc)
- Cursor: implement only after Claude brief; no merge/deploy/Phase P until then

## Latest session — Full 67-county ingest (while Claude down) (PASS)

### Objective
Productive work without merge/deploy: replace SAMPLE n=10 county lists with full FL ACS county set so top/lowest 5 income & home value are statewide.

### Verdict / outcome
**PASS (local)** — `ingest:fl-counties` keyless path via data.census.gov wrote **67 counties**, coverage=`full`, BLS LAUS unemployment **67/67**, attainment live. SAMPLE badge gated on `isSample`/`coverage`. Render-integrity 4/4. **No merge. No deploy.**

### Evidence
- Top income counties: St. Johns, Santa Rosa, Nassau, Collier, Clay (no longer sample-only)
- Lowest income: Putnam, Calhoun, Gadsden, Taylor, Glades
- Top home values: Monroe, Collier, St. Johns, Miami-Dade, Palm Beach

### Commands
- `npm run ingest:fl-counties` → 67 counties full
- `npm run test:typecheck` / unverified / copy → pass
- `RENDER_INTEGRITY_SKIP_POSTBUILD=1 npm run build` → pass
- `npm run test:render-integrity` → 4/4

### Open / next
- Await Claude APPROVAL on PR #39 tip
- Owner: Vercel consolidate to Approved
- Do not start Phase P

## Latest session — Self-audit PR #39 (no merge/deploy) (PASS)

### Objective
Claude temporarily unavailable. Continue progress without implementing/merging: thorough self-audit of PR #39, fix verified defects, re-gate locally. Do **not** merge or deploy until Claude APPROVAL.

### Verdict / outcome
**PASS (audit)** — ranks/age/COL independently re-verified; two UX defects fixed (employment rank mislabel; COL rank direction hint). Local gates green. **No merge. No Vercel deploy.** Awaiting Claude.

### Independent verification (not producer logic)
| Check | Expected | Actual |
|---|---|---|
| Age % sum | ~100 | **100.0** |
| Income rank | ACS B19013 | **#34** match |
| Home rank | ACS B25077 | **#21** match |
| Population rank | ACS B01003 | **#3** match |
| Bachelor's+ rank | ACS B15003 | **#26** (33.2%) match UI |
| Unemployment rank | ACS DP03 | **#21** (4.8%) match |
| BEA/FRED RPP | FL 2024 | **103.4**, cheapest→#1 = **#41** (most-expensive→#1 would be #10) |

### Defects found & fixed this turn
| # | Defect | Fix |
|---|---|---|
| 1 | "People with jobs" card showed bare unemployment-rate rank | `RankChip hint="Joblessness"` |
| 2 | COL `#41 of 50` unclear (ascending = cheaper) | `RankChip hint="Lower cost → #1"` |
| 3 | Handoff HEAD stale (`d3bacd4` vs tip) | refreshed Current state |
| 4 | SampleBadge comment used banned process phrase | reworded comment |

### Intentionally open (not bugs)
- County top/bottom 5 still SAMPLE n=10 — needs `CENSUS_API_KEY` for full 67
- BEA components/metros empty without `BEA_API_KEY` (all-items via FRED is live)
- Vercel Hobby rate-limit — owner consolidation
- Merge blocked until Claude APPROVAL

### Commands run (this session)
- Independent Census/FRED recompute → ranks match committed JSON
- `npm run test:typecheck` → exit 0
- `npm run test:state-economic-display` → 13/13
- `npm run test:copy-compliance` → 3/3
- `npm run test:no-unverified-official-data` → 7/7
- `npm run test:render-integrity` → 4/4

### Open / next
- Keep PR #39 open; push audit fixes; **do not merge**
- When Claude returns: request APPROVAL on tip
- Then merge → deploy Approved → owner mobile visual sign-off → Phase P

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
