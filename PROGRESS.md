# The Ledger — Roadmap & Progression Expectations

**Last updated:** 2026-09-04T04:05 Z · **Branch:** `main` ·
**Production (sole Vercel project):** https://the-ledger-main.vercel.app

**Deploy rule (binding):** The owner deleted all other Vercel projects (`the-ledger-jcjh`,
`the-ledger`, `the-ledger-s4dn`, etc.) — **`the-ledger-main` is the only project.** Agents must not reference, deploy
to, push preview URLs for, or report deploy status on any former project name. Do not treat GitHub
deployment rows or Vercel bot comments for deleted projects as authoritative.

**⚠️ KNOWN GAP — most politician profiles are near-empty by design, not by bug (confirmed
2026-07-19):** Only **7 of 537** Congress members (`S000033`, `O000172`, `M000355`, `M001184`,
`W000817`, `C001098`, `P000197`) have real votes/finance/statements/news. The other **530** render
via `lib/data/generatedPoliticians.ts` as intentionally **LIGHTWEIGHT** records — verified name,
party, state, and office only; votes/finance/stockTrades/issues/controversies/news are empty arrays
by design, so those profiles show honest "no verified record" placeholders. This is the direct,
correct consequence of the 2026-07-04 DNU mock-data quarantine (fabricated data removed platform-
wide) landing before M2 (real-data scaling to all 537) has started. **M2 cannot start until M1's
Phase E gate clears — see Milestones below — which has been sitting on an owner visual review since
before today.** This is not a new regression to hunt; it is the roadmap's own documented sequencing,
just stalled at the one gate only the owner can clear.
**This file replaces the old progress log as the canonical forward guide.** It binds BOTH
agents (Claude Code + Cursor). Rules live in `.cursor/rules/ledger-core-rules.mdc` — this file
never restates them, it sequences the work.

---

## Navigation Plan (Flawless Agent-Navigation System) — status

| Phase | Deliverable | PR | Merge SHA | Status |
|-------|-------------|-----|-----------|--------|
| 0 | Inventory + GENERATED header + audit:inventory-md alias | #44 | `fbbe7ff` | merged |
| 1 | News path reconcile + docs/sources/florida.md (single template) + delete lib/data/sourceTiers.ts shim | #51 | `b89f1cb` | merged |
| 2 | 8 dead files removed + 15 archived | #52 | `4110812` | merged |
| 3 | AGENT_INDEX reachability | #53 | `a730f81` | merged |
| 4 | navigationIntegrity guard | #54 | `4625976` | merged — florida.md split into media.md + agencies.md landed in PR #54 (`56ac08d`) |
| 5 | Continuous-improvement rule | #54+#55 | `4625976` / `61e6d5c` | merged |

