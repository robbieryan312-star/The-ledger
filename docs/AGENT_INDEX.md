# Agent navigation index — START HERE

**This is the single map of where everything lives.** Before acting, find your need in the
**"WHERE DO I FIND X?"** table below and go to the ONE file that owns it. Do not guess, do not
create a parallel file, and **do not** use `docs/archive/` for current policy.

If two files seem to say the same thing, the **owner** column here is authoritative — the other is
a redirect or is stale (see "Redirect & duplicate files" at the bottom, and fix it per core-rules
"one fact, one file").

---

## 1. Session start (mandatory read order — unchanged, crucial)

Every agent reads these every turn, in this order:

1. `.cursor/rules/ledger-core-rules.mdc` — binding rules for ALL agents
2. `.claude/rules/CLAUDE_OWNER_DIRECTIVES.md` — **Claude-only**, checked every response — the owner's
   direct instructions as a short literal checklist
3. `docs/CURSOR_IMPLEMENTATION_MANUAL.md` — **Cursor-only** implementation engineer role & discipline
4. `.claude/rules/CLAUDE_CODE_OPERATING_MANUAL.md` — **Claude-only** full role/procedure (Cursor aware)
5. `docs/workflows/AGENT_HANDOFF_LOG.md` — agent↔agent handoff / work log (§1.1 J)
5b. `docs/workflows/IMPROVEMENT_BACKLOG.md` — **SINGLE** improvement backlog (never a second table)
6. `PROGRESS.md` — milestones, status board, blockers
7. `docs/OBJECTIVE_SOURCES.md` — the **source constitution** (WHO: approved sources, tiers, keys)
8. `lib/data/SOURCE_LOOKUP.md` — the **routing table** (HOW: data need → command → destination)
9. `KEYS.md` — SET vs EMPTY env vars (values live only in `.env.local`)
10. `REPO.md` — canonical repo is `The-ledger` on `main`
11. `PILOT_PROFILE_CHECKLIST.md` — what a complete federal profile requires (S000033 reference)
12. `docs/workflows/FILE_AUDIT_LEDGER.md` — **living tracker** for sync/code optimization (L1–L8); required by `npm run agent:preflight`

Also read when relevant: `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`,
`.cursor/rules/ledger-editorial-voice.mdc`.

---

## 2. WHERE DO I FIND X? — master resource map

