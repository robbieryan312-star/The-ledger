# Source lookup — agents & implementers

**Canonical machine-readable catalog:** `lib/data/sourceCatalog.ts`  
**Keys & SET/EMPTY status:** `KEYS.md`  
**Credibility rules:** `.cursor/rules/ledger-data-policy.mdc`

Use this doc to answer: *“I need X for a profile — where do I look first?”*

---

## Credibility tiers (transparency)

These are the **exact code values** shown in the UI. Higher rank = more authority for structural facts (office, votes, money).

| Code value | Meaning | May assert current office? |
|------------|---------|----------------------------|
| `'official'` | Primary government record (FEC, congress.gov, STOCK Act, GPO, LDA, FARA) | Yes |
| `'nonpartisan'` | Established research / official-derived (GovTrack, Ballotpedia, unitedstates, Voteview) | Yes |
| `'media'` | Approved journalism — verbatim quotes only; 2+ independent outlets for verified Said | No |
| `'alleged'` | Credible but unproven — always flagged | No |
| `'unverified'` | No verified sourcing — maximum caveat | No |

**Banned everywhere:** Wikipedia, anonymous sources, social media as primary Said.

---

## Data need → source (look here first)

| Data need | Primary source | Destination in app | Sync / output |
|-----------|----------------|-------------------|---------------|
| Current office, bioguideId | unitedstates/congress-legislators | Profile header | `sync:legislators` → `currentLegislators.json` |
| Roll-call votes (**Did**) | Congress.gov + Senate LIS XML | Voting Record | `sync:votes-national` → `congressVotes.json` |
| Campaign totals | OpenFEC | Money & Donors | `sync:fec-national` → `fecFinance.json` |
| Itemized donors / PACs (**Phase 17**) | OpenFEC Schedule A | Follow the Money · Topic context | `sync:fec-schedule-a` → `schedule-a.json` |
| Platform / survey text (**Said**) | Ballotpedia scrape | Track Record · Topic Record | `sync:topic-positions` → `topicPositions.json` |
| Floor speech verbatim (**Said**) | GovInfo Congressional Record | Track Record · `statements[]` | Extend `sync:topic-positions` (key SET) |
| Journalism quote (**Said**) | Approved outlets (curated) | Track Record promise diff | Featured / future curated JSON |
| Said→Did pairing | topicPositions + voteTopicId | Track Record | `buildSaidDidDiffsFromTopicPositions` |
| Bills by topic | Congress.gov deep ingest | Topic Record · legislation | `ingest:member` → `members/{bioguideId}.json` |
| STOCK trades | House PTR PDFs | Stock Trades | `sync:stock-trades` |
| News | GDELT DOC API | News section | `sync:news-national` |
| Ideology | Voteview DW-NOMINATE | Voteview panel | voteview ingest |
| Lobbying | Senate LDA | Lobbying / org pages | `ingest:lobbying-fl` |

Full entries with **lookFor** field lists: `SOURCE_CATALOG` in `sourceCatalog.ts`.

---

## Deferred sources (do not block work)

| Source | Why deferred | Use instead |
|--------|--------------|-------------|
| VoteSmart NPAT | Application / bot 403 | Ballotpedia + GovInfo CREC |
| OpenSecrets API | Public API discontinued Apr 2025 | FEC Schedule A + org registry |
| Google Civic | Representatives endpoint deprecated | MIT Election Lab bulk / demo until pipeline |
| mediastack | Redundant | GDELT (no key) |

---

## Phase 17 + full profile strategy

**Problem:** Phase 17 needs org-level donor data tied to topic votes — not enough from a single vendor key.

**Approach:**

1. **Pilot one member:** `S000033` (Bernie Sanders) — checklist in `PILOT_PROFILE_CHECKLIST` (`sourceCatalog.ts`).
2. **Complete every row** (done · partial · gap · next) with honest empty states.
3. **Scale pattern to 537:** same sync commands + checkpointing (`ingest:member-all`, `sync:topic-positions` without `--member`).

### S000033 pilot checklist (current)

| Data | Source | Status |
|------|--------|--------|
| Office / bioguideId | congress-legislators | done |
| Votes | Congress.gov + Senate LIS | done |
| FEC totals | OpenFEC | done |
| Schedule A / Phase 17 orgs | FEC Schedule A | partial — extend PAC committee filter |
| Said (platform) | Ballotpedia | done — 4 Said→Did diffs |
| Said (CREC verbatim) | GovInfo | **next** |
| Topic legislation | congress-gov-deep | done — `members/S000033.json` |
| Stock trades | House PTR | partial — Senate eFD gap |
| News | GDELT | partial |
| Phase 17 org→vote on topic panel | FEC Schedule A + topic votes | **next** |

---

## Phase order (updated)

1. **Phase 16** — `ingest:member-all` (537 deep bill files)
2. **Phase 17a (pilot)** — S000033: GovInfo CREC statements + FEC Schedule A org registry + topic-vote join
3. **Phase 17b (scale)** — Roll org registry + Schedule A + topic joins to all 537
4. **Phase 18** — Curated media quotes on featured profiles (2-source rule)

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
