# Cursor Work Log — Audit & Debt Remediation

**Living file.** Cursor updates this after each major task. Only the **last 3 session entries** are kept below.

**Current state (2026-07-08):**
- Branch: `cursor/p0-p1-debt-remediation-4114`
- HEAD: `fafff1b` (base `71b61c2`)
- PR: https://github.com/robbieryan312-star/The-ledger/pull/13
- Tree: clean · prebuild + build: green · Awaiting Claude review before merge to `main`

---

## Latest session — P0/P1 audit debt remediation (COMPLETE)

### Task

Execute Claude's ordered remediation brief: make prebuild deterministic, keep the git tree clean after guard runs, fix sync path/scoping bugs, run P000197 positions refill per ruling, sync docs. One logical commit per task group. Brief C / M2 out of scope.

### Work done (code)

| Commit | What |
|--------|------|
| `6916f24` | **P0-1 + P1-1** — `scripts/sync-news-rss.ts`: direct-run guard (`import.meta.url === pathToFileURL(argv[1])`) so importing `resolveNewsStatus` makes zero network calls; `--members` CLI scopes to given bioguideIds (default = full manifest). |
| `3e9a3d3` | **P0-3** — `scripts/lib/dataPaths.ts`: added `NATIONAL_SCHEDULE_A_FILE`, `NATIONAL_FEC_PILOT_DIR`, `PILOT_S000033_SCHEDULE_A_FILE`. `sync-fec-schedule-a.ts` and `sync-fec-schedule-a-pilot.ts` now read/write `data/national/fec/` (was broken `data/fec/national/`). |
| `c27aad8` | **P1-2 pipeline** — `lib/data/sanitizeProfileUiData.ts`: `newsItemValid` passes `status: 'filled'` when validating single items (was falsely rejecting every RSS row). `scripts/lib/profileMigrate.ts`: writes `status`/`note` on `news.json`, recomputes status after sanitization. |
| `fafff1b` | **P1-3** — `.cursor/rules/ledger-core-rules.mdc`: 6→7 migrated (add P000197). `docs/AGENT_INDEX.md`: 13 guard suites + typecheck table. `PROGRESS.md`: synced with Claude branch status board + P0/P1 closure row. |

### Data added or edited

| Path | Change |
|------|--------|
| `lib/data/generated/topicPositions.json` | P000197 scraped into bundle (Ballotpedia rows under topic keys) |
| `lib/data/generated/profiles/P000197/positions.json` | `byTopic: {}` — honest-gap after migrate filters (vote restatements) |
| `lib/data/generated/profiles/P000197/manifest.json` | Category statuses updated by profile:build |
| `lib/data/generated/profiles/P000197/statements.json` | Cleared to empty byTopic (migrate filters) |
| `lib/data/generated/profiles/P000197/saidDid.json` | Updated by reprocess |
| `lib/data/generated/profiles/P000197/votes.json` | Refreshed from national snapshot (30 votes) |
| `lib/data/generated/profiles/P000197/news.json` | Unchanged content (2 filled items); status preserved through migrate |
| `lib/data/generated/profiles/_manifest.json` | Minor metadata touch from profile:build |
| `data/reports/profile-depth-P000197.json` | Regenerated — positions honest-gap, news filled (2), votes filled (30) |
| `data/reports/P000197-positions-diagnosis.json` | Verdict → `refilled-honest-gap`, `refillBlocked: false`, filter evidence documented |
| `data/reports/feed-health.json` | Updated during scoped RSS run (committed in data commit) |

### Other changes

- **P000197 positions ruling outcome:** Refill ran (`sync:topic-positions --members P000197` + `profile:build --members P000197`). All Ballotpedia platform rows disqualified at `cleanPlatformPositions` (vote restatements). Honest gap with zero scaffolds — meets acceptance alternative.
- **P0-2 / P1-4:** No snapshot update needed once P0-1 fixed; prebuild passes on clean tree without S000033 drift.
- **Acceptance verified:** `test:news-registry` leaves tree unchanged; prebuild ×2 + build exit 0; `sync:news-rss --members P000197` logs 1 member only.

### Not touched (per brief)

M2 scaling, mega-bundle retirement, SSR route fixes (Brief C), Florida refresh CI, stale open PRs, data-refresh branch reset.

---

## Session log (last 3 only)

### 3 — P0/P1 remediation executed (2026-07-08)

See **Latest session** above. 5 commits, PR #13, guards green.

### 2 — Audit debt brief published for Claude (2026-07-08)

- Branch `cursor/audit-debt-brief-4114`, commit `a2083bd`
- Created this file (initial read-only debt register for Claude assessment)
- PR #12 — docs only, no code/data fixes

### 1 — Read-only infrastructure audit (2026-07-08)

- Swept scripts, guards, CI, app code, docs, config on `main` @ `71b61c2`
- Found P0: newsRegistry live-sync side effect, S000033 snapshot drift, FEC path mismatch
- Found P1: sync-news-rss ignores `--members`, P000197 positions blocked, doc drift
- Produced slash-command spec for Claude ↔ Cursor workflow
- No commits on `main`; dirty tree was guard side effect (3 files)

---

*Older sessions are dropped when a 4th entry is added.*
