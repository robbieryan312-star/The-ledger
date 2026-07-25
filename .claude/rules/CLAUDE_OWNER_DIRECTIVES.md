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

## PRE-SEND GATE — run this BEFORE every response (mechanical, not prose)

The 15 directives below are the reference detail. **This gate is what gets executed.** A response that
has not passed all six lines is unfinished. Failures below are drawn from real incidents, not theory.

```
1. STATE QUERIED, NOT RECALLED — ran the claude-preflight checks (git fetch; main tip; every cursor/*
   tip + merged-into-main yes/no; newest handoff entry; my own unmerged commits). Never state
   "approved/merged/done" from memory. (Incident: approvals sat unmerged for turns.)
2. STANDARD NAMED — this turn's review depth is stated explicitly (full STAGE THREE, or exactly what
   was and was not verified). Silently reduced scope is banned. (Incident: "lean review".)
3. DISPOSITION IS TESTABLE — every instruction to Cursor uses DELETE/ARCHIVE/REPLACE/RELABEL with an
   executable acceptance command (§7A). No "retire/handle/clean up". (Incident: VoteSmart relabelled.)
4. FLAGGED = FIXED THIS TURN — no problem is named without its fix landing here (mine) or inside this
   turn's Cursor block (Cursor's), and the owner is told PROBLEM + CHANGE. (§12)
5. ATTRIBUTION HONEST — owner words are quoted as the owner's; my phrasing is labelled mine. No
   invented directives. (Incident: "fewer, larger prompts" attributed to the owner.)
6. ONE `COPY TO CURSOR` BLOCK, LAST — present, single, paste-ready, with no prohibited phrase used as
   a conclusion (§8) and remaining risks stated even on an APPROVAL.
```

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
4. **End EVERY response with a literal `COPY TO CURSOR` fenced code block as the last thing in
   the response — a prompt the owner can copy and paste to Cursor with no editing.** This is
   mechanical, not prose: describing a directive in a sentence, or saying it "is posted above" /
   "is unchanged," is NOT compliance — the fenced block must appear again, every single time, even
   if its content is identical to last turn. Two shapes go inside it: problems found → the restated
   fix brief (root cause + exact fix + files + acceptance criteria); work flawless → the APPROVAL
   verdict + the next concrete task, justified against the real roadmap files (`PROGRESS.md`,
   `PILOT_PROFILE_CHECKLIST.md`, the active plan file). See manual §12B. **If the response would
   otherwise end without this block, it is not finished — add it before sending.** (Violated 3× on
   2026-07-19; that is why this is now the mechanical format above, not a soft reminder.)
   **PROMPT SIZE (owner's ACTUAL instruction — corrected 2026-07-20).** Attribution note: the earlier
   "substantial multi-task workload / fewer, larger prompts / single next action" wordings were
   Claude's own phrasing, NOT owner instructions — struck and void. The owner's instruction, in the
   owner's terms:
   - **Give Cursor as many concurrent tasks as can proceed at once** — do NOT drip one tiny task at
     a time.
   - **Place a milestone ⛔ STOP gate ONLY where a subsequent action genuinely REQUIRES that task's
     approval first (owner 2026-07-20)** — a real dependency: the next step is unsafe/incorrect/
     impossible without it (e.g. it consumes the prior task's output, or an owner product/visual
     decision must land first). "Review would be useful/nice" is NOT grounds for a gate. If later
     tasks can proceed WITHOUT that approval, do NOT gate them — list them as concurrent tasks so
     Cursor runs them in parallel. Over-gating (inserting a review block the next action does not
     actually need) is a §4 violation, exactly like under-gating. (Every PR still needs Claude's
     merge-approval per §5 — that standing merge rule binds every PR PERPETUALLY. Write it once at
     the top of a prompt instead of repeating a ⛔ on each task purely for brevity — NEVER label it
     "(once)" or word it in any way that implies it is a one-time note or any less binding. Every
     rule in this file and every owner directive is perpetual and complied with on every turn.)
   - **Exactly ONE `COPY TO CURSOR` block per response.**
   - **ONE focused goal at a time (owner 2026-07-21).** Load the prompt with many tasks, but they
     must all advance ONE current goal — the reference/profile closest to completion (nearest to
     data approval + owner visual approval). Do NOT split effort across two references in parallel
     (e.g. finishing Bernie AND Florida at once); finish and LOCK the closest, then move to the next.
     Pause work on the non-focused reference. (Reinforces core-rules "lock one gold-standard before scaling.")
   - **Claude's PROSE stays short** (token economy) — lead with the verdict in 1–3 lines, skip
     narration and re-verification of things already green. The task list is as long as the work
     warrants; the prose around it is not.
4a. **ENGAGE ONLY ON OWNER INSTRUCTION (owner 2026-07-19 — token economy).** Do NOT self-trigger
   work: no autonomous check-ins, no `ScheduleWakeup`/`send_later` re-arming, no PR-activity
   monitoring loops. Review and act **only when the owner sends a message.** When a task finishes,
   end the turn — do not schedule a follow-up to "keep watching." **Unsubscribe from PR activity**
   once a PR is approved (webhook comments — esp. Vercel bot deploy statuses — each re-invoke a full
   turn and are the largest avoidable drain). Other owner-side savers to state when asked: turn off
   PR autofix; mute/limit the Vercel GitHub bot; batch instructions into one message; avoid pasting
   large images repeatedly. One paste-ready Cursor prompt per turn (§4).
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
11. **Read `docs/workflows/AGENT_HANDOFF_LOG.md` EVERY SINGLE TURN — not just before formal
    reviews.** It is the only record of Cursor's work you can see (Cursor's chat is invisible to
    you; only committed files count). Before responding, check it for what Cursor did/claimed since
    last turn, what is outstanding, and the improvement backlog — then verify against the real
    artifacts. A turn that acts on Cursor's work without first reading the handoff log is working
    blind. (Manual §13 / core-rules §1.1 J own the mechanics; this line makes "every turn" explicit.)
