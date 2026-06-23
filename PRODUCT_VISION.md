# The Ledger — Product Vision

**Purpose:** Owner definition of what makes The Ledger *desirable*. Guides editorial voice, UX priorities, and content depth. Does **not** authorize scope changes or pause integration work — see `AGENTS.md` and `lib/data/DATA_INTEGRATION_PLAN.md` for build order.

---

## What "desirable" means

The Ledger should be:

1. **Easily navigable** — works 100% properly; no broken flows or dead ends.
2. **Objective, informative, thought-provoking** — a *large* quantity of sourced facts so someone with **zero prior knowledge** can research any candidate or politician and form their own opinion.
3. **The complete resource for politics** — counter misinformation, information gaps, and politicians hiding the truth.
4. **Not preachy accountability** — present facts so users can see when officials aren't following their word (promises vs. votes/actions). Let the record speak; do not scold.
5. **Better than Google for political research** — Google surfaces any article or headline; The Ledger surfaces **objective facts** with **factual headlines**, never editorial framing like "X is evil / good / corrupt."

---

## Beat Google

| Google | The Ledger |
|--------|------------|
| Surfaces any article or headline | Surfaces verified, dated, linked facts |
| Ranking favors engagement and opinion | Ranking favors source tier and recency |
| User must judge bias per outlet | Tier labels and links are visible on every claim |

The goal is not to replace journalism — it is to give citizens a **structured, sourced fact base** they can trust to start (or deepen) their own research.

---

## Headline and summary voice

Headlines and summaries are **fact-led**, neutral verb voice, no moral labels.

### Good (factual)

- "Signed [bill] before/after purchasing [shares]" — sourced, dated, linked.
- "Decision on [issue] affected constituents [how]" — sourced, dated, linked.
- "Voted [Yea/Nay] on [bill]; public statement on [date] supported [position]" — promise/consistency as factual diff.

### Bad (editorial)

- Subjective judgment: "corrupt," "evil," "hero," "sellout," "traitor."
- Opinion framing: "X proves they don't care about [group]."
- Inferred intent presented as fact: "clearly trying to hide…"

Every provocative or high-salience claim needs **source tier**, **date**, and **link** (per `ledger-data-policy`).

---

## Promise and consistency tracking

Track **said X → did Y → on date Z** as a factual diff:

- Quote or paraphrase the public statement with source.
- Show the vote, signature, trade, or action with source.
- Let the user draw conclusions — no editorial scolding ("hypocrite," "liar").

When records conflict or are incomplete, show honest gaps: *"No verified record available"* — never fabricate to fill holes.

---

## Information depth

- **Volume matters:** profiles should feel encyclopedic in sourced facts, not thin bios.
- **Zero prior knowledge:** define terms, link to bills, show context (committee, vote tally, effective date).
- **Thought-provoking by accumulation:** juxtapose donations, votes, trades, and statements — sourced — so patterns emerge without the app assigning motive.

---

## Relationship to other docs

| Doc | Role |
|-----|------|
| `AGENTS.md` | Agent rules, build workflow, data credibility summary |
| `.cursor/rules/ledger-data-policy.mdc` | Source tiers, office resolution, scope priority |
| `.cursor/rules/ledger-editorial-voice.mdc` | Headline/summary voice, promise-diff framing |
| `FUTURE_ROADMAP.md` | Owner feature ideas for later phases (not current sprint) |
| `lib/data/DATA_INTEGRATION_PLAN.md` | Integration pipeline and sprint order |
