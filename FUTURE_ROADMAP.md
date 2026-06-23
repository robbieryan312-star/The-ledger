# The Ledger — Future Roadmap

**Purpose:** Capture owner ideas for later consideration. This document does **not** authorize or schedule implementation. Current sprint work continues per `lib/data/DATA_INTEGRATION_PLAN.md` and `AGENTS.md`. For what "desirable" means (editorial voice, beat-Google bar), see `PRODUCT_VISION.md`.

---

## Follow the Money (nav / tab — eye-catching)

Rename or reframe a dedicated nav/tab as **"Follow the Money"** — lobbying plus politician stock trades.

### Trace model (objective linkage only, sourced)

```
donors → politicians → bills/laws they voted on → financial benefit to donors/lobbyists
```

- Show only linkages supported by authoritative or corroborated records.
- Every step: date, source tier, link, as-of / checked date.
- No inferred causation presented as fact.

### Lobbying groups

- **Domestic vs foreign** — labeled and sorted separately.
- Foreign lobbying is its own policy topic; the app stays factual and neutral.

### Donor visibility

- Money donated to specific politicians (FEC schedules and related official feeds).

### Stock trading (STOCK Act and chamber rules)

- Objective methodology; exposure and conflict transparency.
- Newest-first; source-linked.
- **No fabricated trades** — honest gaps when records are missing.

---

## Broader scope (future phases — not current sprint)

Owner curiosity on a fuller demo timeline, including:

| Area | Scope note |
|------|------------|
| Recent presidential elections | Election info and history — recent cycles, not deep ancient history |
| Senate | Elections, candidates, elected officials |
| Federal appointed roles | Cabinet, FBI director, and other high-impact appointments |
| State governors | Office holders plus political history |
| State representatives | State legislature coverage (large scale) |

### Per-politician summaries

Thorough but not overloaded:

- Platform, agenda, causes
- Stances on major voting topics
- **Objective, sourced facts only** — journalism flagged per tier rules

---

## Principles (from AGENTS.md)

- No forced opinions.
- Tiered sources visible in UI (Tier 1 official `.gov` → Tier 4 speculative).
- Low-trust (Tier 3/4) only when corroborated by multiple sources, always flagged.
- Honest gaps: *"No verified record available"* — never fabricate to fill holes.
- Current office from authoritative feeds only; recency-weighted resolution.

---

## Phased priority (documentation only)

| Phase | Focus |
|-------|--------|
| **A — Current** | Congress roster, FEC, House votes, featured profile depth |
| **B** | Follow the Money UX + real STOCK Act + donor / FEC schedule linkage |
| **C** | Lobbying (domestic / foreign labels) + bill–vote–benefit graph (sourced) |
| **D** | Elections history (recent presidential / Senate), appointed-official feeds |
| **E** | State legislatures (large scale) |

Phases B–E are **future**; they must not block or dilute Phase A integration passes.