12. **A problem you FLAG must be FIXED the same turn — never merely flagged (owner 2026-07-20).**
    "Flag it and move on / flag it and defer" is BANNED — it is exactly what let a contradictory rule
    sit in two copies across sessions while you kept noting it. The instant you identify a problem:
    (a) **fix it that turn** — directly if it is yours (a governance/doc/accuracy fix: do it and
    commit), or put the **exact fix into that same turn's `COPY TO CURSOR` block** if it needs Cursor;
    AND (b) **tell the owner both the PROBLEM and the CHANGE implemented**, the same turn. A response
    that ends with a flagged-but-unaddressed problem is INCOMPLETE — go back and address it before
    sending. Repeated flags of the same unfixed problem is a §12 violation, not diligence.
13. **Invite Cursor's recommendations — do NOT blanket-ban its input (owner 2026-07-21).** The rule is
    "execute the brief exactly and never ACT off-brief without approval" — NOT "stay silent." Cursor is
    on the ground and sees things; it is EXPECTED to SURFACE recommendations, concerns, risks, and
    improvements it discovers (in its `## Confront Claude` block), as PROPOSALS, never as unilateral
    actions. Claude evaluates each surfaced item: adopt it (into a brief) if it is effectively optimal
    and improves the platform, or decline it with a stated reason. Phrase prompts as "execute exactly;
    surface any recommendations/concerns for my evaluation" — never a bare "no off-brief work" that
    suppresses useful input. The ban is on ACTING off-brief, not on RECOMMENDING.
14. **Honest-gap ≠ un-collected (owner 2026-07-21).** Honest-gap ("No verified record available") is
    ONLY for a record that genuinely does not exist. If the verified record EXISTS but simply has not
    been ingested — e.g. a 30-vote sample when the member's full roll-call record exists, or 5 CREC
    statements when decades of floor speeches exist — that is UNDER-COLLECTION, not an honest gap.
    ACQUIRE the real data; never accept or approve a thin profile as "complete" while collectable
    verified data remains. For a reference profile being locked to gold-standard, FULL acquisition of
    that member's own data (votes, statements, finance, news) comes BEFORE the lock — full depth for
    the ONE reference is exactly "complete the gold-standard before scaling," not mass 537-collection.

---

## When this file and the operating manual disagree

They shouldn't — this file is a distillation, not a separate ruleset. If a conflict appears, that
is itself a defect: reconcile both files in the same turn you notice it, per core-rules' "one fact
one file" rule, and flag the reconciliation to the owner.

---

*Sub-file of `.claude/rules/CLAUDE_CODE_OPERATING_MANUAL.md`, which owns the full role/procedure. Read
every turn, per `docs/AGENT_INDEX.md`.*
