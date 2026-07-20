# Source lookup — agents & implementers

**Canonical machine-readable catalog:** `lib/data/sourceCatalog.ts`  
**Canonical source approval (WHO):** `docs/OBJECTIVE_SOURCES.md`  
**Keys & SET/EMPTY status:** `KEYS.md`  
**Credibility rules:** `.cursor/rules/ledger-data-policy.mdc`  
**State-local sources:** `docs/sources/<state>.md` → `docs/sources/<state>/media.md` + `agencies.md`
(FL: `docs/sources/florida/`). **Local journalists and state-native providers only** — never API keys.

Use this doc to answer: *“I need X for a profile — where do I look first?”*

---

## News retrieval order (binding — mirrors AGENT_INDEX §3)

1. **PRIMARY —** `npm run sync:news-rss -- --members <bioguideId>` (approved-outlet RSS registry; no key)
2. **SECONDARY —** GDELT DOC API (no key; also called from `sync:news-rss`; legacy-only bulk: `sync:news-national`)
3. **TERTIARY —** NewsAPI (`NEWSAPI_KEY`) only when plan is upgraded (426-limited today)

Florida-local outlets: `docs/sources/florida/media.md`. FL state-native providers:
`docs/sources/florida/agencies.md`. National outlets + keys: `docs/OBJECTIVE_SOURCES.md`.
Pipeline commands: `docs/FLORIDA_DATA.md`.

---

## Credibility tiers (transparency)

**Canonical tier table:** `.cursor/rules/ledger-core-rules.mdc` §3 (exact code values for UI and code).

---

## Data need → source (look here first)

| Data need | Primary source | Destination in app | Sync / output |
|-----------|----------------|-------------------|---------------|
| Current office, bioguideId | unitedstates/congress-legislators | Profile header | `sync:legislators` → `currentLegislators.json` |
| Roll-call votes (**Did**) | Congress.gov + Senate LIS XML | Voting Record | `sync:votes-national` → `data/national/votes/congress-votes.json` |
| Campaign totals | OpenFEC | Money & Donors | `sync:fec-national` → `data/national/fec/congress-finance.json` |
| Itemized donors / PACs (**Phase 17**) | OpenFEC Schedule A | Follow the Money · Topic context | `sync:fec-schedule-a` → `schedule-a.json` |
| Platform / survey text (**Said**) | Ballotpedia scrape | Track Record · Topic Record | `sync:topic-positions` → `topicPositions.json` |
| Floor speech verbatim (**Said**) | GovInfo Congressional Record | Track Record · `statements[]` | Extend `sync:topic-positions` (key SET) |
| Journalism quote (**Said**) | Approved outlets (curated) | Track Record promise diff | Featured / future curated JSON |
| Said→Did pairing | topicPositions + voteTopicId | Track Record | `buildSaidDidDiffsFromTopicPositions` |
| Bills by topic | Congress.gov deep ingest | Topic Record · legislation | `ingest:member` → `members/{bioguideId}.json` |
| STOCK trades | House PTR PDFs | Stock Trades | `sync:stock-trades` |
| News | **primary:** `npm run sync:news-rss -- --members <id>` → `profiles/{id}/news.json`; **secondary:** GDELT via same script or `sync:news-national` | `generated/profiles/{id}/news.json` (+ shared `articleCache.json`) | **Approved-outlet RSS registry FIRST** (no key) → GDELT DOC API (no key) → NewsAPI only if `NEWSAPI_KEY` plan is upgraded (currently 426-limited). Media-tier needs 2+ independent outlets or it shows unverified. Full routing: AGENT_INDEX §3 (this table mirrors it). |
| News (FL state snapshot only) | NewsAPI | `data/florida/news/` | `ingest:news-fl` — **not** profile News tab primary; pipeline in `docs/FLORIDA_DATA.md` |
| Ideology | Voteview DW-NOMINATE | Voteview panel | voteview ingest |
| Lobbying | Senate LDA | Lobbying / org pages | `ingest:lobbying-fl` |

Full entries with **lookFor** field lists: `SOURCE_CATALOG` in `sourceCatalog.ts`.

---

## Vote sync — which command?

| Need | Command | Output |
|------|---------|--------|
| National roll-call snapshot for all 537 members (M2 default) | `npm run sync:votes-national` | `data/national/votes/congress-votes.json` |
| Legacy per-member overlay for demo/non-migrated members | `npm run sync:votes` | `lib/data/generated/congressVotes.json` |
| Refresh migrated profile vote files from national snapshot (no API) | `npm run refresh:migrated-votes` | `lib/data/generated/profiles/{id}/votes.json` |

Do **not** cite `sync:congress-votes` — that script name does not exist; use `sync:votes` or `sync:votes-national`.

---

## Read-path routing (migrated vs mega-bundle)

| Member set | Votes / FEC | Statements / positions / saidDid |
|------------|-------------|----------------------------------|
| **7 migrated** (`profiles/_manifest.json`) | `data/national/*` → per-profile `votes.json` / `finance.json` via `memberProfile.ts` | Per-profile files under `profiles/{bioguideId}/` via generated `profiles/index.ts` |
| **Non-migrated** (~530) | `lib/data/generated/congressVotes.json` / `fecFinance.json` | `lib/data/generated/topicPositions.json` mega-bundle |

