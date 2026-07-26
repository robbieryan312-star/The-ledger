# Improvement backlog — SINGLE canonical source

**This is the only improvement backlog.** GitHub / this file is the fountainhead. Agents must
not create a second backlog table in `AGENT_HANDOFF_LOG.md`, chat, or parallel docs.
`AGENT_HANDOFF_LOG.md` is the running work log only — it points here.

**Guard:** `scripts/__tests__/improvementBacklogGuard.test.ts` fails the build if (a) any
`## Improvement backlog` heading appears outside this file, (b) this file's `## Backlog`
heading is duplicated anywhere under `docs/` (must appear exactly once, here only), or
(c) a second backlog markdown file appears under `docs/workflows/`.

---

## Owner / dashboard state (mirror — GitHub is source of truth)

External truths both agents must share (dashboard drift is **owner-only** to fix; repo records it):

| Fact | Canonical value | Owner action if drifted |
|------|-----------------|-------------------------|
| Vercel project | **Only** `the-ledger-main` → https://the-ledger-main.vercel.app (renamed from `the-ledger-s4dn` 2026-07-21; old hostname retired) | Keep one project; Production Branch=`main`; delete stale GitHub Environments (`* – the-ledger-s4dn` etc.) |
| Vercel Production Branch | **`main`** | Set Production Branch = `main` |
| Deploy model | Production advances **only** on merges to `main`; non-main deploys disabled via repo `vercel.json` (`git.deploymentEnabled`) | Confirm dashboard matches |
| Cursor Cloud injected rules | Must **mirror** on-disk `.cursor/rules/` (`ledger-pre-ingest.mdc`, `ledger-core-rules.mdc`, `ledger-data-policy.mdc`, `ledger-editorial-voice.mdc`, `ledger-build-workflow.mdc`) — **no** `agent-ops.mdc` (deleted/merged into core-rules) | Re-sync Cloud project rules (DOC-01) |
| Work log path | `docs/workflows/AGENT_HANDOFF_LOG.md` (not `AUDIT_DEBT_BRIEF.md` except as redirect stub) | Cloud rules must not mandate the old path |

---

## Backlog

| ID | Item | Priority | Owner | Status | Source-of-truth link |
|----|------|----------|-------|--------|----------------------|
| DOC-01 | Cursor Cloud injected rules out of sync — still reference deleted `agent-ops.mdc`; must mirror repo `.cursor/rules` | P0 | owner | open | `docs/archive/workflows/PLATFORM_AUDIT_READ_ONLY_2026-07-19.md` §DOC-01 |
| DOC-07 | ~~Two `## Improvement backlog` tables in handoff~~ → closed by this file | P1 | cursor | **done** | this file + `improvementBacklogGuard` |
| AUDIT-DOC | Platform audit DOC-03–DOC-17 contradictions (push gate, session-start order, corroboration, migrated count 7, honest-gap copy, guard counts) | P1 | claude | open | `docs/archive/workflows/PLATFORM_AUDIT_READ_ONLY_2026-07-19.md` |
| AUDIT-UI | Consistency Score removal, DonorChart PAC-first, layout-number drift, silent-empty sections | P1 | owner + claude | open | platform audit P1 product |
| AUDIT-DATA | FL dual-vintage asOf; ingest preserve-on-failure gaps (rankings, BEA, counties, openstates/sam/govinfo/news) | P1 | cursor | open | platform audit P1 data |
| AUDIT-CI | `refresh-data.yml` missing Playwright install for render-integrity postbuild | P1 | cursor | open | platform audit P1 CI |
| DEP-01 | `react-simple-maps` React 19 peer invalid (legacy-peer-deps masks); unify Node 20/22 in CI | P2 | cursor | open | platform audit P2 / `npm ls react-simple-maps` |
| NPM-01 | `npm audit`: remaining vulns upstream Next / react-simple-maps (no force-downgrade) | P2 | cursor | open | `docs/archive/workflows/NPM_AUDIT_2026-07-18.md` |
| VERCEL-NAME | ~~Rename display `the-ledger-s4dn`~~ → **done as `the-ledger-main`** (owner 2026-07-21); optional later rename to “Approved” | P2 | owner | **done** (name sync) | #78 + this file |
| NEWS-01 | Guard: national news refresh semantics — empty success vs fetch-failed | P1 | cursor | open | handoff backlog 2026-07-11 |
| IMP-015 | Handoff-log guard optional | P2 | cursor | open | prior IMP-015 |
| IMP-MOBILE | Sanders profile mobile overflow — deferred from render batch | P2 | cursor | open | prior IMP-NEW |
| IMP-011 | Guards reconciled on main (prebuild count) | P2 | cursor | **done** | historical |
| IMP-013 | #20+#21 merged to main | P2 | cursor | **done** | historical |
| IMP-RENDER-CI | Render CI flake — `waitForSelector` fix | P2 | cursor | **done** | historical |
| IMP-VOTESMART-RETIRE | VoteSmart NPAT permanently unwired — no key will be provided; route official issues → Ballotpedia → CREC Said (+ roll-call Did). Guard: `voteSmartRetiredGuard` | P1 | cursor | **done** (PR **#91** merged @ `7433264`) | KEYS.md · SOURCE_LOOKUP · `sync-topic-positions.ts` |
| IMP-VOTESMART-PURGE | Owner-overrule: zero live `votesmart` (history exempt only); no tombstone; generic `approvedSourceMatrixGuard` | P0 | cursor | **done** (merged `59f427a`) | `approvedSourceMatrixGuard.test.ts` · `lib/data/approvedSourceMatrix.ts` |
| IMP-PRE-INGEST | Pre-ingest = Cursor compliance gate — `ledger-pre-ingest.mdc` alwaysApply; full Cursor corpus absolute compliance; EMPTY≠owner debt; RETIRED never requested; `preIngestRuleGuard` | P0 | cursor | **done** (PR **#91**) | `.cursor/rules/ledger-pre-ingest.mdc` · core-rules HARD RULE · `preIngestRuleGuard` |
| IMP-POS-AGG-ALT | Position aggregation without VoteSmart — deepen official-issues + Ballotpedia channel + CREC Said pairing; no parallel NPAT substitute API | P2 | cursor | open | `sync:official-issues-positions` · `prove:ballotpedia-platform` · `sync:topic-positions --full-depth` |
| IMP-CREC-YIELD | CREC yield: stop silent-drop of valid Said when topic maps to legislation catch-all; per-stage reject counters; student-debt→education preference | P0 | cursor | **done** (merged `42818b1`) | `sync-topic-positions.ts` · `diagnose-crec-yield.ts` · `recordTopicBuckets.ts` · crec fixtures |
| IMP-ALLEGED-POLICY | alleged = contested person-claim only; banned surfaces omit; news listings keep media; verbatim+outcome on Controversies | P0 | cursor | **done** (tip `db23b39` — STAGE THREE) | `ledger-data-policy.mdc` · `allegedPolicyGuard.test.ts` · `newsCorroboration.ts` |

---

## How to update

1. Edit **this file only** for backlog status/items.
2. Log session work in `docs/workflows/AGENT_HANDOFF_LOG.md` (no backlog tables there).
3. New defect classes → new ID row here + fixture/guard when required by core-rules §6.