| I need… | Go to the ONE file that owns it |
|---------|--------------------------------|
| **Which NATIONAL/federal source/outlet is approved + its tier** | `docs/OBJECTIVE_SOURCES.md` (the constitution — national + cross-state only) |
| **Which STATE-specific / local media outlet to use for a given state** | that state's source tree: `docs/sources/<state>.md` → `docs/sources/<state>/media.md` (FL reference: `docs/sources/florida/media.md`). Local journalists only — not API keys. |
| **Which STATE-native agency / official provider to use for a given state** | `docs/sources/<state>/agencies.md` (FL: `docs/sources/florida/agencies.md`). State-hosted providers only — not multi-state vendors. |
| **Which API key unlocks a data type + SET/EMPTY status** | `docs/OBJECTIVE_SOURCES.md` (key-routing matrix) · `KEYS.md` (SET/EMPTY only) |
| **How to retrieve a data type (command + destination)** | `lib/data/SOURCE_LOOKUP.md` → and the RUNBOOK in §3 below |
| **Machine-readable source list (for code)** | `lib/data/sourceCatalog.ts` |
| **What a complete member profile requires** | `PILOT_PROFILE_CHECKLIST.md` |
| **What a complete state profile requires** | `docs/PILOT_STATE_CHECKLIST.md` |
| **FL county-map elected officials (M8 Option A — reference-2)** | `docs/workflows/M8_COUNTY_MAP_DECISION.md` + `lib/data/countyMap.ts` / `lib/data/generated/countyMap/fl-reference-counties.json` — ⛔ STOP before scaling past Miami-Dade+Liberty |
| **M2 batch scaling ladder (canonical owner)** | `docs/workflows/BATCH_SCALING.md` — batch protocol + ladder table |
| **Process improvement at scale (where to log)** | `docs/workflows/BATCH_SCALING.md` § Improvement log (+ `DUAL_REFERENCE_ROADMAP.md` for dual-reference conduits) |
| **Strategic dual-reference roadmap (FL + S000033)** | `docs/workflows/DUAL_REFERENCE_ROADMAP.md` |
| **Tier code values (official/nonpartisan/media/alleged/unverified)** | `lib/types/index.ts` (the `SourceTier` union) |
| **Editorial voice / banned words / Said→Did format** | `.cursor/rules/ledger-editorial-voice.mdc` |
| **Corroboration & banned-source policy** | `.cursor/rules/ledger-data-policy.mdc` |
| **Improvement backlog (SINGLE canonical — never a second table)** | `docs/workflows/IMPROVEMENT_BACKLOG.md` |
| **Milestones / status board (not batch mechanics)** | `PROGRESS.md` |
| **File inventory audit (nav-relevant scan)** | `docs/workflows/FILE_INVENTORY_AUDIT.md` (source: `data/reports/file-inventory.json`; regenerate via `npm run audit:inventory-md`) |
| **Sync/code optimization checklist (L1–L8 living tracker)** | `docs/workflows/FILE_AUDIT_LEDGER.md` |
| **Where generated data physically lives** | see §4 Data layer below |
| **Canonical file paths for sync outputs (in code)** | `scripts/lib/dataPaths.ts` |
| **Architecture & data flow (sync → JSON → build → UI)** | `ARCHITECTURE.md` |
| **The public /sources page (user-facing transparency, NOT an agent doc)** | `app/sources/page.tsx` renders `lib/data/generated/sourcesIndex.json` |

---

## 3. DATA RETRIEVAL RUNBOOK — how to aggregate each data type

For every data type: the **owning source doc**, the **command**, the **destination file**, and the
**fallback order**. Routing details live in `lib/data/SOURCE_LOOKUP.md`; source approval/tiers live
in `docs/OBJECTIVE_SOURCES.md`. This runbook is the quick index into both.

| Data type | Command | Destination | Source / fallback order |
|-----------|---------|-------------|-------------------------|
| **Office / identity** | `npm run sync:legislators` | `generated/currentLegislators.json`, `generated/roster.json` | unitedstates/congress-legislators (`nonpartisan`) |
| **Roll-call votes (Did)** | `npm run sync:votes-national -- --members <id>` | `generated/profiles/{id}/votes.json` | Congress.gov + Senate LIS (`official`) |
| **Campaign finance** | `npm run sync:fec-national -- --members <id>` | `generated/profiles/{id}/finance.json` | OpenFEC (`official`), `FEC_API_KEY` |
| **Itemized donors (Sched A)** | `npm run sync:fec-schedule-a` | `data/national/fec/…` | OpenFEC Schedule A (`official`) |
| **Floor speech (Said)** | `npm run sync:topic-positions -- --member <id>` | `generated/profiles/{id}/statements.json` | GovInfo CREC (`official`), `GOVINFO_API_KEY` |
| **News** | **primary:** `npm run sync:news-rss -- --members <id>` → `profiles/{id}/news.json`; **national/secondary:** `npm run sync:news-national` | `generated/profiles/{id}/news.json` (+ shared `articleCache.json`) | **Approved-outlet RSS registry FIRST** (no key) → GDELT DOC API (no key) → NewsAPI only if `NEWSAPI_KEY` plan is upgraded (currently 426-limited). Media-tier needs 2+ independent outlets or it shows unverified. |
| **Stock trades** | `npm run sync:stock-trades -- --members <id>` | `generated/profiles/{id}/trades.json` | House PTR (`official`); Senate eFD blocked (HTTP 503) → honest `fetch-failed` |
| **Platform / positions** | `npm run sync:topic-positions` | `generated/profiles/{id}/positions.json` | Ballotpedia (`nonpartisan`); honest-gap when absent |
| **Topic legislation** | `npm run ingest:member -- --bioguide <id>` | `generated/members/{id}.json` | Congress.gov API v3 (`official`) |
| **State economic (FL)** | see `docs/FLORIDA_DATA.md` | `generated/slices/*.json`, `data/florida/…` | Census ACS + BLS + BEA (`official`) |