Build-gated: `test:optimization` → `read-path-routing` (memberProfile imports generated index, not hand imports).

---

## Post-data-change chain (mandatory)

After any sync that writes generated JSON or `data/national/` snapshots:

```bash
npm run sync:legislators   # if roster/office may have changed
npm run verify:office      # assert office resolution rules
npm run build              # all guard suites + Next.js production build
```

Log long syncs: `npm run sync:<name> 2>&1 | tee /tmp/ledger-<name>.log`

---

## Deferred sources (do not block work)

| Source | Why deferred | Use instead |
|--------|--------------|-------------|
| VoteSmart NPAT | Application / bot 403 | Ballotpedia + GovInfo CREC |
| OpenSecrets API | Public API discontinued Apr 2025 | FEC Schedule A + org registry |
| Google Civic | Representatives endpoint deprecated | MIT Election Lab bulk / demo until pipeline |
| mediastack | Redundant | GDELT (no key) |

---

## M2 profile scaling strategy

**Goal:** Per-destination profile files for all 537 members — org-level donor data tied to topic votes via FEC Schedule A + org registry (OpenSecrets API discontinued Apr 2025).

**Approach:**

1. **Gold profiles (locked spec):** S000033, O000172, M000355, M001184, W000817, C001098 — same components/checklist for all remaining members.
2. **Pipeline cert (M1 Phase E):** `npm run profile:build -- --members P000197` — one command, zero hand-fixes.
3. **Scale in batches:** 15 → 50 → 100 → 150 → remainder via `profile:build`. Protocol: `docs/workflows/BATCH_SCALING.md`.

### S000033 reference checklist (current)

| Data | Source | Status |
|------|--------|--------|
| Office / bioguideId | congress-legislators | done |
| Votes | Congress.gov + Senate LIS | done |
| FEC totals | OpenFEC | done |
| Schedule A / org registry | FEC Schedule A | partial — extend PAC committee filter |
| Said (CREC verbatim) | GovInfo | done — subject-matched Said→Did |
| Topic legislation | congress-gov-deep | done — `members/S000033.json` |
| Stock trades | House PTR | partial — Senate eFD gap |
| News | Approved-outlet RSS | partial — honest gaps where thin |
| Org→vote on topic panel | FEC Schedule A + topic votes | partial |

---

## Phase order (historical → current milestones)

Legacy phase numbers map to `PROGRESS.md` milestones:

1. **Phase 16 / M1** — `ingest:member-all` (537 deep bill files) ✅
2. **Phase 17a / M1** — S000033 pilot locked ✅
3. **Phase 17b / M2** — Batch scale to 537 — `docs/workflows/BATCH_SCALING.md`
4. **Curated media quotes** — 2-source corroboration rule (ongoing in profile pipeline)

---

## Shared article cache (cross-politician search efficiency)

**Problem:** Searching for journalism/news content one politician at a time re-fetches and re-verifies the same articles repeatedly — a single vote story, endorsement story, or debate recap often mentions multiple politicians, but each profile's sync hits it fresh. This gets expensive fast as coverage scales toward 537 members.

**Rule:** Targeted searches for journalism quotes, statements, or endorsements must persist a shared, reusable index — not just per-politician output.

- Index key: article URL.
- Stored per article: outlet, publish date, full-article-verified text (or a verified excerpt), which `bioguideId`s it mentions, which of the 10 standard topics it touches, and any quotes already extracted and corroborated from it.
- **Before** running a new targeted search for a politician/topic, check this cache first. Only hit the network for genuinely new ground.
- When an article is fetched and verified for one politician, scan it for mentions of other tracked politicians (especially endorsement language) and record those hits too — this is a byproduct of the search already running, not a separate pass.
- No NLP/ML tagging needed — the same name + keyword matching already used for targeted search is sufficient to populate `mentionedBioguideIds`.
- This cache is infrastructure, not a sourcing-rule change — every tier/corroboration rule above still applies per-claim, per-politician. The cache only avoids redundant fetching, it never substitutes for verification.

## Search strategy — targeted, not broad-scan

Searches for journalism quotes, statements, and endorsements must be **targeted forward** (politician + topic + approved-outlet domain), never a broad scan classified after the fact.

- Query restricted to approved-outlet domains (see AGENTS.md list) + politician name + the relevant topic's keyword set (`STANDARD_POLICY_TOPICS` in `lib/data/topicCoverage.ts`).
- Fetch full article text only for short-listed candidates that already look like a match — not as a first-pass blanket fetch over a broad result set.
- Display output is always a short objective summary + verbatim quote + link behind an expand control (`ExpandableQuoteBlock`) — never the full article rendered in the UI.

## Agent workflow

1. Read `DATA_NEED_ROUTING` or table above for the task.
2. Open matching `SOURCE_CATALOG` entry → read **lookFor** + **syncCommand**.
3. Check `KEYS.md` for `keyVar` SET vs EMPTY.
4. For journalism/news searches: check the shared article cache before searching; search targeted, not broad-scan (see above).
5. Run sync; verify output file; `npm run build`.
6. Never fabricate — use “No verified record available” for gaps.
