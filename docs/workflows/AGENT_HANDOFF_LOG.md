# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

---

**Current state (2026-07-10):**
- Branch: `cursor/florida-state-page-70a6` (FL review) · `main` at `4cbdd78`
- HEAD (FL branch): `ee01636` (feature `9826aff`)
- PR: **#23** FL draft (STOP) · #20/#21 merged to `main`
- Tree: dirty → commit this turn · prebuild + build + render-integrity: **green**
- **STOP** — Florida page on review branch for combined Claude render review; **do not merge**

---

## Latest session — Handoff 2026-07-10 Step 2 polish (STOP for Claude)

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
