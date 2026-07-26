# Claude Review-Turn RUNBOOK — the single conduit for Claude's standard turn

**This file is EXECUTED top-to-bottom every review/feedback turn — never skimmed, never partially
applied.** It is the ONE destination for "how Claude runs a turn" (navigation-plan principle: one
conduit per need). The operating manual owns role/stance; the owner directives own the owner's words;
THIS file owns the turn procedure. If a step is skipped, the response is unfinished.

---

## STEP 0 — PREFLIGHT (query state; never recall it)
```
git fetch origin --quiet
git log --oneline origin/main -1                      # main tip
# every recent cursor/* branch: tip + MERGED/NOT-MERGED via merge-base --is-ancestor
# newest AGENT_HANDOFF_LOG.md entry (read the Confront-Claude block)
# my branch: commits not yet on main
```
State every claim of merged/approved/done ONLY from this output.

## STEP 1 — IDENTIFY THE REVIEW TARGET
The exact tip SHA(s) awaiting STAGE THREE, from preflight + handoff — never from memory or the owner's
message alone. If the handoff cites a SHA that is not the pushed tip, flag it and review the pushed tip.

## STEP 2 — PER-PR VERIFICATION (all of it, every PR)
1. Scope: `git diff origin/main...<tip> --stat` — every file justified by the brief; deletions of
   sourced content = suspect (repair-before-removal rule).
2. Acceptance criteria: RUN each executable criterion from my own brief; paste real output.
3. New/changed guards: prove non-no-op by FAIL-INJECTION on a TRACKED file (git grep sees tracked only).
4. Gates: `rm -rf .next && npm run prebuild; echo $?` and `npx next build; echo $?` — true exit codes.
5. Regression: counts before (main) vs after (tip) for every touched data section; any decrease must
   have a stated, verified justification.
6. Credibility spot-read: sample the actual data — provenance (URL+date+tier), verbatim where required,
   no invented outlet labels, honest-gap notes diagnostic.

## STEP 3 — VERDICT (closed vocabulary ONLY)
- A PR is **APPROVED** or **REJECT** — nothing else.
- A defect is **FIXED** (command output shown in THIS response) or **UNVERIFIED** — nothing else.
- ORDERING: no verdict word before its proving command has run in this response. While pending,
  describe the action only.
- Banned in any verdict context: appears/seems/looks/presumably/apparently/should work/looks good/
  no issues found/production ready/thoroughly reviewed.

## STEP 4 — COMPOSE THE RESPONSE (fixed template)
```
## STAGE THREE — <item> @ <sha>: APPROVED | REJECT
<evidence: criteria → outputs, 1 line each>
<REJECT only: defect list — root cause + exact fix, §7A vocabulary>
<remaining risks/limitations — required even on APPROVED>
STAGE THREE checklist:  [x]/[n/a] exact-SHA · gates-reproduced · improvement-row · docs-accuracy ·
honest-gap-validity · scope-match
```
Prose outside the template: 1–3 lines of verdict lead-in; owner-directed notes; nothing narrative.

## STEP 5 — THE CURSOR BLOCK (exactly one, last)
- §7A: DELETE/ARCHIVE/REPLACE/RELABEL only; executable acceptance criteria with expected output;
  enumerated targets + allowed survivors; guard the invariant.
- As many concurrent tasks as can proceed; ⛔ only on real dependency; all tasks advance the ONE
  current focus goal; §13 recommendations invited.

## STEP 6 — PRE-SEND SCAN (mechanical, on my own draft)
1. Banned lexicon scan (§8/§8A list above) — zero hits as conclusions.
2. Exactly one `COPY TO CURSOR` fenced block, and it is last.
3. Every flagged problem has its fix in THIS response (mine) or in the block (Cursor's) — §12.
4. Owner-attribution honest; my phrasing labeled mine.
5. Any review-depth reduction stated explicitly, never silent.

---
*Wired into the session-start read order via `CLAUDE.md`. One conduit; no rival copies — if this file
and the manual ever disagree, reconcile the same turn (one-fact-one-file).*
