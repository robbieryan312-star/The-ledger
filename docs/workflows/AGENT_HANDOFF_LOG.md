# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

---

**Current state (2026-07-16):**
- Branch: `cursor/critical-bug-management-5c37` · task commit `f14079a`
- PR: pending creation for profile data preservation fix
- Tree: docs handoff log dirty before this log commit
- Build status: **PASS** (`npm run test:source-integrity && npm run test:typecheck`; `npm run build`)

## Improvement backlog

| Date | Item | Status |
|------|------|--------|
| 2026-07-16 | Add a direct unit wrapper around `refresh-migrated-profile-votes.ts` payload generation; current guard covers the shared preserve helpers and full build, but the script entrypoint is still only integration-covered. | open |

## Latest session — profile apply data preservation (COMPLETE)

### Objective
Fix high-severity profile data loss where shallow national snapshots could overwrite prior-good migrated profile votes, finance, and derived Said-Did/org-vote data.

### Verdict / outcome
**PASS** — profile apply paths now preserve prior-good votes when fresh vote input is shallower, preserve prior finance when fresh finance is missing, and preserve prior Said-Did links when fresh pairing output regresses. Locked migrated profiles are guarded at 30-vote depth.

### Commits
- `f14079a` — fix(profile): preserve prior data on shallow refresh
- Handoff log commit: pending in this docs-only commit

### Commands run (this session)
- `pwd && git status --short --branch && git remote -v && git log --oneline --decorate -12 && for pr in 24 26 27 28; do gh pr view "$pr" --json number,state,mergedAt,closedAt,url,title; done && if [ -f /tmp/cursor/async-install/install-user.status ]; then printf 'async-install status: '; tr -d '\n' < /tmp/cursor/async-install/install-user.status; printf '\n'; elif [ -f /tmp/cursor/async-install/install-user.log ]; then pgrep -af 'install-user|npm install|pnpm install|yarn install' || true; printf 'async-install log exists without status\n'; else printf 'async-install absent\n'; fi` -> exit 0; branch correct, PRs #24/#26/#27/#28 open, async install absent
- `git show --stat --summary --find-renames --find-copies d8ed82b d022ab7 f92c973 7d65007 f85b7ac a0523c2 b2586b0 21e4bde 4cbdd78` -> exit 0; recent render/CI changes inspected
- `gh pr diff 26 --name-only && gh pr diff 26` -> exit 0; PR #26 fixes only `sync-topic-positions`, not profile apply paths
- `npm run test:source-integrity` -> exit 0; focused guard passed
- `npm run test:typecheck` -> exit 2; readonly helper return type rejected
- `npm run test:typecheck` -> exit 0 after helper return fix
- `npm run build` -> exit 0; full prebuild, Next build, postbuild client chunks passed
- `npx tsx -e "import { MIGRATED_PROFILE_BIOGUIDES } from './lib/data/memberProfile.ts'; import { readFileSync } from 'node:fs'; for (const id of MIGRATED_PROFILE_BIOGUIDES) { const votes = JSON.parse(readFileSync(`lib/data/generated/profiles/${id}/votes.json`, 'utf8')); console.log(`${id}: ${votes.votes?.length ?? 0}`); }"` -> exit 1; shell interpolation broke template strings
- `npx tsx -e 'import { MIGRATED_PROFILE_BIOGUIDES } from "./lib/data/memberProfile.ts"; import { readFileSync } from "node:fs"; for (const id of MIGRATED_PROFILE_BIOGUIDES) { const votes = JSON.parse(readFileSync(`lib/data/generated/profiles/${id}/votes.json`, "utf8")); console.log(`${id}: ${votes.votes?.length ?? 0}`); }'` -> exit 0; all seven locked profiles show 30 votes
- `npm run test:source-integrity && npm run test:typecheck` -> exit 0 after finance preservation addition
- `npm run build` -> exit 0 after finance preservation addition
- `git status --short && npx tsx -e 'import { MIGRATED_PROFILE_BIOGUIDES } from "./lib/data/memberProfile.ts"; import { readFileSync } from "node:fs"; for (const id of MIGRATED_PROFILE_BIOGUIDES) { const votes = JSON.parse(readFileSync(`lib/data/generated/profiles/${id}/votes.json`, "utf8")); console.log(`${id}: ${votes.votes?.length ?? 0}`); }'` -> exit 0; scoped dirty tree, all seven locked profiles show 30 votes
- `git add lib/data/__fixtures__/profileMigratePreserve.fixture.ts lib/data/__fixtures__/profileVotesSufficiency.fixture.ts lib/data/profileVotesSufficiency.ts scripts/__tests__/profileMigratePreserve.test.ts scripts/lib/profileMigrate.ts scripts/refresh-migrated-profile-votes.ts && git commit -m "fix(profile): preserve prior data on shallow refresh"` -> exit 0; commit `f14079a`

