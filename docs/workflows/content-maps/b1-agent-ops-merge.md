# B1 content-map — agent-ops.mdc → ledger-core-rules.mdc

**Source:** `.cursor/rules/agent-ops.mdc` (deleted after merge)  
**Survivor:** `.cursor/rules/ledger-core-rules.mdc`

| Source (agent-ops) | Destination (core-rules) | Action |
|--------------------|--------------------------|--------|
| L8–22 Session start list | §7 Session start | Merged verbatim + AGENT_INDEX as canonical index |
| L23 `docs/archive/` ban | §7 Session start | Merged |
| L25–54 AUDIT_DEBT_BRIEF work log | §1.1 J (existing) | **Duplicate — not copied** |
| L56–60 Single-writer git | §1.1 K + HARD RULES (existing) | **Duplicate — not copied** |
| L62–73 Owner delegation + email | §7 Owner delegation | Merged |
| L75–86 Substandard / cross-agent | HARD RULES + §1.1 H/I (existing) | **Duplicate — not copied** |
| L88–103 When stuck table | §1.1 G + F (existing) | **Duplicate — not copied** |
| L105–114 Do not list | §7 Do not | Merged |
| L116–121 When blocked + CAPTCHA | §7 When blocked | Merged |
| L125–126 PROGRESS every 5 msgs | §7 Session state consolidation | **Reconciled** → AUDIT_DEBT_BRIEF primary; PROGRESS milestone-only |
| L127–130 Search before asking + tee logs | §7 Session state consolidation | Merged |

**B7 fixes in same commit:**
| Location | Fix |
|----------|-----|
| HARD RULES L22–23 | Review → §1.1 F; handoff → §1.1 B |
| §1 L102–109 | Reframed 7 migrated profiles (not "lock ONE profile") |
| §1 L117–118 | Removed Claude commits application work |
| §6 L567 | 2 failures → §1.1 B |
| HARD RULES | Added **One fact, one file** (B9) |