**After ANY data sync** (mandatory chain): `npm run sync:legislators && npm run verify:office && npm run build`

**News specifically** (the recurring pain point): the working path is the **approved-outlet RSS
registry** (`sync:news-rss`), NOT NewsAPI (its key is plan-limited/426). If news looks empty, check
the opinion filter and the RSS registry match first — don't assume the source is dead. The shared
`articleCache.json` avoids re-fetching the same article across profiles.

**State/local news & sources:** national outlets (AP, Reuters, Politico…) live in the national
constitution. **State-specific local outlets** live in `docs/sources/<state>/media.md`; **state-native
official providers** in `docs/sources/<state>/agencies.md` — FL is the reference
(`docs/sources/florida/`). API keys and ingest commands never belong in those sub-files; they live
in `OBJECTIVE_SOURCES.md`, `KEYS.md`, and the state's pipeline doc (`docs/FLORIDA_DATA.md` for FL).
When collecting for a state profile, open the correct sub-file FIRST, then apply tier/corroboration
rules. This keeps each state's local sourcing self-contained as coverage scales beyond Florida.

---

## 4. Data layer — where generated data physically lives

| Topic | Location |
|-------|----------|
| Generated JSON (build-time import) | `lib/data/generated/` |
| Per-destination profiles (migrated) | `lib/data/generated/profiles/{bioguideId}/` (one file per category) |
| Accessors (import THESE in app code, never raw JSON) | `lib/data/*.ts` |
| National votes/FEC snapshots | `data/national/votes/`, `data/national/fec/` |
| Raw Florida snapshots (not imported by Next.js) | `data/florida/` |
| Guard suites | `scripts/__tests__/` |

---

## 5. Guard suites (22 commands in prebuild + render-integrity postbuild — all must pass before commit)

Local `npm run build` runs the 22 prebuild guard commands, then `postbuild` runs `test:render-integrity`
+ `test:client-chunks`. CI (`.github/workflows/guards.yml`) builds first, then a warmed external-server
render-integrity step on port 4112.

| Script | Guard |
|--------|-------|
| `test:typecheck` | TypeScript compile (`tsc --noEmit`) |
| `test:crec` | CREC procedural filter |
| `test:org-join` | FEC org/donor join |
| `test:source-integrity` | Source URL + profile integrity + ingest preserve-on-failure (data-loss) |
| `test:copy-compliance` | Editorial voice |
| `test:topic-positions-bundle` | Mega-bundle quality |
| `test:news-registry` | Approved-outlet registry |
| `test:profile-snapshots` | Golden profile snapshots |
| `test:client-bundle` | Client import boundaries |
| `test:docs-integrity` | Doc citations ↔ package.json + repo paths exist |
| `test:data-layout` | `data/` layout orphans |
| `test:env-truth` | `.env.example` ↔ code |
| `test:optimization` | syncKernel + manifest + fetch timeout guards |
| `test:docs-consistency` | Doc contradictions (retired scripts, counts, Tier labels, §1.1 cites) |
| `test:navigation-integrity` | Nav-relevant files reachable from AGENT_INDEX, npm/CI, or archive inventory |
| `test:governor-identity` | Governor bioguideId ↔ portrait identity guard |
| `test:identity-integrity` | Roster portrait ↔ bioguideId ↔ name/party/state/office |
| `test:no-unverified-official-data` | FL dashboard: no official/nonpartisan numbers without verified provenance |
| `test:state-economic-display` | Exact indicator lookup + unemployment delta sign semantics |
| `test:route-integrity` | No internal link → notFound()-only route; sitemap enumerates all routes/profiles |
| `test:vercel-json` | `vercel.json` enables deploys on `main` only (`"*": false` — no preview flood) |
| `test:render-integrity` | Headless render: overflow, images, sections (postbuild locally; warmed in CI) |
| `audit:profile-credibility` | Profile credibility audit gate |

