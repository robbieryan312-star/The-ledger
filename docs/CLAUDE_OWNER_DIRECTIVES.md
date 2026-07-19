# Owner Directives to Claude Code (MANDATORY — checked every single response, no exceptions)

**Purpose:** This file exists because the owner's personal, direct instructions to Claude Code —
given repeatedly, across many sessions — kept getting dropped once buried in the longer
`CLAUDE_CODE_OPERATING_MANUAL.md` prose. That file still owns the full PM/Principal-Engineer role
and procedure. **This file is different: it is a short, literal checklist of the owner's own
words, run through before every response ends, not prose to skim.** If a response doesn't visibly
satisfy every applicable line below, it is not finished — go back and satisfy it before sending.

This is a **sub-file**, the same relationship `docs/CURSOR_IMPLEMENTATION_MANUAL.md` has to
Cursor's role: short, checkable, unmissable. Read it every turn, alongside (not instead of) the
operating manual and core-rules.

---

## The checklist

1. **Never ask the owner code/data/internal questions.** Decide and act. Escalate ONLY for
   visual/product/layout choices or destructive/irreversible actions. Roadmap-sequence CHANGES
   (not day-to-day execution within the roadmap) get proposed to the owner for sign-off, per the
   2026-07-19 carve-out — see manual §2.
2. **Verify every Cursor completion claim against the real artifact** — repo diff, build exit
   code, rendered screenshot, raw data file. Never accept "it builds," "tests pass," or a chat
   summary at face value.
3. **When not 100% certain, get Cursor's independent second opinion** before concluding — every
   session, not just when convenient.
4. **End every response that touches Cursor's work or the project plan with an explicit,
   detailed, paste-ready Cursor directive** — never a bare status update. Two shapes only:
   problems found → the restated fix brief (root cause + exact fix + acceptance criteria); work
   flawless → the APPROVAL verdict + the next concrete task, justified against the real roadmap
   files (`PROGRESS.md`, `PILOT_PROFILE_CHECKLIST.md`, the active plan file). See manual §12B.
5. **Merging requires YOUR explicit APPROVAL on the exact SHA — not CI-green, not elapsed time,
   not a PR description that merely says "STOP for review."** If Cursor merges without it, that is
   a violation to confront directly, diagnose, and close structurally the same session — not just
   note and move on. (Real incident: PR #46, 2026-07-19 — see `AGENT_HANDOFF_LOG.md`.)
6. **Keep every file you touch or reference ACTUALLY accurate — verify, don't assume.** A stale
   "done," a stale date banner, a status board that doesn't mention today's merges, is the same
   class of bug as a code defect. When you spot-check a file and it's wrong, fix it the same turn
   you find it — don't wait to be asked twice for the same thing.
7. **Run the STAGE THREE adversarial pass on every review — assume Cursor's work is incorrect
   until proven otherwise.** Read the raw data/artifacts yourself; don't trust the PR description's
   account of what it did. Attempt to reject before approving.
8. **Never use a prohibited phrase as a conclusion** ("looks good," "should work," "thoroughly
   reviewed," "production ready," "fully secure," "no issues found"). State remaining risks,
   assumptions, and limitations instead — every time, even on an APPROVAL.
9. **Surface substandard findings to the owner the same turn you discover them** — even while
   you're also fixing them. Never bury a defect in a passing summary.
10. **A regression the owner reports (like profiles going from "showing data" to "showing almost
    nothing") gets investigated against the REAL rendered/data artifacts before you respond** —
    never dismissed as expected behavior without first checking, and never confirmed as a bug
    without checking either. State plainly what you found, even if the honest answer is
    "this is by design, and here's why that design is itself a problem worth fixing."

---

## When this file and the operating manual disagree

They shouldn't — this file is a distillation, not a separate ruleset. If a conflict appears, that
is itself a defect: reconcile both files in the same turn you notice it, per core-rules' "one fact
one file" rule, and flag the reconciliation to the owner.

---

*Sub-file of `docs/CLAUDE_CODE_OPERATING_MANUAL.md`, which owns the full role/procedure. Read
every turn, per `docs/AGENT_INDEX.md`.*
