# The Ledger — Roadmap & Progression Expectations

**Last updated:** 2026-07-04 · **Branch:** `main` · **Live demo:** https://the-ledger-gamma.vercel.app
**This file replaces the old progress log as the canonical forward guide.** It binds BOTH
agents (Claude Code + Cursor). Rules live in `.cursor/rules/ledger-core-rules.mdc` — this file
never restates them, it sequences the work.

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
- Batches: **15 → 50 → 100 → 150 → remainder**, each via `profile:build`. Never one mass run.
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
| VoteSmart NPAT | Deferred — Ballotpedia + GovInfo CREC substitute |
| OpenSecrets API | Deferred — FEC Schedule A + org registry substitute |
| NewsAPI | 426 plan restriction — approved-outlet RSS (D3) is the path |
| SAM.gov / FARA eFile | Identity verification / fetch-blocked — documented in UI |
| GDELT API | Rate-limited for bursts — RSS primary; GDELT bulk files = future decision |

## Registered no-key endpoints (`.env.local`)

FARA, USASpending, GovTrack, Senate LDA, House/Senate disclosures, Census, GDELT, MIT
Elections, OpenCorporates — unchanged from prior log (see `.env.local` and `KEYS.md`).

---

## Status board (update in the same commit as the work)

| Track | State (2026-07-04) |
|-------|--------------------|
| Migrated gold profiles | 6/537 (S000033, O000172, M000355, M001184, W000817, C001098) |
| Phase C (display/credibility fix stack) | ✅ verified by Claude |
| Phase D1 (mock abolition + slugs) | ✅ commit f0dcaa3 on origin/main |
| Phase D2 (rules consolidation) | ✅ HARD RULES header; single tier table; approval-before-push |
| Phase D3 (RSS news) | ✅ registry + sync:news-rss; 2/6 with articles, 4 honest-gap |
| Phase D4 (CI + snapshots) | ✅ guards.yml + golden snapshots S000033/M000355 |
| Phase E (Pelosi pipeline test) | Briefed, blocked on D |
| Guard suites | 48+ locally; CI via guards.yml (D4) |
| Font self-host | OPEN (build depends on fonts.gstatic.com) |
| News | RSS pipeline (D3); 2 Guardian items pre-sync |

## Compressed history (pre-roadmap)

Phases 1–16 (2026-06-24 → 06-29): national votes/finance merge (553/238), FEC 527/537, topic
panels 537/537, SSR profile pages, Said→Did panel, mock disclaimers, member deep ingest
537/537. Phase 17a (06-30): S000033 pilot locked. Phase 17b batch #1 (07-01 → 07-04):
6 members migrated to per-destination files; gendered-honorific CREC bug fixed; classifier
rebuilt (word-boundary + weighted); Said→Did subject-match enforced; display pipeline
centralized (`displaySummary.ts`); positions purged of tautologies; reprocess-without-refetch
added; 3→6 guard suites; full-conduit audit (11 findings, all fixed or in flight).
