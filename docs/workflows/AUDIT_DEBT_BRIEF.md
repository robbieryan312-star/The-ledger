# Audit Debt Brief — For Claude Assessment

Session: 2026-07-08
HEAD: 71b61c2 (matches origin/main at audit time)
Mode: Read-only audit completed; no remediation commits yet
Working tree: DIRTY (3 files from guard side effects)

---

## PREVIOUS PHASE CONFIRMATION

HEAD: 71b61c2
Brief B commits: Landed (news guard, P000197 diagnosis/scaffolds, votes-national under-fill fix)
Section 1.1 handoff rules: Committed (828e650 through fdd025c)
Working tree: Dirty — not intentional WIP
Prebuild: FAIL on test:profile-snapshots (S000033 news drift)
Audit: Read-only sweep 2026-07-08; Cursor awaiting Claude remediation brief

Dirty files:
- data/reports/feed-health.json
- data/reports/file-ininventory.json
- lib/data/generated/profiles/S000033/news.json

---

## OBJECTIVE

Claude: assess this debt register, merge with your own findings, and return one ordered remediation brief for Cursor. Each item needs explicit acceptance criteria and commit discipline. No M2 scaling until P0 is green.

---

## CONTEXT

7 migrated profiles: S000033, O000172, M000355, M001184, W000817, C001098, P000197
National snapshots: data/national/votes/ and data/national/fec/
Mega-bundle topicPositions.json still serves 442 non-migrated members
Guards mostly green except snapshot drift and a test that mutates data during prebuild

---

## P0 — BLOCKS BUILD OR CORRUPTS DATA (FIX FIRST)

### P0-1: Guard test runs live RSS sync

Problem: scripts/__tests__/newsRegistry.test.ts dynamically imports scripts/sync-news-rss.ts
Root cause: sync-news-rss.ts has unconditional top-level main() with no import.meta.url guard
Evidence: S000033/news.json gained a Guardian headline (2026-07-07) after test:news-registry or prebuild
Fix: Export resolveNewsStatus without triggering main(); add direct-run guard to sync script
Accept: npm run test:news-registry makes zero network calls; git status unchanged after run

### P0-2: S000033 golden snapshot drift

Problem: scripts/__tests__/profileSnapshots.test.ts expects 1 news headline; disk has 2
Evidence: Side effect of P0-1
Fix: After P0-1, revert news.json to committed state OR update golden if headline is verified correct
Accept: npm run test:profile-snapshots pass; full npm run prebuild pass

### P0-3: FEC Schedule A path mismatch

Problem: scripts/sync-fec-schedule-a.ts and sync-fec-schedule-a-pilot.ts write data/fec/national/
Canonical: data/national/fec/ per dataPaths.ts and lib/data/fecScheduleA.ts
Evidence: data/fec/national/ absent on disk; committed schedule-a.json lives at canonical path only
Fix: Point I/O at data/national/fec/ via dataPaths.ts exports
Accept: Script reads/writes canonical paths; scoped run succeeds with FEC_API_KEY set

---

## P1 — SCALING AND BRIEF CLOSURE BLOCKERS

### P1-1: sync-news-rss ignores --members

Problem: scripts/sync-news-rss.ts loads all _manifest.json members; ignores CLI arg profile-build passes
Files: scripts/sync-news-rss.ts, scripts/profile-build.ts (approx line 309)
Accept: npm run sync:news-rss -- --members P000197 syncs only that member

### P1-2: P000197 zero platform positions

File: data/reports/P000197-positions-diagnosis.json
Verdict: never-scraped, refillBlocked true
Evidence: byTopic=0; absent from topicPositions.json bundle
Decision needed: Claude rules refill yes/no before Cursor runs sync:topic-positions -- --members P000197
Accept: If approved — positions filled or honestly gapped with zero scaffolds; depth report updated

### P1-3: Doc drift — migrated count and stale PROGRESS

Files: .cursor/rules/ledger-core-rules.mdc (says 6 migrated), PROGRESS.md (2026-07-04/05), docs/AGENT_INDEX.md (11 guards vs 13)
Branch: claude/ledger-progress-review-jmd6gl at 32c44a7 has accurate status board
Accept: All docs say 7 migrated; PROGRESS status board current; guard count = 13 prebuild suites plus typecheck

### P1-4: Revert or discard guard side-effect dirty tree

Files: S000033/news.json, feed-health.json, file-inventory.json
Accept: Tree clean after P0-1 fix plus intentional snapshot decision (P0-2)

---

## P2 — QUALITY DEBT (BRIEF C / M1 COMPLETION)

P2-1 SSR violations: app/elections/page.tsx, app/officials/[id]/page.tsx, app/lobbying/[id]/page.tsx have use client on route pages

P2-2 Profile files written but not read at runtime: trades.json, legislation.json, orgVoteLinks.json, header.json — UI reads national/legacy paths; getMemberProfileOrgVoteLinks() is dead code

P2-3 Stub verifier: scripts/verify-lobbying-votes.ts always prints PASS; still in npm scripts

P2-4 Stale verifier path: scripts/verify-phase17b-batch.ts uses data/votes/national/ not data/national/votes/

P2-5 CI guard parity: refresh-data.yml runs 7 explicit suites vs full guards.yml set; missing typecheck, news-registry, profile-snapshots, optimization, env-truth in explicit step

