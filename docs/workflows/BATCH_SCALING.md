# Batch scaling workflow (M2)

The canonical loop for scaling profile data to all 537 members. Owner-defined; consistent with
`PILOT_PROFILE_CHECKLIST.md` (the per-member contract), `.cursor/rules/ledger-core-rules.mdc`
(binding rules), and the demo components (locked caps). Sequenced under **M2** in `PROGRESS.md`.
Cursor executes; Claude Code reviews.

---

## The loop (repeat per batch)

### 1. Collect — per politician, per topic/data-type
For each member in the batch, and for each required data type (see the 12 layers in
`PILOT_PROFILE_CHECKLIST.md`):
- Search and collect that member's data for that data type.
- **Prefer the most recent** data/information for each required use.
- Collect **up to the clearly-stated caps** — do not exceed them. Caps are already locked in the
  demo components (do not re-invent): 2 CREC statements/topic, 5 sponsored + 5 cosponsored
  bills/topic, 8 donors/category, 3 org-vote links, target 15 Said→Did/evidence records/profile,
  platform positions per `MAX_PLATFORM_PER_TOPIC`. Honest gap when the verified record is thin.

### 2. Flag sources for future efficiency
- Every source successfully used for a data type gets **flagged/recorded** so future searches for
  that same need are faster (a discovered-source cache). Route this through the existing
  `lib/data/SOURCE_LOOKUP.md` / `lib/data/sourceCatalog.ts` mechanism — extend, don't duplicate.
- Goal: each batch makes the next batch's search faster and more targeted.

### 3. Flag referenced entities for later
- Any article collected — including any **other politician named or referenced** in it — is
  **flagged for later potential use**, not discarded. Referenced-member mentions accumulate as
  future Said→Did / news leads.

### 4. Finish the batch
- Continue steps 1–3 until **every** member in the batch is complete to the caps (or honest gap).

### 5. Two-stage review (mandatory before the next batch)
- **Cursor self-reviews** the batch first: reports per-member counts, raw-text dumps, and its own
  accuracy/efficiency notes in the standardized format.
- **Claude Code independently reviews**: verifies accuracy by reading RAW TEXT (never a regex that
  mirrors a filter), confirms nothing genuine was degraded or over-rejected, and looks for
  **efficiency improvements** to the process.
- Improvements found are written back into this file — the process itself accumulates, it does not
  reset each batch.

### 6. Advance to the next batch — progressively larger
- M2 ladder: **15 → 50 → 100 → 150 → remainder**, each via `npm run profile:build`.
- Start each new batch **slightly larger** than the last; increase size gradually as accuracy and
  efficiency are proven.
- **Exit condition:** 537/537 migrated; bundle deleted; per-batch reports archived in `PROGRESS.md`.

---

## Batch ladder (update as we go)

| Batch | Size | Members | Accuracy result | Efficiency (min/member) | Process change made |
|-------|------|---------|-----------------|-------------------------|---------------------|
| Pilot | 1 | S000033 | clean | — | 17a baseline |
| 1–3 | 20 | (batch1/2/3) | clean quality; reliability + efficiency fixed | ~5.4 → improved | retry/backoff, granule pre-filter, comprehensive boilerplate filter + build-gated fixture |
| M2 next | 15 → 50 | TBD | pending | pending | `profile:build` one-command pipeline (Phase E cert first) |

---

## Guardrails carried into every batch (from core rules)
- A "Said" statement is spoken floor prose or a verbatim attributed media quote — never procedural
  boilerplate; enforced by the build-gated fixture (`scripts/__tests__/crecProceduralFilter.test.ts`).
- 1 media source → `'alleged'`; 2+ independent approved outlets → verified.
- `fetch failed` is UNVERIFIED, never recorded as an empty; preserve committed-good data.
- Honest gap beats fabrication — but a wrongly-dropped genuine statement is ALSO a failure.
- Port 3000 off-limits; long syncs tee to `/tmp/ledger-<batch>.log`.
