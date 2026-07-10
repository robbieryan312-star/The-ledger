# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

---

**Current state (2026-07-10):**
- Branch: `cursor/florida-state-page-70a6` (FL review) · `main` at `4cbdd78`
- HEAD (FL branch): `128878f`
- PR: **#23** FL draft (STOP) · #20/#21 merged to `main`
- Tree: clean · prebuild + build + render-integrity: **green**
- **STOP** — Florida page on review branch for combined Claude render review; **do not merge**

---

## Latest session — Handoff 2026-07-10 execution (STOP for Claude)

### Objective

Execute binding build order: merge #20+#21 → identity/render guards → Florida flagship page per locked mockup.

### Verdict / outcome

**STOP for Claude review** — Steps 0–2 complete on branch; Step 3 (propagation) **not started** per brief.

| Step | Status | Evidence |
|------|--------|----------|
| 0 Baseline merge | **PASS** | `a1f9652` merge #20+#21; 17 prebuild guards union; main build green |
| 1 Guards | **PASS** | `df36b3f` on main: `test:identity-integrity` + `test:render-integrity` |
| 2 Florida page | **PASS (review branch)** | Rail+canvas `/states/FL` §01–§06; sample data; render screenshots |
| 3 Propagation | **NOT STARTED** | Awaits Claude approval of FL page |

### Commits

**main:**
- `a1f9652` — merge PR #20 platform + PR #21 docs (16→17 guard union)
- `df36b3f` — feat(guards): identity-integrity + render-integrity + mockup + rules HARD RULES

**cursor/florida-state-page-70a6:** `128878f`

### Commands run (this session)

- `git merge origin/cursor/platform-phases-1-2-3-70a6` → fast-forward to `f8903ff`
- `git merge origin/cursor/docs-consolidation-70a6` → conflict resolve → `a1f9652`
- `npm run prebuild` → exit 0 (main)
- `npm run build` → exit 0 (main + FL branch)
- `npm run test:identity-integrity` → 4/4 pass
- `npm run test:render-integrity` → 2/2 pass; screenshots in `data/reports/render-integrity/`
- `npx playwright install chromium`

### Files touched (FL branch)

| Path | Action | What changed |
|------|--------|--------------|
| `components/states/FloridaStateDashboard.tsx` | created | Rail+canvas §01–§06 SSR layout |
| `app/states/[code]/page.tsx` | modified | SSR shell loads sample data, renders dashboard |
| `data/florida/census/florida-counties-sample.json` | created | 10-county ACS sample |
| `data/florida/bea/florida-rpp-sample.json` | created | BEA RPP cost-of-living sample |
| `data/florida/taxes/florida-tax-burden-sample.json` | created | Federal+FL tax tables sample |
| `lib/data/floridaDashboard.ts` | created | Server-side loaders |
| `scripts/render-integrity-check.ts` | modified | Port 4112, SSR wait, §04 image carve-out |

### Acceptance evidence

- `/states/FL`: `#section-01`–`#section-06` in SSR HTML
- Render contact-sheet: `data/reports/render-integrity/_states_FL_mobile.png`, `_desktop.png`
- Education panel: `data-testid="fl-education-earnings-panel"` fluid grid
- Occupations: honest gap (empty `florida-occupations.json`)
- Sitemap: `/states/FL` present

### Open / next

- Claude combined review (render screenshots + code)
- Owner visual pass after APPROVAL
- Step 3 propagation after FL locked
- Add profile pages to render-integrity batch after Sanders mobile overflow fixed

---

## HANDOFF 2026-07-10 — Florida state page redesign (reference spec)

*(Full locked spec retained below — see `docs/design/fl-state-page-mockup.html`)*

### Build order (binding)
0. Baseline merge — **DONE** (`main` `df36b3f`)
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
| IMP-NEW | open | Sanders profile mobile overflow — add to render-integrity deferred list after fix |
| IMP-NEW | open | Govtrack portrait load in headless CI — identity guard covers; render skips §04 external imgs |

---

## Session log (last 3 only)

### 3 — Handoff 2026-07-10 execution (2026-07-10)

Merge, guards, FL page on review branch. STOP for Claude.

### 2 — Handoff log rename (2026-07-09)

Agent handoff log + improvement backlog.

### 1 — Part A + Part B (2026-07-09)

Platform + docs branches. STOP for Claude.