Navigation plan **COMPLETE** + guard-enforced; `navigationIntegrity` fails the build on any new orphan. *(Phase 1 delivered single `docs/sources/florida.md`; the media.md + agencies.md split shipped in PR #54 @ `56ac08d`.)*

---

## How to use this file

- **Claude Code** decides sequencing within/among milestones, writes briefs, reviews output,
  approves pushes. **Cursor** executes briefs exactly, collects all data, commits + pushes on
  approval. **Owner** reviews visual/layout/product checkpoints only (marked 👁 below).
- Work advances milestone by milestone. A milestone is DONE only when every acceptance box is
  verified by Claude against real artifacts (rendered output for anything user-facing).
- No milestone may start before its entry criteria are met. No skipping ahead; no unreviewed
  chaining. Scope beyond the current milestone = out of scope unless the owner directs it.
- Update the **Status board** (bottom) in the same commit as the work it describes. A stale
  status line is a bug (same rule as stale violation flags).

---

## Definition of DONE — v1.0 launch criteria

The app is launch-ready when ALL of the following are true:

1. **All 537 federal members** have per-destination profiles (`profiles/{bioguideId}/`) with:
   real votes (≥30 where cast), FEC finance, CREC statements where the member speaks,
   subject-matched Said→Did where the record supports it, approved-outlet news, and honestly
   diagnosed gaps everywhere else (`honest-gap` / `none-in-range` / `fetch-failed` — never
   silent empties, never fabrication).
2. **Zero mega-bundles remain** — `topicPositions.json` fully retired; every fact has exactly
   one storage location and one read path.
3. **All guard suites green in CI** on every push (crec, org-join, source-integrity incl.
   display/positions/sufficiency/subject-match, golden snapshots).
4. **Flagship quality:** every profile's Key Issues, Said→Did, Voting Record, Money, and
   Controversies render clean, verbatim, dated, sourced, and honestly gapped — to the locked
   S000033 gold standard.
5. **Crawlability:** every profile server-rendered, real name slugs, sitemap, self-hosted font;
   Lighthouse pass on profile pages.
6. **Scheduled refresh:** GitHub Actions re-syncs votes/finance/news on schedule with failure
   alerts; a failed sync can never write emptiness over good data (§6).
7. **Owner visual sign-off** 👁 on the final profile template and each major surface.

Post-v1.0 (explicitly deferred): governors/statewide, local elections beyond demo, lobbying
deep-links, Senate eFD trades (blocked upstream), historical Congresses beyond 118.

---

## Milestones

### M1 — Hardening + system confirmation (IN FLIGHT — Phase D/E briefs issued)
Entry: Phase C verified (done 2026-07-04). Cursor executing D1→D4, then E.
- **D1** Single source of truth: retire mock blocks + demo votes for migrated members; real
  slugs for Warren/Cruz; VOTES_PER_MEMBER 10→30. *(+ Cruz positions vote-narration micro-fix.)*
- **D2** Rules cleanup: one canonical tier table; credibility decisions route to Claude;
  stale flags deleted; HARD RULES header; approval-before-push reconciled.
- **D3** News via approved-outlet RSS registry (up to 15 relevant/member, honest counts).
- **D4** CI guards workflow + golden-profile snapshots (S000033, M000355).
- **E** `npm run profile:build -- --members P000197` — ONE command, collect→classify→filter→
  pair→validate→apply→report, zero hand-fixes. PASS = pipeline certified.
- Acceptance: all guard suites green in CI; P000197 profile complete + honestly gapped with no
  manual intervention; 👁 owner reviews Pelosi + one existing profile visually.

### M2 — Scale to all 537 in reviewed batches
Entry: M1 done (pipeline certified by the Pelosi test).
- **Batch ladder owner:** `docs/workflows/BATCH_SCALING.md` — canonical protocol, ladder table,
  and per-batch review loop. This file (`PROGRESS.md`) tracks milestone status only; do not
  duplicate batch mechanics here.
- Batches: **15 → 50 → 100 → 150 → remainder** (see BATCH_SCALING ladder table), each via
  `profile:build`. Never one mass run.
- Batch protocol (every batch): Cursor runs the command → posts depth table + honest-gap/
  fetch-failed ledger + all guard results → Claude spot-verifies ≥3 members' rendered output
  (1 chosen for risk: female/Mc-surname/House/low-profile) + fetch-checks ≥5 source URLs →
  approve → push → next batch. Any new defect class = pipeline fix + guard + reprocess before
  the next batch (defects fix forward into the pipeline, never hand-patched per member).
- Batch composition: featured/high-traffic members first, then by state coverage.
- Acceptance: 537/537 migrated; bundle deleted; per-batch reports archived in this file's log.

### M3 — Follow the Money depth
Entry: M2 ≥ 100 members migrated (money pipeline can develop in parallel after M1 on migrated set).
- FEC Schedule A national coverage keyed by bioguideId (small batches, same protocol).
- Org/PAC registry expansion → donor-context rows (individual-donor exclusion guard already
  live); each org/PAC gets a click-through detail view 👁 (owner directed 2026-07-03).
- House PTR stock trades wired per profile; Senate eFD stays an honest documented gap.
- Acceptance: Money & Donors + Stock Trades render real data or honest gaps for all migrated
  members; no causation language (§3); 👁 owner reviews the org detail view design.

### M4 — Controversies & endorsements at scale
Entry: M2 complete (needs full profile base).
- Pipeline (not hand-curation) for controversies: multi-source corroboration enforced
  (2+ independent approved outlets or official record), `alleged` labeling exactly per rules,
  every source a specific dated URL. High-profile members (e.g. Trump-adjacent, leadership)
  get deeper sweeps — this is the owner's named priority category; volume varies honestly.
- Endorsements: made + received, verifiable sources only, small source-tier subtext 👁.
- Acceptance: category files + guards (already exist) pass at scale; spot-verified per batch.

### M5 — Search, compare & discovery surfaces
Entry: M2 complete.
- Search results enriched from per-destination files (position snippet + latest action).
- Compare view reads the same accessors (no parallel data); elections pages keep mock
  disclaimers until real pipelines exist (never silently mix).
- Acceptance: search/compare verified against profile data 1:1; 👁 owner reviews UX.

### M6 — SEO / performance / crawlability
Entry: can interleave with M3–M5.
- Sitemap for all profiles; metadata/OpenGraph per member; font self-host (open item);
  Lighthouse ≥90 on profile pages; slug audit (zero bioguideId-only URLs).
- Acceptance: crawler-visible SSR verified (curl the HTML), Lighthouse report attached.

### M7 — Automated refresh + operations
Entry: M2 complete.
- GitHub Actions schedules: votes/finance daily, news 2×/day, CREC weekly, legislators weekly —
  each writes through the same validators; failure = alert + no write (never blank over good
  data). Keys via repo secrets (`setup-github-secrets.sh`).
- Acceptance: one full scheduled cycle observed clean; forced-failure test proves no-overwrite.

### M8 — Launch hardening & sign-off
Entry: M1–M7 done.
- Full-surface audit sweep (same method as the 2026-07-04 conduit audit) by BOTH agents.
- Golden snapshots extended to 5 members across chambers/parties/genders.
- 👁 Owner full visual pass on every surface; punch list; fix; final approval; launch.

---

## Standing blockers (upstream, documented honestly)

| Item | Status |
|------|--------|
| Senate eFD stock trades | HTTP 503 maintenance — House PTR proceeds; honest gap in UI |
| OpenSecrets API | Deferred — FEC Schedule A + org registry substitute |
| NewsAPI | 426 plan restriction — approved-outlet RSS (D3) is the path |
| SAM.gov / FARA eFile | Identity verification / fetch-blocked — documented in UI |
| GDELT API | Rate-limited for bursts — RSS primary; GDELT bulk files = future decision |

## Registered no-key endpoints (`.env.local`)

FARA, USASpending, GovTrack, Senate LDA, House/Senate disclosures, Census, GDELT, MIT
Elections, OpenCorporates — unchanged from prior log (see `.env.local` and `KEYS.md`).

---

## Status board (update in the same commit as the work)

| Track | State (2026-07-19 — deploy pipeline; prior rows still as of `71b61c2` unless noted) |
|-------|--------------------|
| **Today's merges** | S2 (PR #41), source registry (PR #42), PR #39, W1 wiring, PR #43 (dead officials route deleted + sitemap 613 entries + Wave 1 data-loss guards), PR #46 (W3c checklist fix + W4 file audit) — all merged to `main`. PR #46 merged with a process defect (see below); content itself verified good post-merge. |
| **Merge-gate incident** | PR #46 merged 2 min after opening, ~10 min before Claude's review posted, despite its own "STOP for Claude review" text. Fixed forward on `main` this session (PR #45, `cc49e04`): duplicate rule bullet removed, three-stage build loop restored, HARD RULE strengthened to "approval before MERGE" (not just push), Cursor confronted directly on PR #45. **Owner recommendation: add GitHub branch protection (required review) on `main` — text rules alone were bypassed.** |
| **Aging PR sweep (assigned to Cursor, not yet done)** | PRs #28, #29, #30, #31, #40 open since 2026-07-14–19, no recorded Claude review. Spec posted on PR #45; awaiting Cursor action. |
| FL `/states/FL` deploy | PR #39 landed this session; live at the approved URL — confirm current render matches the locked spec on next visual pass |
| Migrated gold profiles | 7/537 (S000033, O000172, M000355, M001184, W000817, C001098, P000197) — all 7 at 30-vote depth + depth artifacts (Brief B T4-5-7, `9c310d6`; counts re-verified 07-08). **The other 530 are intentionally lightweight (name/party/state/office only, no votes/finance/news) — this is what most profile clicks currently show; see the KNOWN GAP note at the top of this file.** |
| Docs cleanup + FL script consolidation | ✅ agent index, SETUP, FLORIDA_DATA, BATCH_SCALING, archive |
| Phase C (display/credibility fix stack) | ✅ verified by Claude |
| Phase D1–D4 | ✅ done (mock abolition, rules, RSS, CI guards) |
| Phase E (Pelosi pipeline test) | In review — P000197 profile:build guards PASS; awaits owner visual 👁 |
| Recovery audit (P0–P7) | ✅ complete — prebuild + full build pass |
| Guard suites | **23** prebuild commands + render-integrity postbuild (see `docs/AGENT_INDEX.md`) + CI via guards.yml (warmed render step) |
| Font / Turbopack | ✅ system stack (M6 self-host optional for brand parity) |
| News | Manifest-driven RSS sync with required `status` field + news-status guard + feed-health report (Brief B T1-2, `3bd9ac4`/`24646f7`); honest gaps where feeds thin; Roll Call feed auto-disabled after 3 timeouts |
| P000197 positions | Refill executed 2026-07-08 — scraped to bundle; migrate filters → **honest-gap** (zero scaffolds); see `data/reports/P000197-positions-diagnosis.json` |
| P0/P1 audit debt | ✅ prebuild deterministic; sync-news-rss import guard + --members; FEC schedule-A paths canonical (`cursor/p0-p1-debt-remediation-4114`) |
| Scoped syncs (§5 no-full-corpus law) | `--members` scoping live: votes-national (+ under-filled high-water-mark bypass `71b61c2`), stock-trades (§6 meta honesty), RSS news |
| Failure-handoff rules | §1.1 hardened: autonomous handoff after 1st failure, anti-stale evidence, three-strike same-turn flow (`fdd025c`, `d443ecb`, `828e650`) |
| Optimization program | ✅ W0–W5 complete (sync kernel, manifest index, read-path docs, archive one-offs, optimization guards, profile:build validate-only + depth JSON) |
| File audit progress | L1 + L2/L3 high-priority reviewed (22 files); L5–L8 pending M2 scale |
| M2 scaling | **BLOCKED on M1 entry criteria — Phase E owner visual sign-off on the P000197 (Nancy Pelosi) pipeline test, not yet given.** Guards pass; this is a genuine owner-only gate, not an agent task. Live profile: the approved URL's `/politicians/nancy-pelosi`. This is the actual unblock for the 530-empty-profile gap above — once approved, M2's batch protocol (15→50→100→150→remainder) can start. |

## Compressed history (pre-roadmap)

Phases 1–16 (2026-06-24 → 06-29): national votes/finance merge (553/238), FEC 527/537, topic
panels 537/537, SSR profile pages, Said→Did panel, mock disclaimers, member deep ingest
537/537. Phase 17a (06-30): S000033 pilot locked. Phase 17b batch #1 (07-01 → 07-04):
6 members migrated to per-destination files; gendered-honorific CREC bug fixed; classifier
rebuilt (word-boundary + weighted); Said→Did subject-match enforced; display pipeline
centralized (`displaySummary.ts`); positions purged of tautologies; reprocess-without-refetch
added; 3→6 guard suites; full-conduit audit (11 findings, all fixed or in flight).
