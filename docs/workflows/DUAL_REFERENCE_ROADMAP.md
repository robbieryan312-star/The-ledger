# Dual-reference roadmap — lock one state + one individual before scale

**Owner directive (2026-07-19):** Finish and validate **one state** (Florida) and **one individual**
(Bernie Sanders `S000033`) as the reference implementations. Every data conduit (source → sync →
destination file → UI section) must be **covered, approved, and verified** on these two references
before scaling. Scaling uses a **per-conduit ladder** (not blind mass migration).

**Binds:** Claude (sequencing + review) · Cursor (execution) · Owner (visual/product sign-off 👁).

Cross-refs: `PROGRESS.md` (milestones) · `PILOT_PROFILE_CHECKLIST.md` (federal member contract) ·
`docs/PILOT_STATE_CHECKLIST.md` (state contract) · `docs/OBJECTIVE_SOURCES.md` (source constitution) ·
`docs/workflows/BATCH_SCALING.md` (batch mechanics).

---

## Strategic order (non-negotiable)

```
1. LOCK Florida state profile (/states/FL) — presentation + data conduits verified
2. LOCK Sanders federal profile (S000033) — all 12 layers filled OR honest-gap with evidence
3. Per-conduit scale: 1 → 10 → 25 → 80 → 200 → completion (537 members / 50 states)
4. After EVERY collect → present → sync cycle: dual-agent review + process improvement log
```

Do **not** advance the member-count ladder until the **conduit** for that data type passes on both
reference profiles (or is owner-approved as a permanent honest gap).

---

## Per-conduit scaling ladder

Apply **independently** to each data type (votes, finance, CREC/Said, platform positions, news,
org→vote joins, stock trades, controversies, endorsements, legislation, etc.):

| Stage | Scope | Gate before next stage |
|-------|--------|-------------------------|
| **1** | Reference only (`S000033` + `FL`) | Conduit verified on both; guards green; Claude PASS |
| **10** | First expansion batch | Spot-check ≥3 members/states; zero new defect class |
| **25** | Second expansion | Batch report + render review; guard fixtures append-only |
| **80** | Third expansion | Throughput + failure-handling proven; no data-loss regressions |
| **200** | Fourth expansion | Same protocol |
| **completion** | Full corpus (537 / 50 states) | Owner 👁 on template; sitemap; scheduled refresh |

**State conduits** use the same ladder: verify on Florida first, then 10 states → 25 → … → 50.

---

## Review gate (after every collect → present → sync)

Mandatory before claiming a conduit stage complete:

1. **Artifact check** — read the real JSON/render (not the sync script's self-report).
2. **Manifest/checklist parity** — claimed `done`/`filled` must match disk (`§1.1 M`).
3. **Guards** — `npm run prebuild` + relevant profile/state guards exit 0.
4. **Cursor report** — counts, honest gaps, log path (`/tmp/ledger-<conduit>.log`).
5. **Claude review** — PASS/FAIL; improvements written to `BATCH_SCALING.md` or this file.
6. **Owner 👁** — when the change affects presentation (labels, layout, section visibility).

---

## Reference A — Florida (`/states/FL`)

**Visual:** Owner sign-off received 2026-07-19 — **presentation LOCKED** (changes need new owner direction).

**Data contract:** `docs/PILOT_STATE_CHECKLIST.md` (12 conduits).

**Current summary (2026-07-19, `main`):**

| Area | Status | Notes |
|------|--------|-------|
| Economy / rankings / counties | **filled** (keyed Census + BLS where configured) | 67-county set; preserve-on-failure wired (Wave 1) |
| State politicians roster | **filled** | Federal FL delegation from roster |
| Legislation (LegiScan) | **sample committed** (10 bills on disk) | Live refresh needs `LEGISCAN_API_KEY` |
| Courts | **filled** | Slice + honest-gap note when thin |
| News (ingest only) / OpenStates / SAM / GovInfo | News slice **not on `/states/FL`** (48 articles in `news-florida.json` for FL-politician profiles only); others keyed gaps | Need keys; preserve prior on failure |
| County drilldown (map) | **DEAD UI** | `countyByFips` never populated — product decision: wire or remove (see `FILE_INVENTORY_AUDIT.md`) |

**Next conduit work:** Close keyed gaps where owner has secrets; document permanent gaps in checklist.

---

## Reference B — Bernie Sanders (`S000033`)

**Role:** THE federal gold-standard profile per `ledger-core-rules.mdc` §1 and `PILOT_PROFILE_CHECKLIST.md`.

**Profile URL:** `/politicians/bernie-sanders`

**Manifest snapshot (2026-07-19):**

| # | Layer | Manifest | Action |
|---|-------|----------|--------|
| 1 | Office/header | filled | ✅ locked |
| 2 | Votes | filled (30) | ✅ at depth target |
| 3 | Finance totals | filled | ✅ |
| 4 | Schedule A | filled (pilot file) | ⚠️ verify national FEC path for scale |
| 5 | Org→vote links | **honest-gap** | Documented — pilot Schedule A individuals-only; evaluate national Schedule A |
| 6 | Platform positions | **honest-gap** | **Pipeline gap** — Ballotpedia path not populating `platformPositions` |
| 7 | CREC / Said | filled | ✅ |
| 8 | Said→Did | filled (**1** link on disk) | ⚠️ target **15** per layout spec — **not reference-complete** |
| 9 | Legislation | filled | ✅ |
| 10 | Journalism | partial | Needs 2-source corroboration path |
| 11 | News | filled/partial | RSS + national paths |
| 12 | Stock trades | **honest-gap** | Senate eFD upstream blocked |

**Sanders is NOT launch-complete until every row is `filled` OR an owner-approved permanent
`honest-gap` with conduit verified end-to-end.**

---

## Relationship to milestones M1–M8

| Milestone | Adjustment |
|-----------|------------|
| **M1** | Refocus: certify **S000033 complete** + **FL checklist complete** before Pelosi-only E test |
| **M2** | Member batches subordinate to **per-conduit ladder** (1→10→25→80→200→537) |
| **M3–M7** | Unchanged intent; each money/news/controversy conduit follows the ladder from Sanders/FL |
| **M8** | Launch requires both reference profiles signed off 👁 + conduit completion table green |

---

## Process improvement log (append-only)

| Date | Conduit | Finding | Process change |
|------|---------|---------|----------------|
| 2026-07-19 | Checklist accuracy | PILOT rows 5–6 said `done`; manifest `honest-gap` | W3c guard + §1.1 M accuracy mandate |
| 2026-07-19 | FL ingest | Failed fetch overwrote live data | Wave 1 preserve-on-failure |
| 2026-07-19 | Scaling model | 15→50 batch ladder raced ahead of conduit verification | This roadmap — conduit-first ladder |
