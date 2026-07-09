# Agent Handoff Log — Cursor ↔ Claude

**Purpose:** Durable cross-agent communication on disk. Claude Code reads **this file**, not chat.
Every Cursor session that produces or verifies work logs here before the turn ends (§1.1 J).
Agents also maintain the **Improvement backlog** below — proactive fixes and enhancements
noticed during review, even when out of scope for the current brief.

**Former name:** `AUDIT_DEBT_BRIEF.md` (stub redirect remains at old path).

---

**Current state (2026-07-09):**
- Branch: `cursor/docs-consolidation-70a6` (Part B docs) · `cursor/platform-phases-1-2-3-70a6` (Part A platform)
- HEAD (docs): `5f4bd6b` · HEAD (platform remote): `f8903ff`
- PR: Part A **#20** (draft) · Part B **#21** (draft)
- Tree: clean · prebuild + build: **green** (docs branch)
- **STOP** — both PRs held for Claude review before owner visual pass; **do not merge**

---

## Improvement backlog

*Agents: append rows when you notice a credible improvement. Do not remove rows without
owner/Claude decision — mark **Status** instead. Distinct from Owner visibility findings
(defects in spec); these are proactive enhancements.*

| ID | Area | Suggestion | Priority | Status | Surfaced by | Notes |
|----|------|------------|----------|--------|-------------|-------|
| IMP-001 | Data / governors | **Governor portrait pipeline** — Tier-1 `.gov` executive portraits for all 50 governors; DeSantis currently falls back to initials | P1 | open | Platform P0 review | After `governor-identity` guard lands |
| IMP-002 | Guards / roster | **Roster generator hardening** — guard that featured governors never receive `bioguideId` unless `bioguideMatchesCurrentLegislator()` passes | P0 | open | Platform P0 review | Prevents DeSantis-class regression |
| IMP-003 | Data / BLS | **BLS series catalog** — frozen fixture of verified series IDs + monotonic value ranges; ingest fails on drift | P1 | open | Platform P1 review | Pair with `ingest:bls-education-fl` |
| IMP-004 | Data / FL | **Florida CPI honest gap** — wire FL-specific CPI when available without breaking national-reference fallback | P2 | open | Platform P4 review | UI already shows national ref |
| IMP-005 | Keys / courts | **`COURTLISTENER_API_KEY`** — EMPTY blocks court enrichment before national judiciary scale | P2 | open | Session review | See `KEYS.md` |
| IMP-006 | UX / compare | **Election compare wiring** — `buildCompareUrl()` still returns bare `/compare`; connect Elections → `?election=` when pipeline lands | P2 | open | Platform A2 review | Mode routes done; election param pending |
| IMP-007 | Guards / map | **Map sidebar identity audit** — extend `governorIdentityGuard` to `USAMap.tsx` state sidebar cards | P1 | open | Platform P0 review | Same class as DeSantis fix |
| IMP-008 | Docs / profiles | **Profile dedup visibility** — document canonical ID when featured slug (`ron-desantis`) and `gov-fl` coexist | P2 | open | Platform P0 review | Owner-facing clarity |
| IMP-009 | UX / nav | **Navigation click-to-open** — mobile/tablet dropdown toggle (hover-only is desktop-only today) | P2 | open | Platform A3 review | A3 verified desktop hover |
| IMP-010 | Pipeline / scale | **Pre-expansion batch gate** — run locked 7-profile checklist on 20-member pilot before full 537 sync | P0 | open | Core rules §6 | BATCH_SCALING alignment |
| IMP-011 | Guards / merge | **Reconcile prebuild guards** — platform branch has `test:governor-identity` (16 commands); docs branch has 15; merge when PRs reconcile | P1 | open | Part B review | After Claude approval |
| IMP-012 | Data / BLS | **Bachelor's/advanced unemployment docs** — document that only combined `LNS14027662` exists in v1 if UI ever needs single "college+" benchmark | P3 | open | Part A A1 | A1 shows honest gaps for split series |
| IMP-013 | Process / PRs | **Reconcile open PRs** — #20 (platform) and #21 (docs) are independent; docs branch lacks platform code changes | P1 | open | Dual-workstream session | Merge order TBD by Claude |
| IMP-014 | Docs | **`PROGRESS.md` migrated count** — compressed history still says "6 members" in one line; align to 7 | P3 | open | Part B B7 review | Manifest is 7 |
| IMP-015 | Guards / handoff | **`test:handoff-log` guard** — verify `AGENT_HANDOFF_LOG.md` has non-empty Improvement backlog section and Current state HEAD matches within one session of last commit | P2 | open | Owner request 2026-07-09 | Optional build gate |
| IMP-016 | Docs / naming | **Rename complete** — `AUDIT_DEBT_BRIEF.md` → `AGENT_HANDOFF_LOG.md` with stub redirect; update all §1.1 J citations | P2 | **done** | Owner request 2026-07-09 | This session |
| IMP-017 | Rules | **Continuous improvement rule** — agents must surface suggestions to Improvement backlog + rules when noticed (§1.1 J) | P1 | **done** | Owner request 2026-07-09 | `ledger-core-rules.mdc` HARD RULES |

---

## Latest session — Handoff log rename + improvement backlog (COMPLETE)

### Objective

Rename agent work log to accurate name; surface all prior improvement recommendations for
Claude; add binding rule for continuous agent suggestions.

### Verdict / outcome

**COMPLETE** — file renamed, backlog populated, rules updated. **STOP** unchanged for Claude
review of Part A (#20) and Part B (#21).

### Commits

- `f8385a1` — docs: rename AUDIT_DEBT_BRIEF → AGENT_HANDOFF_LOG + improvement backlog
- `04420cf` — docs: fix HEAD hash in agent handoff log
- `f4cfe6b` — docs: final HEAD sync in agent handoff log

### Commands run (this session)

- `git rev-parse --short HEAD` → `c5be82a`
- `git rev-parse --short origin/cursor/platform-phases-1-2-3-70a6` → `f8903ff`

### Files touched

| Path | Action | What changed |
|------|--------|--------------|
| `docs/workflows/AGENT_HANDOFF_LOG.md` | created | Renamed handoff log + improvement backlog |
| `docs/workflows/AUDIT_DEBT_BRIEF.md` | modified | Stub redirect to new path |
| `.cursor/rules/ledger-core-rules.mdc` | modified | Path rename + improvement-backlog HARD RULE + §1.1 J |
| `docs/AGENT_INDEX.md` | modified | Session-start path + workflows table |
| `REPO.md` | modified | Session-start path |
| `docs/workflows/content-maps/b1-agent-ops-merge.md` | modified | Path references |
| `scripts/agent-preflight.ts` | modified | Session-start file list |

### Acceptance evidence

- Improvement backlog: 17 items (IMP-001–017), 15 open + 2 done this session
- All repo references to `AUDIT_DEBT_BRIEF.md` updated or stubbed
- Rules bind agents to append backlog items when noticed

### Open / next

- Claude review Part A (#20) + Part B (#21)
- Owner visual pass after Claude APPROVAL
- Consider IMP-011 guard reconciliation on merge

---

## Session log (last 3 only)

### 3 — Handoff log rename + improvement backlog (2026-07-09)

Renamed file; populated backlog; rules update for continuous suggestions.

### 2 — Part A platform + Part B doc consolidation (2026-07-09)

Platform A1–A3; docs B1–B9 on separate branch. STOP for Claude.

### 1 — Platform fix brief P0–P4 (2026-07-09)

DeSantis guard, BLS education, nav, FL UI; original improvement list surfaced in backlog.
