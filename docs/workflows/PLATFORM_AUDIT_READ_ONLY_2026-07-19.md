# Platform audit — read-only (2026-07-19)

**Mode:** FINDINGS ONLY — no product/code fixes until Claude Code briefs.  
**Tree tip at audit:** `ebdb21e` (PR #39 open) · branch `cursor/fl-by-numbers-ux-70a6`  
**Canonical live:** `https://the-ledger-s4dn.vercel.app` (production SHA `6500b2d` until #39 merges)  
**Auditor:** Cursor cloud agent · multi-agent explore (rules / FL / federal+guards)

---

## Owner actions required before / during Claude review

### 1. Vercel rename — singular future action (agent cannot do without token)

**Status:** No `VERCEL_TOKEN` in this environment. Cursor **cannot** rename the Vercel project via API until a token exists. Renaming in the dashboard is **safe** if you treat it as one deliberate consolidate step (URLs change; GitHub remains source of truth).

**Recommended singular action (when ready):**

1. Open Vercel → project **`the-ledger-s4dn`** → Settings → General → **Project Name** → rename to something clear, e.g. **`the-ledger-approved`** (or `The-Ledger-Approved`).
2. Optionally keep **one** other project as **Beta** (`the-ledger-beta`); **pause or delete** the third so only Approved (+ optional Beta) deploy.
3. Re-point any custom domain to the Approved project only.
4. Update bookmarks: after rename, `*.vercel.app` hostname may change — GitHub Actions still deploys via project link; Production URL in Vercel Settings → Domains is authoritative.

**Optional future (so Cursor/GitHub can rename):** add Runtime Secret / env `VERCEL_TOKEN` (account token with project scope). Then one command becomes possible:

```bash
npx vercel project rename the-ledger-s4dn the-ledger-approved
```

Until that token exists, **dashboard rename is the correct singular action** — do it once when consolidating; do not half-rename while three projects still race.

### 2. Census API key — re-requested this session

| Field | Value |
|-------|--------|
| Form | `https://api.census.gov/data/key_signup.html` POST → `KeySignup` |
| Email | `robbie.ryan312@gmail.com` |
| Org | `The Ledger` |
| Result | **HTTP 302 → `create_success.html`** (signup accepted again) |

**Owner:** Check inbox + spam for Census key email → activate → add Cursor Runtime Secret / `.env.local` as `CENSUS_API_KEY` (never paste value in chat).  
**Note:** FL rankings + full counties already ingest via **keyless** `data.census.gov`; key unlocks rate limits / future ACS volumes — not blocking current FL By the numbers.

### 3. Ideal model for the deep review (Claude side)

| Role | Prefer | Why |
|------|--------|-----|
| **Primary auditor / brief writer** | **Claude Opus 4.8 Thinking High** (`claude-opus-4-8-thinking-high`) | Long-context contradiction hunting, credibility tradeoffs, ordered repair briefs |
| Acceptable alt | GPT-5.6 Sol xhigh | Same class of thoroughness if Opus unavailable |
| Avoid as sole auditor | Composer / “fast” only | Good for narrow patches; weak for platform-wide instruction contradiction |

**Owner:** when Claude returns, paste this file path + PR #39; ask for APPROVAL/REJECT + ordered repair brief. Cursor does not implement until that brief.

---

## Executive verdict

| Area | Verdict |
|------|---------|
| Live Approved FL (6500b2d) | Meets prior Claude deploy acceptance (`section-01`) |
| PR #39 tip (ebdb21e) | Strong FL By-the-numbers polish; **await Claude APPROVAL** before merge |
| Platform instructions | **P0 contradiction** on work-log path; several P1 policy/doc drifts |
| Federal / guards | Solid DNU + AbortSignal coverage; layout-number + RI + silent-empty gaps remain |
| Overall | **NOT flawless** — ship only after Claude-prioritized repair wave |

---

## P0 — must brief first

### DOC-01 · Work-log authority self-contradiction

| Field | Detail |
|-------|--------|
| **What** | Core rules §1.1 J still mandate updating `docs/workflows/AUDIT_DEBT_BRIEF.md`; that file is a stub that **forbids** logging and points to `AGENT_HANDOFF_LOG.md`. Agent-ops still lists AUDIT_DEBT_BRIEF as session-start #2. |
| **Where** | `.cursor/rules/ledger-core-rules.mdc` §1.1 J; `.cursor/rules/agent-ops.mdc`; `docs/workflows/AUDIT_DEBT_BRIEF.md`; `docs/workflows/AGENT_HANDOFF_LOG.md` |
| **Evidence** | Stub: “Do not append session logs here”; handoff log is active; many rules still say AUDIT_DEBT_BRIEF |
| **Severity** | P0 process — agents can violate “mandatory log” either way |
| **Repair (Claude)** | Single canonical path: update core-rules + agent-ops + AGENTS pointers to `AGENT_HANDOFF_LOG.md` only; keep stub as redirect |

---

## P1 — product / data / policy (ordered for Claude)

### FL-01 · Filename says sample; payload is full

| Field | Detail |
|-------|--------|
| **What** | `florida-counties-sample.json` has `"coverage":"full"` and 67 counties |
| **Where** | `lib/data/generated/florida-counties-sample.json`; `scripts/ingest/ingest-florida-counties-sample.ts` |
| **Severity** | P1 naming / ops confusion |
| **Repair** | Rename artifact + script to `florida-counties.json` / `ingest-florida-counties.ts` in one Claude-briefed commit |

### FL-02 · Census REQUIRED vs keyless shipped

| Field | Detail |
|-------|--------|
| **What** | Prior Claude decision: Census key REQUIRED, keyless banned. PR #39 ships keyless ACS for rankings + counties. |
| **Where** | `docs/workflows/AGENT_HANDOFF_LOG.md` (prior); ingest scripts using data.census.gov without key |
| **Severity** | P1 policy debt (works, but contradicts written decision) |
| **Repair** | Claude re-litigate: either (A) ratify keyless ACS as official for public aggregates + document, or (B) require key and fail ingest without it |

### FL-03 · State header U.S. flag, not Florida

| Field | Detail |
|-------|--------|
| **What** | FL page hero uses `/images/us-flag.svg` |
| **Where** | `app/states/[code]/page.tsx` (~line 199) |
| **Severity** | P1 visual — **owner layout decision** |
| **Repair** | Owner: FL flag vs US flag; then Cursor asset + wire |

### FL-04 · Misleading employment / COL rank chips (partially fixed on tip)

| Field | Detail |
|-------|--------|
| **What** | Pre-tip: Employment rate showed Unemployment Rate of States rank; COL used GDP. Tip `ebdb21e` removes false Employment chip + uses BEA RPP via FRED. |
| **Where** | `components/states/FloridaByTheNumbers.tsx`; `florida-state-rankings.json` |
| **Severity** | Was P1 wrong-shipped; **verify on merge** that Approved deploy matches tip |
| **Repair** | Merge #39 only after Claude APPROVAL; curl Approved after deploy |

### FED-01 · Silent empty vs honest-gap copy

| Field | Detail |
|-------|--------|
| **What** | Multiple surfaces return `[]` / omit sections instead of `"No verified record available"` |
| **Where** | e.g. `app/politicians/[id]/page.tsx`, `components/politicians/BillCard.tsx`, `app/elections/page.tsx`, `app/lobbying/page.tsx`, `app/compare/page.tsx` (“No verified data yet” variant) |
| **Severity** | P1 credibility / AGENTS mock-empty policy |
| **Repair** | Inventory + standardize empty-state strings per surface (Claude brief) |

### FED-02 · Layout-number drift (locked demo numbers)

| Field | Detail |
|-------|--------|
| **What** | Evidence 120 vs locked 117; topic title 100 vs 80; DonorChart individuals-first vs PAC-first rule; composition demo in DonorChart |
| **Where** | `ExpandableEvidenceRow.tsx`, `ProfileRecordByTopicPanel.tsx`, `DonorChart.tsx`; core-rules §4 |
| **Severity** | P1 spec violation |
| **Repair** | Align constants + ordering; remove/gate demo composition |

### FED-03 · Render-integrity `fullPage: false` + Vercel skip

| Field | Detail |
|-------|--------|
| **What** | RI intentionally not full-page; postbuild skips RI on `VERCEL=1` (PR #37) — CI must remain green |
| **Where** | `scripts/test-render-integrity.mjs`; `package.json` postbuild |
| **Severity** | P1 coverage gap (known tradeoff) |
| **Repair** | Claude: keep skip + document; or later CI-only fullPage true |

### DOC-02 · Merge/push gate conflict

| Field | Detail |
|-------|--------|
| **What** | Core “approval before push” vs cloud “push feature branches / open PRs”; AGENTS “owner may direct commits to main” vs Cursor-only merge |
| **Where** | ledger-core-rules; AGENTS.md; cloud task instructions |
| **Severity** | P1 process confusion |
| **Repair** | One paragraph: feature push OK; `main` merge only on Claude APPROVAL |

### DOC-03 · Handoff retention / dual-log mess

| Field | Detail |
|-------|--------|
| **What** | “Last 3 sessions” vs long numbered history + “Sessions 1–21 condensed”; AUDIT_DEBT stub vs live log |
| **Where** | AGENT_HANDOFF_LOG.md; AUDIT_DEBT_BRIEF.md |
| **Severity** | P1 docs |
| **Repair** | After DOC-01: define retention (e.g. Current state + last 3 detailed + archive link) |

### DOC-04 · Stale KEYS / SOURCE_LOOKUP vs shipped FL pipeline

| Field | Detail |
|-------|--------|
| **What** | Docs may still say Census key required / omit FRED RPP path / BEA optional |
| **Where** | `KEYS.md`, `SOURCE_LOOKUP.md`, `STATE_PIPELINE_LOCKED_SPEC.md` |
| **Severity** | P2–P1 doc drift |
| **Repair** | Sync docs to actual ingest (keyless ACS + FRED RPP + optional BEA/Census key) |

---

## P2 — polish / hygiene (sample; not exhaustive)

| ID | Finding | Where |
|----|---------|--------|
| HY-01 | `as any` / loose typing in places | various `lib/`, components |
| HY-02 | Large generated JSON in git (expected) — ensure wipeability documented | `lib/data/generated/` |
| HY-03 | Duplicate npm script aliases / overlapping docs | package.json, docs/ |
| HY-04 | `floridaEconomicSnapshot` still carries SAMPLE provenance for some fields while counties full — clarify in UI copy | snapshot JSON |
| HY-05 | Controversies / News / Endorsements depth uneven vs checklist | PILOT_PROFILE_CHECKLIST vs generated |
| HY-06 | Elections/lobbying/compare still placeholder surfaces | app/ |
| HY-07 | Phase P still GATED — correct; do not start until owner mobile sign-off on **deployed** Approved | PROGRESS / handoff |
| HY-08 | Three Vercel projects still rate-limit each other until owner consolidates | Vercel dashboard |

---

## What looks solid (do not reopen without cause)

- FL By the numbers provenance footers + SAMPLE badge only when `coverage=sample` / n&lt;67 (tip)
- Full 67-county ACS + BLS LAUS unemployment join
- State ranks verified independently (income #34, home #21, pop #3, bach+ #26, unemp #21; age % sum 100)
- DNU / mock-key guards still build-gated
- Sync scripts broadly use `AbortSignal.timeout`
- Port 4112 for render-integrity (not 3000)
- SSR route pages (no `'use client'` on `app/**/page.tsx` sampled)
- bioguideId join on FL roster ↔ politicians

---

## Suggested Claude brief order (after APPROVAL process)

1. **DOC-01** — fix work-log canonical path (zero product risk)
2. **Approve or reject PR #39** — FL UX + rankings + counties full
3. **FL-02** — ratify or ban keyless Census
4. **FED-02** — layout number + DonorChart order
5. **FED-01** — honest-gap empty states
6. **FL-01** — rename counties artifact
7. **DOC-02/03/04** — process + KEYS drift
8. **FL-03** — only after owner flag decision
9. Deeper line-by-line wave 2 (HY-*) after wave 1 green

---

## Explicit non-actions this session

- No merge of PR #39
- No product code edits from findings
- No Phase P
- No Vercel project rename (no token; owner dashboard)
- Census signup re-submitted; key activation = owner email

---

## Evidence commands (this session)

```text
Census KeySignup → 302 create_success.html
git rev-parse HEAD → ebdb21e (pre-docs commit; see handoff after audit commit)
Explore agents: rules contradictions; FL stack; federal+guards
```
