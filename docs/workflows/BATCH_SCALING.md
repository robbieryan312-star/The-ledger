# Batch scaling workflow (M2)

**Canonical owner** for the M2 batch ladder, per-batch protocol, ladder table, and **process
improvement log template** (reusable for ANY scaled workflow — profiles, state conduits, ingest
pipelines). `PROGRESS.md` tracks milestone status only — batch mechanics and improvement records
live here. Strategic dual-reference sequencing (FL + S000033) is in
`docs/workflows/DUAL_REFERENCE_ROADMAP.md`.

---

## Improvement log (template — append after every scale step)

Use this table for **any** process that scales in steps (not only M2 profiles). Copy the section
into the owning doc when a new workflow scales; do not start rival logs elsewhere.

**Backfilled 2026-07-25 after audit; `collectionImprovementGuard` enforces contemporaneous rows from
PR #84 onward.** One row per process step; measured values where known, else
“not measured — captured going forward”.

| Date | Process / conduit | Scale step | Efficiency (time or cost per unit) | Effectiveness (quality/coverage/honest-gap) | Step improved | Change applied (file/command) | Next watch |
|------|-------------------|------------|-------------------------------------|---------------------------------------------|---------------|------------------------------|------------|
| 2026-07-20 | agent navigation / nav guard | 1→21 prebuild cmds | orphan injection proven (~300ms) | 0 orphan nav-relevant files on main | reachability guard | `scripts/__tests__/navigationIntegrity.test.ts` + prebuild wiring | re-run orphan test after any new lib/scripts file |
| 2026-07-18 | #58 news pipeline + D1/D2 repair | S000033 news repair | not measured — captured going forward | bare-surname false matches dropped; wire-republish no longer counts as 2nd source | bare-surname ban + independent-corroboration (wire-republish excluded) | `74f0629` / `a472dd4` · member news matching + corroboration guards | keep NewsAPI behind RSS/GDELT qualification |
| 2026-07-19 | M3 news depth iterations | S000033 news depth | not measured — captured going forward | subject-or-quoted gate; CDC releaser-class noise rejected | subject-or-quoted qualification gate | `ec4d851` / `3abd244` / `3a0e9fa` · `qualifiesMemberNewsItem` | re-check NewsAPI path applies same filter |
| 2026-07-20 | m4 Said→Did iterations | S000033 saidDid | not measured — captured going forward | CREC 1:1 pairing; embedded verbatim quote+URL on diffs | CREC 1:1 pairing + embedded verbatim quote+URL | `0ae29d1` / `9c872ea` / `9f9c8ac` · saidDid builders + guards | scale only after gold freeze |
| 2026-07-20 | m5/m6 positions + trades | S000033 gaps | not measured — captured going forward | honest-gap vs fetch-failed distinct in UI + disk | diagnosed honest-gap vs fetch-failed distinction | `5108c65` / `c25272f` · tradesEmptyStateCopy + status codes | never map fetch-failed → empty without note |
| 2026-07-22 | M-ACQUIRE Batch A (Bernie Record) | S000033 votes/saidDid | not measured — captured going forward | votes 30→201; saidDid 2→8 | procedural filter + corpus dedup | `8a1157e` · CREC procedural filter + apply batch A | watch CREC yield vs pool size |
| 2026-07-22 | M-ACQUIRE Batch B (Money) | S000033 FEC/Voteview/LDA | member-scoped ingest (vs full-corpus) | FEC ~$24.93M; SchedA 5000; Voteview −0.545/−0.427; LDA 0 diagnosed | member-scoped FEC/Voteview/LDA ingest scripts | `2e07961` / tip `0af3ac7` · `ingest:voteview` + `ingest:lobbying` + FEC national scoped | orgVoteLinks stay diagnosed when PAC $≈0 |
| 2026-07-22 | M-ACQUIRE Batch C (Voice) | S000033 news/quotes | not measured — captured going forward | news 12/15 subject/quote-qualified; CDC dropped at ingest | qualification filter at ingest | `ef27925` · NewsAPI/`sync:news-rss` qualify gate | 2-outlet corroboration still rare |
| 2026-07-22 | M-ACQUIRE Batch D (Verified gaps) | S000033 trades/controversies | not measured — captured going forward | trades fetch-failed eFD 503 preserved; controversies 2 kept | fetch-failed preserve discipline | `a28facc` · stock-trades checkpoint + honest empty-state | probe eFD when upstream recovers |
| 2026-07-21 | M8-A county reference | FL county officials ref | not measured — captured going forward | FIPS+office schema locked; build-gated | FIPS+office schema + guard | `3c5be42` · `countyMapGuard` + `countyMap/fl-reference-counties.json` | PARK build until owner A/B |
| 2026-07-25 | Channel proofs (platform stance) | M000355 Ballotpedia; sanders.senate.gov | prove script before routing | Ballotpedia control filled on M000355; official issues route proven on S000033 this PR | prove-before-routing rule | `prove:ballotpedia-platform` (branch) · `sync:official-issues-positions` · OBJECTIVE_SOURCES collection rule | any NEW channel needs one E2E proof |
| 2026-07-25 | M-RETIRE-VOTESMART | NPAT unwired; Ballotpedia channel retained | n/a (unwire + docs) | VoteSmart DEFUNCT — zero `api.votesmart.org` calls in topic sync; M000355 Ballotpedia positions kept as channel proof | unwire NPAT + route official issues→Ballotpedia→CREC | `scripts/sync-topic-positions.ts` + VoteSmart build guard + KEYS/SOURCE_LOOKUP/sourceCatalog | never re-key VoteSmart |
| 2026-07-25 | M-VOTESMART-PURGE | DELETE residual tokens; topicPositions meta field removed | n/a (purge + regenerate) | criterion A empty outside survivors; OBJECTIVE_SOURCES exactly 1; `votesmartConfigured` deleted from generated snapshot | purge + criterion-A guard | `voteSmartRetiredGuard` + `retiredNpatPurgeGuard.fixture.ts` · `topicPositions.json` | never reintroduce purge token outside survivors |
| 2026-07-25 | M-VOTESMART-PURGE v2 | owner overrule: no tombstone; generic matrix guard | n/a | live votesmart=0; wired catalog ⊆ OBJECTIVE_SOURCES matrix | absence=instruction; matrix guard | `approvedSourceMatrixGuard` · OBJECTIVE matrix rows for PTR/images/USASpending | never re-wire absent sources |
| 2026-07-19 | FL Wave-0c census re-ingest | FL demographics slice | keyed re-ingest + slice rebuild | census fields restored without wipe | keyed re-ingest + slice rebuild path | `5beb765` · `ingest:census-fl` + state-economic slice | preserve-on-failure for all FL ingests |
| 2026-07-25 | M-GOVINFO-FIX (CREC key chain + topic classify) | S000033 statements/saidDid | scoped full-depth ~94s (825 search / 341 HTML) | statements 11→13; CREC 10→12; saidDid 8→10/15 (honest-gap remainder); ceremonial thank-you stripped | api.data.gov key chain GOVINFO→DATA_GOV→FEC→CONGRESS + healthcare/shutdown topic keywords | `scripts/lib/govinfoApiKey.ts` · `sync:topic-positions` · `verify:agent-keys` · `lib/recordTopicBuckets.ts` · apply archive | watch no_topic drop-off; Said→Did toward 15 |
| 2026-07-25 | M-CREC-YIELD | S000033 CREC Said→Did yield | diagnose full-depth ~45s + sync ~80s (825/341) | stage d no_topic drop 14→0; CREC accepted ~10→24; statements 13→33; saidDid 10→15/15 filled; procedural rule unchanged | keep legislation catch-all (never null-drop Said); widen voter-eligibility / tax-breaks / student-debt→education preference; stage reject counters | `sync-topic-positions.ts` · `recordTopicBuckets.ts` · `diagnose-crec-yield.ts` · crec fixtures + classify tests · apply archive | watch speaker_miss / no_opener pool noise; do not weaken Said-vs-procedural |
| 2026-07-25 | M-POSITIONS-SANDERS | S000033 platform positions | 1 official /issues/ page → N topic stances | positions honest-gap → filled (official tier); campaign site disqualified (homepage redirect) | official issues accordion extract + disqualify + topic-class gate | `sync:official-issues-positions` · `scripts/lib/fetchSenateOfficialIssues.ts` → `profiles/S000033/positions.json` | apply same path to other senators with /issues/ accordion |
| *(example)* | profile:build / votes | 1→10 | 5.4 min/member → 4.1 | 0 new defect class | retry/backoff | `scripts/lib/resilientFetch.ts` | spot-check ≥3 members |

**Rule (binding):** core-rules §6 — a scale step without a row here (or in
`DUAL_REFERENCE_ROADMAP.md` § Process improvement log for dual-reference conduits) is **incomplete**.

---

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
- **No full-corpus syncs in agent sessions** — scope every sync with `--members` to the batch
  under review; full-corpus = scheduled CI only (see `ledger-core-rules.mdc` §5).
- A "Said" statement is spoken floor prose or a verbatim attributed media quote — never procedural
  boilerplate; enforced by the build-gated fixture (`scripts/__tests__/crecProceduralFilter.test.ts`).
- 1 media source → `'alleged'`; 2+ independent approved outlets → verified.
- `fetch failed` is UNVERIFIED, never recorded as an empty; preserve committed-good data.
- Honest gap beats fabrication — but a wrongly-dropped genuine statement is ALSO a failure.
- Port 3000 off-limits; long syncs tee to `/tmp/ledger-<batch>.log`.
