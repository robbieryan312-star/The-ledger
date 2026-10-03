# Agent handoff & communication log (Claude Code ↔ Cursor)

This is the running communication file between **Claude Code** (decides, briefs, reviews — read-only
on data/code) and **Cursor** (executes all collection, edits, commits, pushes, PRs). It binds to
`.cursor/rules/ledger-core-rules.mdc` (the always-read ruleset) — where any doc disagrees with
core-rules, core-rules wins. Newest handoff on top.

**Cursor rule:** every work/verify turn ends with a **`## Confront Claude — paste to Claude Code`**
block in this file (see `docs/CURSOR_IMPLEMENTATION_MANUAL.md` §9) — owner forwards it unchanged.

---

## Latest session — scheduled critical bug scan (BLOCKED: existing PR #99 gate failure)

**From:** Cursor · **To:** Claude · **Verdict:** BLOCKED (no new critical bug PR opened)  
**Current state:** `cursor/critical-bug-management-dcb6` · pre-log HEAD `763dc67` (= `origin/main`) · PR none opened · tree clean before handoff edit · source-integrity/build FAIL on already-tracked PR #99 defect

### Objective
Inspect recent `origin/main` commits for untracked critical correctness bugs; avoid duplicating open memory PRs; implement only a high-confidence new fix.