P2-6 test:classify not in prebuild — only runs in refresh CI

P2-7 Golden snapshots cover 2 of 7 migrated members (S000033, M000355 only)

P2-8 Said-to-Did depth: max 1 link per profile (S000033, O000172, P000197); spec target ~15 where record supports

P2-9 Mega-bundle topicPositions.json still active for 442 members; v1.0 requires retirement

P2-10 README.md is default create-next-app boilerplate with wrong font claim

P2-11 FILE_AUDIT_LEDGER: L1 only reviewed (11 of 177 files); L2 through L8 pending

P2-12 Dead modules with zero imports: reference-sources.ts, profileLatestRecord.ts, buildTopicConsistencyTimeline.ts, electionCompare.ts

---

## GUARD AND CI MATRIX

prebuild runs: typecheck, crec, org-join, source-integrity, copy-compliance, topic-positions-bundle, news-registry, profile-snapshots, client-bundle, docs-integrity, data-layout, env-truth, optimization

guards.yml: full set above plus build plus client-chunks. Node 20.

refresh-data.yml explicit step: crec, org-join, source-integrity, copy-compliance, topic-positions-bundle, classify, docs-integrity, data-layout, build. Missing explicit: typecheck, news-registry, profile-snapshots, client-bundle, env-truth, optimization, client-chunks. Node 22.

test:profile-snapshots: FAIL on S000033 (2 news headlines vs golden 1)

test:news-registry: side effect — mutates S000033/news.json during prebuild

---

## 7-PROFILE SNAPSHOT (AUDIT EVIDENCE)

S000033: votes=30 news=filled topics=7 saidDid=1 (snapshot drift on news)
O000172: votes=30 news=honest-gap topics=7 saidDid=1
M000355: votes=30 news=honest-gap topics=3 saidDid=0
M001184: votes=30 news=honest-gap topics=7 saidDid=0
W000817: votes=30 news=filled topics=7 saidDid=0
C001098: votes=30 news=honest-gap topics=9 saidDid=0
P000197: votes=30 news=filled topics=0 saidDid=1 (positions blocked, refillBlocked true)

---

## SUGGESTED REMEDIATION SEQUENCE FOR CURSOR

1. P0-1 then P0-2 then P1-4 (tree clean plus prebuild green) — one commit or logical pair
2. P0-3 FEC paths — separate commit
3. P1-1 news-rss scoping — separate commit
4. P1-3 doc sync (merge PROGRESS branch content) — docs-only commit
5. P1-2 P000197 positions — only after Claude ruling
6. P2 items — batch into Brief C (SSR, dead code, CI parity, guard gaps)

---

## ACCEPTANCE FOR DEBT CLOSURE (CLAUDE RE-REVIEW GATE)

- git status --short empty
- npm run prebuild && npm run build exit 0
- test:news-registry does not mutate tracked files
- FEC schedule-A script uses data/national/fec/
- sync-news-rss --members scoped correctly
- Docs say 7 migrated and 13 guard suites documented
- P000197 positions ruled and resolved or explicitly deferred with reason
- Each fix: commit hash plus git show evidence pasted

---

## OUT OF SCOPE (THIS DEBT PASS)

- M2 batch scaling (537 members)
- Mega-bundle retirement (P2-9 — separate milestone)
- Florida refresh CI failure (upstream ingest timeout)
- Font self-host (M6)
- Full FILE_AUDIT_LEDGER L2 through L8 sweep

---

## SLASH COMMANDS FOR CLAUDE BRIEF BACK TO CURSOR

Verify commands:
- /verify-guards — full prebuild gate
- /verify-profile [bioguideId] — depth table one member
- /verify-all-profiles — all 7 migrated counts
- /verify-tree-clean — git status must be empty
- /path-audit — detect sync script path drift
- /ssr-audit — find client route page violations
- /review-handoff — validate section 1.1 report evidence

Execute commands:
- /session-start — read core-rules, PROGRESS, SOURCE_LOOKUP, KEYS, REPO, checklist; run agent:preflight
- /scoped-sync [pipeline] --members ID — never full-corpus in agent sessions
- /profile-build --members ID — Phase E certification pipeline
- /post-data-change — sync:legislators && verify:office && build
- /snapshot-update [bioguideId] — fix golden after verified content change
- /commit-task — prebuild green then commit (no push without Claude APPROVAL)

Key verification one-liners:

```
git rev-parse --short HEAD && git status --short

for id in S000033 O000172 M000355 M001184 W000817 C001098 P000197; do
  node -e "const v=require('./lib/data/generated/profiles/$id/votes.json');const n=require('./lib/data/generated/profiles/$id/news.json');const p=require('./lib/data/generated/profiles/$id/positions.json');const sd=require('./lib/data/generated/profiles/$id/saidDid.json');console.log('$id votes='+v.votes.length+' news='+n.status+' topics='+Object.keys(p.byTopic||{}).length+' saidDid='+Object.values(sd.byTopic||{}).flat().length)"
done

npx tsc --noEmit && npm run prebuild && npm run build

rg "'use client'" app/**/page.tsx -l

rg "data/fec/national|data/votes/national" scripts/ --glob '*.ts'
```

---

STOP for Cursor until Claude returns remediation brief with explicit task order and P000197 ruling.