Preflight (checks session-start files + guard scripts resolve): `npm run agent:preflight`.

---

## 6. Setup & operations

| Topic | File |
|-------|------|
| API keys, demo commands, GitHub secrets | `docs/SETUP.md` → `KEYS.md` |
| Canonical repo / branch workflow | `REPO.md` |
| National data snapshots | `data/national/README.md` |
| Batch scaling (M2) | `docs/workflows/BATCH_SCALING.md` |
| Process improvement log (any scaled workflow) | `docs/workflows/BATCH_SCALING.md` § Improvement log |
| Florida state data ingest | `docs/FLORIDA_DATA.md` |
| Product vision & voice | `PRODUCT_VISION.md` |
| Repository README (human onboarding) | `README.md` |
| Security policy | `SECURITY.md` |
| Scripts directory notes | `scripts/README.md` |
| Elections issue merge helper (deferred demo) | `lib/candidateIssues.ts` |
| Campaign promise status derivation (archive coverage script) | `lib/data/derivePromiseStatus.ts` |
| Profile build pipeline (Phase E) | `scripts/profile-build.ts` |
| M-ACQUIRE BATCH B apply (S000033 Money) | `scripts/apply-m-acquire-batch-b.ts` (`npm run apply:m-acquire-batch-b`) |
| Voteview DW-NOMINATE (scoped) | `scripts/ingest-voteview-member.ts` (`npm run ingest:voteview`) |
| Senate LDA lobbying (scoped) | `scripts/ingest-lobbying-member.ts` (`npm run ingest:lobbying`) |

---

## 7. Redirect & duplicate files — do NOT use these for decisions

These exist only to point elsewhere or are archived. Never read them for current routing; if one
ever contradicts its owner, that is a bug to fix in the same turn (core-rules "one fact, one file").

| File | Status | Real owner |
|------|--------|-----------|
| `API_KEYS.md` | redirect stub | `KEYS.md` + `docs/SETUP.md` |
| `OWNER_SETUP.md` | redirect stub | `docs/SETUP.md` |
| `FUTURE_ROADMAP.md` | redirect stub | `docs/archive/FUTURE_ROADMAP.md` |
| `PHASE17B_BATCH_WORKFLOW.md` | redirect stub | `docs/workflows/BATCH_SCALING.md` |
| `docs/STATE_COUNTY_EXPANSION.md` | redirect stub | `docs/archive/STATE_COUNTY_EXPANSION.md` |
| `docs/workflows/AUDIT_DEBT_BRIEF.md` | redirect stub | `docs/workflows/AGENT_HANDOFF_LOG.md` |
| `lib/data/DATA_SOURCES.md` | redirect stub | `lib/data/SOURCE_LOOKUP.md` + `lib/data/sourceCatalog.ts` |
| `docs/archive/DATA_SOURCES.md` | ARCHIVED (pre-DNU mock framing) | `docs/OBJECTIVE_SOURCES.md` + `lib/data/SOURCE_LOOKUP.md` |
| `docs/archive/progress-screenshots.md` | archived | — |
| `docs/archive/FUTURE_ROADMAP.md` | idea backlog, not scheduled | `PROGRESS.md` |
| `docs/archive/STATE_COUNTY_EXPANSION.md` | deferred proposal | `PROGRESS.md` (deferred; do not implement from archive) |