### Verdict / outcome
No additional untracked critical data-loss, crash, security, or major user-facing correctness bug was found in the reviewed commit window. All tracked memory PRs checked in this run (#28, #29, #30, #31, #40, #99–#128) are still **OPEN**, so no memory cleanup was applied and no duplicate PR was opened.

Validation is **BLOCKED** by the already-tracked open PR #99 condition: `approvedSourceMatrixGuard` rejects the contiguous retired-source token in Claude rule files. This is not a new report from this scan.

### Commits
- (pending docs handoff commit) — records this scan and trims this log to the latest three sessions.

### Commands run (this session)
- `pwd && git status --short && git branch --show-current && git log --oneline -n 12` → exit 0
- `python - <<'PY' ... gh pr view ...` → exit 127 (`python: command not found`)
- `python3 - <<'PY' ... gh pr view ...` → exit 0; tracked PRs remain open
- `git remote -v && git fetch --all --prune && git status --short && git log --oneline --decorate -n 20 --all --date-order` → exit 0
- `git branch --show-current && git status --short && git rev-parse --short HEAD && git rev-parse --short origin/main && git log --oneline --decorate --left-right --cherry-pick origin/main...HEAD && git log --oneline --decorate -n 25 origin/main` → exit 0
- `git log --format='%h %cs %s' -n 40 --no-merges origin/main -- . ':(exclude)docs/**' ':(exclude).cursor/**' ':(exclude).claude/**'` → exit 0
- `git show --stat --oneline 18b5d3e d36f4a9 cc916da db23b39 d137a12 337bfd5 a472dd4` → exit 0
- `if [ -f /tmp/cursor/async-install/install-user.status ]; then ... fi` → exit 0; no async/start markers
- `mkdir -p /opt/cursor/artifacts && (npm run test:source-integrity && npm run test:topic-positions-bundle) 2>&1 | tee /opt/cursor/artifacts/critical-bug-scan-targeted-tests.log` → shell exit 0 due missing `pipefail`; log shows `test:source-integrity` fail 1
- `npm run build 2>&1 | tee /opt/cursor/artifacts/critical-bug-scan-build.log` → shell exit 0 due missing `pipefail`; log shows prebuild fail 1
- `set -o pipefail; npm run test:source-integrity 2>&1 | tee /opt/cursor/artifacts/critical-bug-scan-source-integrity-pipefail.log` → exit 1 (known PR #99)
- `set -o pipefail; npm run build 2>&1 | tee /opt/cursor/artifacts/critical-bug-scan-build-pipefail.log` → exit 1 (known PR #99)
- `set -o pipefail; npm run test:topic-positions-bundle 2>&1 | tee /opt/cursor/artifacts/critical-bug-scan-topic-positions-pipefail.log` → exit 0; 8 pass / 0 fail

### Files touched
| Path | Action | What changed |
|------|--------|--------------|
| `docs/workflows/AGENT_HANDOFF_LOG.md` | modified | Added this scan result; retained latest three sessions only |
| `/opt/cursor/artifacts/critical-bug-scan-*.log` | created | Validation evidence logs |

### Acceptance evidence
- Subagent review of `origin/main` tip `763dc67`: no untracked critical bug found; duplicate findings map to open memory PRs (#99, #100, #104, #107, #110, #123, #125, #128, etc.).
- `test:topic-positions-bundle`: `# tests 8`, `# pass 8`, `# fail 0` (`/opt/cursor/artifacts/critical-bug-scan-topic-positions-pipefail.log`).
- `test:source-integrity` and `npm run build`: fail at `approvedSourceMatrixGuard` with `dead-source token "votesmart" found outside history exempts: .claude/rules/CLAUDE_CODE_OPERATING_MANUAL.md:2; .claude/rules/CLAUDE_OWNER_DIRECTIVES.md:1` (`/opt/cursor/artifacts/critical-bug-scan-source-integrity-pipefail.log`, `/opt/cursor/artifacts/critical-bug-scan-build-pipefail.log`).

### Open / next
- Do not open a duplicate PR for the PR #99 guard/build failure; wait for or review the existing PR: https://github.com/robbieryan312-star/The-ledger/pull/99
- No new critical-bug fix PR was opened from this scan.

---

## Confront Claude — paste to Claude Code

**Scheduled critical-bug scan:** branch `cursor/critical-bug-management-dcb6` at pre-log HEAD `763dc67` (`origin/main`) · no untracked critical bug found · no new PR opened · all memory PRs remain OPEN. Validation BLOCKED by already-tracked PR #99: `test:source-integrity` and `npm run build` fail on contiguous retired-source token in `.claude/rules/CLAUDE_CODE_OPERATING_MANUAL.md:2` and `.claude/rules/CLAUDE_OWNER_DIRECTIVES.md:1`; `test:topic-positions-bundle` passes 8/8. Claude gate: resolve/review PR #99 before treating main as build-green; no duplicate Cursor action recommended.

---

## HANDOFF 2026-07-26 — MERGES + BERNIE INDEPENDENT AUDIT @ a42e0cb

**From:** Cursor · **To:** Claude · **Verdict:** MERGES COMPLETE · AUDIT POSTED (not Bernie-locked)  
**Current state:** `main` · HEAD `6d6057b` (docs stamp) · audit data tip `a42e0cb` · #95 left open · PARK #76 · m8a · m7a–d

### Merges (APPROVED tips)
| Item | Approved tip | Merge result on main |
|------|--------------|----------------------|
| M-ALLEGED-POLICY PR #98 | `9ae85ea` | FF `c08be19`→`9ae85ea` |
| M-GOVERNANCE-MERGE | `09f14b4` | merge commit **`a42e0cb`** (ort; contains §8A + CLAUDE_REVIEW_TURN_RUNBOOK) |

`git merge-base --is-ancestor 9ae85ea HEAD` → true · `09f14b4` → true · profile data audited at merge tip `a42e0cb`

### BERNIE INDEPENDENT AUDIT @ a42e0cb

#### Disk counts (S000033)
| Section | Count / status | Evidence |
|---------|----------------|----------|
| statements | **33** (32 official + 1 media); floor openers ~32; missing_prov **0** | `statements.json` |
| saidDid | **14**/15 `partial`; incomplete_pairs **0**; nominee_mismatches **[]** | `saidDid.json` |
| votes | **201** asOf 2026-07-22 | `votes.json` |
| news | **12** all `media`; dup url/id **0**; incomplete **[]**; dates 2026-02-19..2026-07-07 | `news.json` |
| controversies | **2** (c1 verified; c2 alleged with verbatim+outcome+url) | `controversies.json` |
| endorsements | **3** (endorses 1 + endorsedBy 2); all `media` | `endorsements.json` |
| positions | 10 topics; platformPositions on 7 | `positions.json` |
| finance | entry present; receipts 24928186.19; tier official | `finance.json` |
| trades | `fetch-failed`; n=0 | `trades.json` |
| orgVoteLinks | `honest-gap`; links 0 | `orgVoteLinks.json` |
| legislation | filled; sponsored 566 / cosponsored 7906 | `legislation.json` |
| lobbying | on disk `honest-gap` (not a manifest category) | `lobbying.json` |

#### Provenance / policy
- Said: every statement has title+url+date+tier (**0** missing) — paste check: `missing_prov=0`
- Alleged c2: verbatimQuote present · outcome present · URL present · title does not restate allegation as fact
- Banned-section alleged: **A violations: 0**
- News alleged listings: **B 0 / 12**
- `??` outlet defaults in lib/scripts: **empty**
- saidDid said-after-vote: **[]** · dup keys: **[]**

#### Manifest parity
- `saidDid`: manifest=`filled` vs file.status=`partial` (pairCount 14/15) — **PARITY_NOTE**
- Other categories: manifest status matches content/honest-gap/fetch-failed as listed above

#### Render :4210 @ 1280
- HTTP **200**; zero silent empties (content or honest-gap on every tab)
- Controversies **2** with alleged wage dispute showing verbatim + Outcome
- Endorsements **3** across Endorsed By + Who Bernie Endorses (Joe Biden + NNU + DSA)
- Evidence drawer: `data-testid="topic-record-drawer-fullwidth"` **present**
- Track Record pair1 expanded: healthcare Said ↔ S.J.Res.198 Medicare CMS rule — subject-aligned
- Screenshots: `/opt/cursor/artifacts/screenshots/bernie-*-1280.png`

### DEFECTS
| Sev | What | Where | Evidence |
|-----|------|-------|----------|
| P2 | saidDid manifest=`filled` while file.status=`partial` (14/15) | `manifest.json` · `saidDid.json` | paste: `saidDid: manifest=filled pairCount=14 file.status=partial PARITY_NOTE` |

### RISKS
- saidDid short of 15 (honest-gap; Marvit unpaired) — not fabrication
- News listings `isVerified:false` / UI UNVERIFIED while tier stays `media` — corroboration semantics; watch UX
- lobbying.json exists outside manifest categories — discoverability gap

### RECOMMENDATIONS
1. Claude reconcile this audit with Claude's pass → then OWNER visual (do not lock Bernie in this turn)
2. Optionally align manifest saidDid to `partial` when pairCount < pairTarget (or document filled=has pairs)
3. Keep #95 open; PARK unchanged

### Open / next
- OWNER visual after Claude reconcile
- #95 leave open; PARK #76 · m8a · m7a–d

---

## Confront Claude — paste to Claude Code

**MERGES done:** M-ALLEGED @ `9ae85ea` FF + M-GOVERNANCE @ `09f14b4` → main HEAD **`a42e0cb`**. **BERNIE INDEPENDENT AUDIT @ a42e0cb** posted (P2 manifest saidDid filled vs partial). Reconcile audits → OWNER visual. Do not lock Bernie. #95 open. PARK unchanged.

---

## HANDOFF 2026-07-26 — M-ALLEGED REJECT#2: matrix guard + synthetic provenance token

**From:** Cursor · **To:** Claude · **Verdict:** PASS (local A–H) · awaiting STAGE THREE  
**Current state:** `cursor/m-alleged-policy-70a6` · tip `1fc70e8` · base `main` @ `c08be19` · prebuild 0 · build 0  
**Note:** tip SHA = `git rev-parse --short origin/cursor/m-alleged-policy-70a6` after push.

### Objective
Claude REJECT @ `598a24f`: (1) replace dead-source token in provenance fixtures with synthetic `DefunctSurveySource`; (2) fix criterion (A) so `assert.fail` is not swallowed by catch.

### Defect 2 evidence (paste)
**Scratch FAIL** (token staged in `_scratch_dead_source_token.tmp.ts`):
```
not ok 4 - criterion (A): no contiguous dead-source token outside history exempts
error: dead-source token "votesmart" found outside history exempts:
scripts/__tests__/_scratch_dead_source_token.tmp.ts:1
```
**Clean PASS** after scratch removed: `# tests 4` / `# fail 0`

### Acceptance paste
```
A) violations: 0
B) 0
C) allegedPolicyGuard fail 0
D) provenance-default grep: empty
E) controversies 2 / endorsements 3
F) approvedSourceMatrixGuard fail 0
G) prebuild: 0
H) build: 0
votesmart git grep (non-exempt): exit 1 (no output)
```

### Open / next
- Claude STAGE THREE on this exact tip SHA
- After merge: re-run BERNIE INDEPENDENT AUDIT @ main tip
- #95 leave open; PARK #76 · m8a · m7a–d

---

## Confront Claude — paste to Claude Code

**M-ALLEGED REJECT#2:** approve exact tip **`1fc70e8`** of `cursor/m-alleged-policy-70a6` (PR #98) · A0 B0 C0 D empty E 2/3 F matrix 0 G prebuild 0 H build 0 · synthetic DefunctSurveySource · criterion A names files · your STAGE THREE · do not merge without APPROVAL on this tip SHA

---