### Files touched
| Path | Action | What changed |
|------|--------|--------------|
| `scripts/lib/profileMigrate.ts` | modified | Preserves prior votes on shallower fresh input before derived links are built; preserves prior finance when fresh finance is missing; keeps prior Said-Did when fresh link output regresses. |
| `scripts/refresh-migrated-profile-votes.ts` | modified | Uses the same preservation helpers for votes/finance and rebuilds org-vote links from preserved votes. |
| `lib/data/profileVotesSufficiency.ts` | modified | Enforces locked migrated profile vote-depth minimums, not just nonzero votes. |
| `lib/data/__fixtures__/profileMigratePreserve.fixture.ts` | modified | Adds append-only shallow-vote regression fixture. |
| `lib/data/__fixtures__/profileVotesSufficiency.fixture.ts` | modified | Adds append-only 30-vote minimums for the seven locked migrated profiles. |
| `scripts/__tests__/profileMigratePreserve.test.ts` | modified | Adds preservation tests for shallow votes, partial Said-Did, and missing finance. |
| `docs/workflows/AGENT_HANDOFF_LOG.md` | modified | This session log and improvement backlog item. |

### Acceptance evidence
- Focused guard: `npm run test:source-integrity && npm run test:typecheck` -> exit 0.
- Full validation: `npm run build` -> exit 0; Next.js 16.2.9 compiled successfully; postbuild client chunk guard passed.
- Current data depth: `C001098: 30`, `M000355: 30`, `M001184: 30`, `O000172: 30`, `P000197: 30`, `S000033: 30`, `W000817: 30`.
- Duplicate handling: memory PRs #24/#26/#27/#28 remain open; PR #26 diff does not touch this profile apply path.

### Open / next
- Open PR and record the new open PR in automation `MEMORIES.md`.

---

## Previous session — render-integrity guard align to semantic ids (COMPLETE)

### Objective
Fix `test:render-integrity` on `main`: guard used `#section-01`/`#section-04` but `/states/FL` renders `#economy`, `#politicians`, `#courts`.

### Verdict
**PASS** — semantic ids aligned; guards.yml green (`29071982833`).

### Commits
- `21e4bde` — semantic `#economy` / `#courts` guard anchors
- `b2586b0` — Playwright install in guards.yml
- `f85b7ac` — render-integrity out of postbuild
- `f92c973` — CI server warmup before Playwright
- `d022ab7` — env.example + final green CI

### Commands run
- `npm run prebuild` → exit 0
- `npm run build` → exit 0 (postbuild render-integrity 2/2)
- `npm run test:render-integrity` → 2/2 pass

### Files touched
| Path | Action | What changed |
|------|--------|--------------|
| `scripts/render-integrity-check.ts` | modified | Poll `id="economy"`; require `#economy`+`#courts`; skip `#politicians` images |

### Acceptance evidence
- render-integrity contact-sheet + FL mobile/desktop screenshots (runtime under data/reports/, gitignored)
- postbuild `test:render-integrity` 2/2 in full `npm run build`

---

## HANDOFF 2026-07-10 — Florida state page redesign: LOCKED design + build brief

**From:** Claude Code · **To:** Cursor · **Status:** design locked (owner-approved), ready to build.
**Owner sign-off:** owner reviewed the mockup across multiple rounds and said "good enough for now,
let's continue" — treat the design below as the reference spec. **Do not merge to `main`;** build on a
review branch and STOP for one combined Claude review (per the sequencing directive).

### Build order (Claude decision 2026-07-10 — binding, no owner ping-pong)
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

## Prior backlog (pre-2026-07-10, from the read-only sweeps)
Governor portraits (now covered by `test:identity-integrity`), roster guard, BLS series catalog,
map-sidebar identity audit, nav tap-to-open, pre-expansion batch gate, branch reconcile (#20 platform
+ #21 docs → `main` for a visible baseline). Reconcile the divergent guard lists on merge.
