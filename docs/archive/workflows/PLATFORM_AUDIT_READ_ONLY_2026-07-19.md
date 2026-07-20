# Platform audit — read-only (2026-07-19)

**Mode:** FINDINGS ONLY — no product/code fixes until Claude Code briefs. (Exception: this file's
own citations were corrected in-session because a first draft broke the `docsIntegrityGuard`
build gate — see AUDIT-META below. Correcting a self-introduced gate break is mandatory cleanup,
not a product change.)

**Method:** four parallel read-only passes — (1) instructions/docs contradictions, (2) `app/` +
`components/`, (3) `lib/` + `scripts/`, (4) config/CI/generated-data — plus real gate runs
(`eslint`, `tsc --noEmit`, full `prebuild` guard suite). Nothing in product code or data was
modified.

**Branch:** `cursor/fl-by-numbers-ux-70a6` (PR #39) · product tip `ebdb21e`.
**Canonical live:** `https://the-ledger-s4dn.vercel.app`.
**Auditor model recommendation for the follow-up brief:** Claude Opus 4.8 Thinking High.

---

## Real gate results (this session)

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `tsc --noEmit` | **PASS** (exit 0, clean) |
| Lint | `eslint .` | **76 problems — 23 errors, 53 warnings** (exit 1). Lint is NOT in `prebuild`, so it does not gate build. |
| Prebuild guards | `npm run prebuild` | **FAIL initially** — `docsIntegrityGuard` tripped by this audit file's own stale path citations (now fixed). All other guards green. |

Lint error classes: 4× `prefer-const`, ~6× `@typescript-eslint/no-explicit-any`, ~7×
`react-hooks/set-state-in-effect`, ~5× `react-hooks/static-components`, plus 53
`no-unused-vars` warnings. Full list in findings CODE-LINT.

---

## AUDIT-META — self-introduced gate break (fixed in-session)

| Field | Detail |
|-------|--------|
| **What** | First draft of this file cited paths that do not exist on disk, tripping `scripts/__tests__/docsIntegrityGuard.test.ts` ("every backtick repo path cited in docs exists"). |
| **Bad citations** | `agent-ops.mdc` (deleted; merged into core-rules §7); a `politicians/BillCard.tsx` (no such file); a `states/FloridaByTheNumbers.tsx` (real UI is `components/states/FloridaStateDashboard.tsx`); `florida-counties-sample.json` under the wrong `generated` root (real path `data/florida/census/florida-counties-sample.json`); a `-sample` ingest script name (real script already renamed to `scripts/ingest/florida/ingest-florida-counties.ts`). |
| **Why green before** | The guard skips `docs/workflows/content-maps/`, so a pre-existing content-map citing `agent-ops.mdc` was exempt; this file lives in `docs/workflows/` and is scanned. |
| **Severity** | P1 (I broke the build gate on the PR branch). |
| **Action** | Fixed all citations here; re-ran `prebuild` to green. No product/data change. |

**Lesson worth a guard/rule note (for Claude):** an audit doc that names not-yet-existing or
renamed paths in backticks will fail the build. Either (a) reference nonexistent/deleted files
without backtick-path form, or (b) add a small `ALLOW_MISSING_PATHS`-style exemption for
clearly-marked "proposed/renamed" citations.

---

## Executive verdict

| Area | Verdict |
|------|---------|
| Route architecture (SSR) | **Solid** — all `app/**/page.tsx` are server components; no `'use client'` on route pages |
| Data credibility guards | **Strong** — DNU/mock ban, provenance on dashboard files, fetch timeouts, CI render-integrity |
| Instructions | **NOT internally consistent** — one P0-for-cloud desync + many P1 contradictions (work-log, push gate, corroboration rule, migrated-profile count, layout numbers, Census policy) |
| Product UI | **Several P1 spec violations** — Consistency Score still ships, DonorChart order, layout-number drift, silent-empty sections, non-canonical honest-gap strings, lingering "(demo)" labels |
| Data freshness | **P1** — dual-vintage `asOf` on the FL page (county set refreshed; economic slice stale) |
| Dependencies/CI | **P1** — `react-simple-maps` peer-invalid with React 19; `refresh-data.yml` missing Playwright install |
| Overall | **NOT yet flawless** — ship only after a Claude-prioritized repair wave |

---

## P0 — brief first

### DOC-01 · Cursor Cloud injected rules are out of sync with the on-disk repo

| Field | Detail |
|-------|--------|
| **What** | The on-disk ruleset was consolidated: `agent-ops.mdc` was **deleted/merged into `.cursor/rules/ledger-core-rules.mdc` §7**, and the canonical work log is now `docs/workflows/AGENT_HANDOFF_LOG.md` (old `AUDIT_DEBT_BRIEF.md` is a redirect stub). But the **Cursor Cloud project rules injected into agent sessions still contain `agent-ops.mdc` and still mandate updating `AUDIT_DEBT_BRIEF.md`**. Cloud agents therefore follow rules that no longer match the repo. |
| **Where** | Cursor Cloud project-rules config (dashboard) vs on-disk `.cursor/rules/` (only 4 `.mdc` files; no `agent-ops.mdc`) |
| **Evidence** | On-disk `ls .cursor/rules/` → `ledger-core-rules.mdc`, `ledger-data-policy.mdc`, `ledger-editorial-voice.mdc`, `ledger-build-workflow.mdc`. Injected session rules include `agent-ops.mdc` + heavy `AUDIT_DEBT_BRIEF.md` mandate language. |
| **Severity** | **P0** for cloud agents (they can follow deleted policy) |
| **Repair** | **Owner action:** re-sync Cursor Cloud project rules with the merged on-disk core-rules §7 (remove `agent-ops.mdc`; point work-log to `AGENT_HANDOFF_LOG.md`). Cursor cannot edit the dashboard rules from the repo. |

> Note: my earlier draft flagged a core-rules internal contradiction on the work-log path. That is
> **already resolved** in `ledger-core-rules.mdc` §1.1 J (it now names `AGENT_HANDOFF_LOG.md`). The
> live problem is the **cloud-injected** copy, plus stale narrative references (see DOC-02).

---

## P1 — Instructions (contradictions / duplicates / stale)

| ID | What | Where | Fix |
|----|------|-------|-----|
| DOC-02 | Stale work-log references still call the resolved path a P0 and cite deleted `agent-ops.mdc` as live | this file's prior draft, `AGENT_HANDOFF_LOG.md` narrative lines | Close the item; keep `AUDIT_DEBT_BRIEF.md` as redirect-only |
| DOC-03 | Push/merge gate ambiguity: "push to `origin/main` only on APPROVAL" vs "push feature branches" vs "owner may commit to main" vs "Cursor-only merge" | `.cursor/rules/ledger-core-rules.mdc` HARD RULES + §1.1 K, `AGENTS.md`, `REPO.md`, `PROGRESS.md`, `docs/SETUP.md` | One paragraph: local commit + feature-branch push always OK; `origin/main` merge only on Claude APPROVAL |
| DOC-04 | `docs/SETUP.md` cites §1.1 **K** (single-writer) for approval-before-push; approval lives in HARD RULES / §1.1 D | `docs/SETUP.md` git-workflow section | Fix the section cross-reference |
| DOC-05 | Session-start read order differs across `REPO.md`, `docs/AGENT_INDEX.md`, core-rules §7, and `scripts/agent-preflight.ts` (preflight requires `docs/workflows/FILE_AUDIT_LEDGER.md`, not in the others) | those 4 files | One canonical ordered list in `docs/AGENT_INDEX.md`; others point to it |
| DOC-06 | Handoff "keep last 3 sessions" rule violated by the log itself: multiple `## Latest session` headers, a duplicate `## Session log 3`, and a second bottom "last 3 only" block | `docs/workflows/AGENT_HANDOFF_LOG.md` | Restructure: Current state + backlog + exactly 3 detailed entries; archive older |
| DOC-07 | Two `## Improvement backlog` tables in the same handoff file | `docs/workflows/AGENT_HANDOFF_LOG.md` | Merge into one |
| DOC-08 | Corroboration rule disagrees: data-policy allows single-source `'alleged'` display; `ARCHITECTURE.md` `meetsCorroborationRule` requires ≥2 or withhold; core-rules `'alleged'` row says "2+ sources" | `.cursor/rules/ledger-data-policy.mdc`, `ARCHITECTURE.md`, `.cursor/rules/ledger-core-rules.mdc` §3 | Pick one definition in core-rules §3; align the others + code |
| DOC-09 | Migrated-profile count is **6 in some docs, 7 in others** (P000197 omitted from gold lists) | `lib/data/SOURCE_LOOKUP.md`, `scripts/sync-profile-news.ts` header, `docs/archive/DATA_SOURCES.md` vs `PROGRESS.md`, core-rules | Update all "6 migrated" to 7; include P000197 |
| DOC-10 | Census key policy: a prior decision said key REQUIRED / keyless banned; `KEYS.md` + shipped ingest use keyless `data.census.gov` | `AGENT_HANDOFF_LOG.md` prior decision vs `KEYS.md`, `scripts/ingest/florida/ingest-florida-counties.ts` | Ratify keyless ACS for public aggregates (update decision) or revert ingest to hard-exit |
| DOC-11 | Honest-gap copy has 4 doc variants ("No verified record available" vs "No verified data yet" vs "No integrated data for this member yet" vs FL "No verified data yet") | core-rules, `AGENTS.md`, `.cursor/rules/ledger-editorial-voice.mdc`, FL audit | Canonical string per surface type documented once (pairs with CODE-E07/E08) |
| DOC-12 | `docs/FLORIDA_DATA.md` omits shipped ingests (`ingest:fl-counties`, `ingest:bea-rpp-fl`, `ingest:fl-tax`) | `docs/FLORIDA_DATA.md` | Add missing scripts + outputs |
| DOC-13 | Prebuild guard count stated as 17, 18, and 19 in different docs (actual: **19**) | `docs/AGENT_INDEX.md`, `PROGRESS.md`, `AGENT_HANDOFF_LOG.md`, `docs/workflows/FL_INFRASTRUCTURE_AUDIT_2026-07-12.md` | Update stale counts to 19 |
| DOC-14 | `BATCH_SCALING.md` says "2 CREC statements/topic"; code caps `MAX_CREC_STATEMENTS_PER_MEMBER = 12` | `docs/workflows/BATCH_SCALING.md`, `scripts/sync-topic-positions.ts` | Align doc with code |
| DOC-15 | Batch-report retention conflict: PROGRESS/BATCH_SCALING say archive per-batch in `PROGRESS.md`; core-rules says session evidence goes to handoff log and PROGRESS is milestone-only | `PROGRESS.md`, `docs/workflows/BATCH_SCALING.md`, core-rules §1.1 J | Clarify: handoff = per-session; PROGRESS = milestones |
| DOC-16 | `CLAUDE.md` key-files table points to stub files (`DATA_INTEGRATION_PLAN.md`, `OWNER_SETUP.md`) as if live; they redirect to `ARCHITECTURE.md` / `docs/SETUP.md` | `CLAUDE.md` | Point table at the live targets |
| DOC-17 | Editorial-voice examples use "Tier 'media'" prose while core-rules bans numeric tier labels and mandates the code strings | `.cursor/rules/ledger-editorial-voice.mdc`, core-rules §3 | Use "(source tier: 'media')" phrasing |

**Duplication inventory (P2, not contradictory):** DNU/mock ban repeated in `AGENTS.md`,
`.cursor/rules/ledger-build-workflow.mdc`, `.cursor/rules/ledger-data-policy.mdc`,
`lib/data/README.md`; SSR-route rule repeated in `AGENTS.md`, `ARCHITECTURE.md`,
`ledger-build-workflow.mdc`; session-start list repeated in `REPO.md`, `docs/AGENT_INDEX.md`,
core-rules §7. Consolidate to one owner + cross-links.

**Dangling reference (P2):** `STATE_PIPELINE_LOCKED_SPEC.md` is referenced but does not exist —
replace with the locked-spec sections of `docs/workflows/FL_INFRASTRUCTURE_AUDIT_2026-07-12.md`.

---

## P1 — Product code (app/ + components/)

| ID | What | Where | Fix |
|----|------|-------|-----|
| CODE-L01 | Consistency Score still ships in Compare ("Consistency Score (demo)") | `app/compare/CompareContent.tsx` | Remove per locked layout ("remove the Consistency Score entirely") |
| CODE-L02 | `ConsistencyScore` component still renders full score strip + chart | `components/politicians/ConsistencyScore.tsx` | Retire component |
| CODE-R01 | `CredibilityConsistency` + `ConsistencyScore` are dead code but still in tree (reintroduction risk) | `components/politicians/CredibilityConsistency.tsx` | Delete dead components |
| CODE-L03 | DonorChart renders Individual donors ABOVE PACs; spec requires Organizations & PACs first | `components/politicians/DonorChart.tsx` | Reorder (PAC block first) |
| CODE-H02 | Overview stat chips also show Individual before PAC | `components/politicians/PoliticianProfileClient.tsx` | Match PAC-first ordering |
| CODE-L04 | Topic bill titles not capped at 80 chars (CSS clamp only, not `truncateTitle`) | `components/politicians/ProfileRecordByTopicPanel.tsx` | Wrap titles in `truncateTitle(t, 80)` |
| CODE-L05 | Org-vote bill titles truncated to 60, spec says 80 | `components/politicians/ProfileRecordByTopicPanel.tsx` | Use 80 (or update spec for this row) |
| CODE-L06 | Non-expandable evidence rows can render untrimmed text (no 117-char cap) | `components/politicians/ExpandableEvidenceRow.tsx` | Trim to 117 on the non-detail path |
| CODE-L07 | DonorChart accepts `useOfficialScheduleA` then discards it; still shows "Demo composition — not from FEC sync" when FEC totals exist | `components/politicians/DonorChart.tsx` | Honor the flag; drop demo label when FEC-backed |
| CODE-L08 | Compare uses raw `politician.stockTrades` + "(demo)" instead of merged official trades | `app/compare/page.tsx`, `app/compare/CompareContent.tsx` | Merge official trades like profiles do |
| CODE-E01 | FL Legislation nav anchor exists but section is omitted entirely when empty | `components/states/FloridaStateDashboard.tsx` | Always render shell + honest gap |
| CODE-E02 | `FloridaLegislationSection` returns `null` when empty | `components/states/FloridaLegislationBillRow.tsx` | Show honest-gap panel |
| CODE-E03 | Overview votes accordion returns `null` when no votes | `components/politicians/PublicActionsAccordion.tsx` | Honest-gap panel |
| CODE-E04 | Related records section returns `null` when empty | `components/politicians/RelatedOfficialRecords.tsx` | Honest-gap or explicit parent copy |
| CODE-E05 | Unified record panel can render empty topic list with no gap message | `components/politicians/PoliticianProfileClient.tsx` | Show "No verified record available" |
| CODE-E07 | Non-canonical honest-gap copy: "No verified record available in integrated data" | `components/politicians/PoliticianProfileClient.tsx` | Standardize to canonical string |
| CODE-E08 | Non-canonical topic-gap copy: "No verified record in integrated data" | `lib/topicCoverage.ts`, `components/politicians/PoliticianProfileClient.tsx` | Align to canonical |
| CODE-D01 | Compare labels FEC-backed metrics "(demo)" | `app/compare/CompareContent.tsx` | Split official vs overlay rows |
| CODE-F01 | FL sidebar uses a US-style flag (CSS stripes/canton), not the Florida flag | `components/states/FloridaStateDashboard.tsx` | **Owner visual** decision → FL flag asset |

Lower-severity UI copy variants (P2): `VotingRecord.tsx`, `StockTrades.tsx`, `SaidDidPanel.tsx`,
`DonorChart.tsx`, `ProfileNewsExplorer.tsx` each use their own empty-state string; normalize.
Accessibility P2: expand/collapse buttons lacking `aria-expanded`/labels in
`ExpandableEvidenceRow.tsx`, `StockTrades.tsx`; `TrackButton` relies on `title` only and returns
`null` pre-hydration.

---

## P1 — Data freshness & pipeline (lib/ + scripts/ + data/)

| ID | What | Where | Fix |
|----|------|-------|-----|
| DATA-01 | **Dual-vintage `asOf` on the FL page**: county set `asOf 2026-07-19`, economic slice `asOf 2026-07-02` (pop indicator `2026-07-10`) — official-tier numbers from different batches on one page | `data/florida/census/florida-counties-sample.json`, `lib/data/generated/slices/state-economic.json` | Run `npm run build:data-slices` after county/demographics ingest and commit refreshed slice (builder already prefers county vintage) |
| DATA-02 | FL rankings ingest **overwrites output with null ranks on fetch failure** — no read/preserve of prior good snapshot | `scripts/ingest/florida/ingest-florida-state-rankings.ts` | Read prior JSON; on failure keep numbers + set `provenance: 'fetch-failed'` |
| DATA-03 | BEA RPP ingest writes `state: null` honest-gap on failure without preserving prior live snapshot | `scripts/ingest/florida/ingest-bea-rpp-florida.ts` | Preserve last good `state` block |
| DATA-04 | County ingest can write empty `records` + `honest-gap` after partial network failure, replacing a full prior set | `scripts/ingest/florida/ingest-florida-counties.ts` | Abort write when `records.length === 0` and prior was live |
| DATA-05 | OpenStates / SAM / GovInfo / News FL ingests write empty snapshots on missing key or API error without reading prior file | `scripts/ingest/florida/ingest-openstates-florida.ts`, `ingest-sam-florida.ts`, `ingest-govinfo-florida.ts`, `ingest-news-florida.ts` | Skip write when prior is `fetched-live`; honest-gap only if no prior |
| SYNC-01 | Full-corpus syncs lack `--members` scoping (rule: agent runs must scope) | `scripts/sync-news-national.ts`, `scripts/sync-fec-national.ts`, `scripts/sync-topic-positions.ts` | Add `parseMembersArg()`; require `--members` (or explicit `--full-corpus`) for agent runs |
| CI-05 | `refresh-data.yml` runs full `npm run build` (which triggers render-integrity postbuild) **without** installing Playwright chromium | `.github/workflows/refresh-data.yml` | Add `npx playwright install chromium` or set `RENDER_INTEGRITY_SKIP_POSTBUILD=1` and mirror `guards.yml` |
| DEP-01 | `react-simple-maps@3.0.0` peer-invalid with React 19 (`npm ls` shows invalid peer); masked by `.npmrc legacy-peer-deps=true` | `package.json`, `.npmrc` | Upgrade/replace `react-simple-maps` (React 19 support) or pin React 18 |

---

## P2 — Config / hygiene / guards

| ID | What | Where | Fix |
|----|------|-------|-----|
| CFG-01 | `package.json` `name` is `"code"` while canonical repo is `The-ledger` | `package.json` | Rename to `the-ledger` or document npm≠repo name |
| CFG-02 | Node version differs across CI: `guards.yml` uses 20, `refresh-data.yml` uses 22; no `engines` field | `.github/workflows/guards.yml`, `.github/workflows/refresh-data.yml`, `package.json` | Add `engines.node`; unify on one LTS |
| CFG-04 | `@types/d3` in `dependencies` (should be dev) | `package.json` | Move to `devDependencies` |
| CFG-07 | ESLint not run in CI (76 lint problems can land silently) | `.github/workflows/guards.yml` | Add a lint job (initially non-blocking) |
| DATA-02b | County file named `-sample` but is full 67-county coverage (`coverage: "full"`, `isSample: false`) | `data/florida/census/florida-counties-sample.json`, `scripts/ingest/florida/ingest-florida-counties.ts` | Rename to `florida-counties.json` with accessor/guard updates, or document permanent legacy name |
| DATA-03b | Stale accessor comment says "small-sample JSON only" | `lib/data/floridaDashboard.ts` | Update comment for full-vs-sample semantics |
| DATA-04b | 23/30 Florida JSON outputs lack `meta.provenance`; guard covers only 6 dashboard files | `data/florida/**`, `scripts/__tests__/unverifiedOfficialDataGuard.test.ts` | Add `provenance` to all ingest outputs; widen guard |
| GUARD-01 | Mock-key guard scans only top-level `lib/data/generated/*.json` (no recursion into `profiles/`, `members/`, `slices/`); deep scan today is clean but guard is shallow | `scripts/__tests__/sourceIntegrity.test.ts` | Recurse `lib/data/generated/**` |
| GUARD-02 | Fetch-timeout guard is file-level regex, not per-call — a file with one timeout masks unguarded calls | `scripts/__tests__/optimizationGuards.test.ts` | Per-`fetch(`-call check |
| TEST-01 | `stockTradesCheckpoint.test.ts` first case asserts string constants (tautological) | `scripts/__tests__/stockTradesCheckpoint.test.ts` | Add fixture-driven integration assertion |
| CODE-LINT | 4× `prefer-const` errors (`scripts/lib/profileMigrate.ts`, `scripts/reprocess-topic-positions-bundle.ts`, `scripts/sync-votes-national.ts`, `app/congress/CongressContent.tsx`); 53 `no-unused-vars` warnings; ~6 `no-explicit-any`; `react-hooks/set-state-in-effect` incl. `lib/hooks/useUserProfile.ts` | across `lib/`, `scripts/`, `app/`, `components/` | Batch `eslint --fix` + manual for hooks; then add CI lint |
| DUP-01 | ~32 FL ingest scripts repeat the same load-env → missing-key → write-empty boilerplate | `scripts/ingest/florida/*.ts` | Extract a shared `floridaIngestWithKey()` helper |

---

## Looks solid (verified — do not reopen without cause)

- **SSR:** every `app/**/page.tsx` is a server component; interactivity is in imported client components.
- **Fetch safety:** all production `fetch()` sites pass `AbortSignal.timeout` or go through `resilientFetch`/`fetchJson` (30s default); only a latent wrapper gap in `scripts/sync-topic-positions.ts`.
- **National sync preserve patterns** load prior snapshots and skip/merge on per-member failure (`sync-legislation.ts`, `sync-stock-trades.ts`, `sync-news-national.ts`, `sync-topic-positions.ts`).
- **No committed secrets** (only `.env.example`); keys read from gitignored `.env.local`, URL-encoded, values never logged (one key-length log is P2).
- **Mock-key ban:** deep scan of `lib/data/generated/**` found zero `/mock/i` JSON keys.
- **CI render-integrity** is enforced (Playwright + external server on port 4112) even though Vercel postbuild skips it; `prebuild` (19 guards) matches `guards.yml`.
- **TS `strict: true`** is on (`noImplicitAny` not disabled); typecheck clean.
- **FL rank direction & rounding verified:** income/home/pop rank 1 = highest; unemployment/COL/RPP rank 1 = cheapest/lowest (ascending); `round1` consistent.
- **SAMPLE badge** correctly hidden when `coverage: "full"`.
- **`copyCompliance` guard** already bans "No verified data yet" in `app/` + `components/` (so that variant is docs-only).

---

## Suggested Claude brief order (after APPROVAL process)

1. **DOC-01** (owner: re-sync cloud rules) + DOC-02 (close stale work-log refs)
2. **Approve/reject PR #39** (FL UX + full counties)
3. **DATA-01** rebuild + commit `state-economic.json` slice (removes vintage drift)
4. **CODE-L01/L02/R01** remove Consistency Score + dead components
5. **CODE-L03/H02** DonorChart + overview PAC-first ordering
6. **CODE-L04/L05/L06** layout-number alignment
7. **CODE-E01–E08 / DOC-11** silent-empty → canonical honest-gap
8. **DATA-02..05 / SYNC-01** preserve-on-failure + `--members` scoping
9. **DEP-01 / CI-05 / CFG-*** dependency + CI hardening
10. **DOC-03..17** instruction consolidation
11. **CODE-L07/L08/D01** demo-label cleanup where FEC/official data exists
12. **CODE-F01** FL flag — only after owner visual decision
13. Lint cleanup + CI lint job; guard deepening (GUARD-01/02, TEST-01)

---

## Explicit non-actions this session

- No merge of PR #39 · no Phase P · no product/data code edits from findings
- No Vercel project rename (no `VERCEL_TOKEN`; owner dashboard action)
- Only this audit file's own citations were corrected (to unbreak the guard it tripped)

---

## Evidence commands (this session)

```text
tsc --noEmit                → exit 0 (clean)
eslint .                    → 76 problems (23 errors, 53 warnings), exit 1
npm run prebuild            → docsIntegrityGuard fail (this file), then fixed → green
ls .cursor/rules/*.mdc      → 4 files, no agent-ops.mdc
node data/florida/census/florida-counties-sample.json → coverage "full"
npm ls react-simple-maps    → react@19 invalid peer
```
