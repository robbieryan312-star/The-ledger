# The Ledger — Architecture

Static JSON pre-render pattern. No Postgres, no runtime database, no server.

---

## Core design principle

Every data fact the UI displays must be traceable to a specific source entry in `lib/data/sourceCatalog.ts` with a tier code value, a URL, and a checked date. No fact appears in the UI without provenance. This is not optional — it is the product.

---

## Data flow

```
Authoritative sources (APIs, XML feeds, official datasets)
  ↓
scripts/ingest/florida/*.ts  — Florida-specific deep ingestion (state data)
scripts/sync-*.ts        — National sync (all 537 Congress members)
  ↓
data/<source>/*.json     — Raw snapshots, never imported directly by Next.js
lib/data/generated/*.json — Clean, merged, build-ready snapshots
lib/data/generated/slices/*.json — Pre-built UI data slices (Florida-specific panels)
  ↓
lib/data/*.ts            — Data access layer (typed, guarded, no fabrication)
  ↓
Next.js build-time import → server components → SSR HTML → user
```

**No runtime API calls from the browser.** All data is static at build time.
**GitHub Actions** runs sync scripts on a schedule to keep generated files fresh.

---

## Architecture rule — SSR on all route pages

Route pages (`app/**/page.tsx`) must be **server components**. Never add `'use client'` to a route page. Individual politician profiles must be server-rendered so crawlers can index them. Interactive sub-components (tabs, charts, accordions) use `'use client'`.

`app/politicians/[id]/page.tsx` is a server component; interactivity lives in `PoliticianProfileClient` and child client shells.

---

## Primary key

`bioguideId` — the `unitedstates/congress-legislators` identifier — is the universal join key linking a politician's profile across all data layers: votes, FEC finance, news, stock trades, voteview ideology. Never duplicate or create aliases for this key.

---

## Source tiers — code values (not "Tier 1/2/3/4")

| Code value | What it means | Used for |
|------------|--------------|---------|
| `'official'` | Primary government record | Office, votes, FEC, STOCK Act |
| `'nonpartisan'` | Established nonpartisan or official-derived | Roster, ideology scores, research |
| `'media'` | Named institutional journalism outlet | Verbatim quotes only, never paraphrased |
| `'alleged'` | Credible but unproven, multi-source corroborated | Disclosed but not adjudicated claims |
| `'unverified'` | No verified sourcing | Shown only with maximum caveat |

**Wikipedia is banned at every tier.** No URL to wikipedia.org may appear in any source record.

---

## Official sources (`'official'` tier — live integration)

| Source | What we pull | API / URL | Key |
|--------|-------------|-----------|-----|
| **Congress.gov API v3** | Roll-call votes, bill text, sponsorship, committee assignments | `api.congress.gov/v3` | `CONGRESS_API_KEY` |
| **FEC OpenFEC API** | Campaign finance totals, Schedule A donors, candidate IDs | `api.open.fec.gov/v1` | `FEC_API_KEY` |
| **senate.gov LIS XML** | Senate roll-call votes (XML feed) | `senate.gov/legislative/LIS` | none |
| **house.gov** | House PTR STOCK Act disclosures, member roster | `disclosures.house.gov` | none |
| **STOCK Act / PTR filings** | Congress member stock trades | `disclosures.house.gov/public_disc/financial-pdfs` | none |
| **Senate LDA** | Lobbying disclosure registrations | `lda.senate.gov/api/v1` | none |
| **FARA (DOJ)** | Foreign agent registrations | `efts.fara.justice.gov` | none (blocked) |
| **USASpending.gov** | Federal contract and grant awards | `api.usaspending.gov/api/v2` | none |
| **SAM.gov** | Federal contractor registrations | `api.sam.gov` | login.gov required |
| **GovInfo (GPO)** | Federal Register, Congressional Record | `api.govinfo.gov` | `GOVINFO_API_KEY` |
| **CourtListener / PACER** | Federal court records | `courtlistener.com/api/rest/v3` | none |

---

## Nonpartisan sources (`'nonpartisan'` tier — live or planned)

| Source | What we pull | Status |
|--------|-------------|--------|
| **unitedstates/congress-legislators** | Authoritative congressional roster, bioguideIds, party, state, district, term dates | **live** — primary roster source |
| **GovTrack.us** | Vote scores, ideology percentile, sponsorship analysis | **live** |
| **OpenSecrets** | Donor sector breakdowns, PAC totals, outside spending | planned |
| **Ballotpedia** | Candidate bios, election history, committee info | planned |
| **Voteview (UCLA)** | DW-NOMINATE ideology scores | **live** — via `lib/data/slices/voteview.ts` |
| **CBO** | Cost estimates for major legislation | planned |
| **GAO** | Government Accountability Office reports | planned |
| **CRS** | Congressional Research Service reports | planned |
| **National Governors Association** | Governor roster and party affiliation | planned |
| **Pew Research Center** | Policy polling and public opinion context | live (used in evidence layer) |
| **Census Bureau** | District demographics, economic indicators | **live** — `CENSUS_API_KEY` |
| **BLS (Bureau of Labor Statistics)** | State economic data | live — Florida ingested |
| **GDELT Project** | News coverage aggregated from global media | **deferred** for national — primary news path is RSS (`sync:news-rss`) |
| **OpenStates** | State legislature data | live — Florida ingested |
| **LegiScan** | State and federal bill tracking | live — Florida ingested |
| **FL DOE** | Florida education finance | live — Florida slices |
| **FL Commission on Ethics** | Florida financial disclosures | live — Florida slices |
| **FL Lobbyist Registration** | Florida lobbying registrations | live — Florida slices |
| **SEC EDGAR** | Public company filings (stock context) | live — Florida slices |

---

## Approved journalism (`'media'` tier — verbatim quotes only)

Journalism sources are used exclusively for the "Said → Did" quote layer and the news feed. They are **never used to assert office, votes, or financial records** — only for verbatim quotes attributed to the named outlet with date and URL.

| Outlet | Scope |
|--------|-------|
| Associated Press | National political reporting |
| Reuters | National and international political reporting |
| New York Times | National political reporting |
| Washington Post | National political and Congress reporting |
| Wall Street Journal | National political and economic reporting |
| Politico | Congress and federal policy reporting |
| The Hill | Congress reporting |
| NPR | National political reporting |
| PBS NewsHour | National political reporting |
| Roll Call | Congress reporting |
| CQ (Congressional Quarterly) | Congress reporting |
| The Atlantic | Political long-form |
| Bloomberg | Political and economic reporting |
| ProPublica | Investigative — data-verified reporting |
| The Guardian | National political reporting |
| Miami Herald | Florida political reporting |
| Tampa Bay Times | Florida political reporting |
| Sun Sentinel | Florida political reporting |
| Orlando Sentinel | Florida political reporting |
| Florida Phoenix | Florida political reporting |
| WUSF (NPR Tampa Bay) | Florida public radio |
| WLRN (NPR Miami) | Florida public radio |

**Never use:** Wikipedia, social media, blogs, anonymous sources, prediction markets, press releases from campaigns/PACs, or any source without a named author, outlet, and verifiable URL.

---

## Generated file inventory

| File | Contents | Updated by |
|------|----------|-----------|
| `lib/data/generated/currentLegislators.json` | Full 537-member roster with bioguideIds, party, state, district | `sync:legislators` |
| `lib/data/generated/congressVotes.json` | Roll-call votes keyed by bioguideId | `sync:votes` (legacy) · `sync:votes-national` → `data/national/votes/` |
| `lib/data/generated/fecFinance.json` | FEC campaign finance totals for 527/537 members | `sync:fec-national` |
| `lib/data/generated/stockTrades.json` | STOCK Act PTR trades — House roster | `sync:stock-trades` |
| `lib/data/generated/newsNational.json` | GDELT news articles keyed by bioguideId | `sync:news-national` |
| `lib/data/generated/slices/` | Florida-specific panel data (legislation, lobbying, voteview, etc.) | `build:data-slices` |

---

## Sync script commands

```bash
npm run sync:legislators        # refresh congressional roster from unitedstates/congress-legislators
npm run sync:fec-national       # FEC campaign finance for all 537 members
npm run sync:votes-national     # roll-call votes via Congress.gov API (all 537)
npm run sync:votes              # legacy per-member congressVotes.json overlay
npm run sync:stock-trades       # STOCK Act PTR trades — House roster
npm run sync:news-rss           # Approved-outlet RSS (primary national news path)
npm run sync:news-national      # GDELT bulk (rate-limited; secondary)
npm run verify:office           # confirm office resolution is clean after any data change
npm run build                   # must pass before any commit
```

---

## API keys

All API keys live in `.env.local` (gitignored). Never hardcode in tracked files. Never paste values in chat.

| Env var | Service |
|---------|---------|
| `CONGRESS_API_KEY` | Congress.gov API v3 |
| `FEC_API_KEY` | OpenFEC API |
| `GDELT_ENDPOINT` | GDELT (no key required) |
| `CENSUS_API_KEY` | Census Bureau API |
| `GOVINFO_API_KEY` | GovInfo / GPO |
| `LEGISCAN_API_KEY` | LegiScan |
| `OPENSTATES_API_KEY` | OpenStates |
| `NEWSAPI_KEY` | NewsAPI (426 plan restriction — **deferred**; national news uses RSS/GDELT) |

Run `./scripts/setup-github-secrets.sh` after `gh auth login` to push all keys to GitHub Actions for scheduled refresh.

---

## Florida data layers

See **`docs/FLORIDA_DATA.md`** for script paths, raw JSON locations, and slice accessors.

---

## Data integration — shapes, office resolution, corroboration

> **Source tier code values:** `.cursor/rules/ledger-core-rules.mdc` §3 — never use "Tier 1/2/3/4" labels.

### TypeScript shapes (canonical definitions)

Implemented in `lib/types/index.ts` and `lib/data/officeResolution.ts`:

- `SOURCE_TIER_RANK` — numeric rank for tie-breaking (`official` highest)
- `AUTHORITATIVE_TIERS` — only `official` and `nonpartisan` may assert current structural office facts
- `SourcedFact<T>` — value + `source` + `effectiveDate` + `asOf` + optional `corroboration[]`
- `OfficeRecord` — dated office held (chamber, state, termStart/termEnd, sourced)
- `ResolvedOffice` — `real-current` | `real-former` | `unresolved-demo` with audit trail

`Politician.bioguideId` links profiles to authoritative congressional datasets; when present, current office is **derived**, not hand-typed.

### Office resolution algorithm

Implemented in `lib/data/officeResolution.ts`.

**Congress members:** `currentLegislators.json` is source of truth — presence ⇒ current; absence ⇒ former automatically (makes Rubio-as-current-senator structurally impossible when bioguide is absent from `legislators-current`).

**General recency collapse** (`resolveMostRecentOffice`) when multiple dated `OfficeRecord`s exist:

1. Keep only records whose `source.tier ∈ AUTHORITATIVE_TIERS`
2. Sort by `termStart` DESC
3. Break ties by higher `SOURCE_TIER_RANK`
4. Top record = current; rest = historical (never discarded)

### Corroboration rule (`meetsCorroborationRule`)

- `official` / `nonpartisan` → single source sufficient
- `media` / `alleged` / `unverified` → require **≥ 2 distinct sources** or withhold; when shown, visibly flagged with every corroborator listed

### Source integration roadmap (ranked)

| # | Source | Tier code | Data | Key? | Status |
|---|--------|-----------|------|------|--------|
| 1 | unitedstates/congress-legislators | `official`/`nonpartisan` | Current Congress roster | No | **live** |
| 2 | FEC OpenFEC API | `official` | Campaign finance | `FEC_API_KEY` | **live** |
| 3 | Senate eFD + House Clerk PTR | `official` | STOCK Act trades | Partial | House live; Senate eFD gap |
| 4 | Congress.gov / GovTrack / ProPublica | `official`/`nonpartisan` | Votes, bills | `CONGRESS_API_KEY` | **live** |
| 5 | legislators-historical | `official` | Former member terms | No | planned enrichment |
| 6 | NGA governor roster | `nonpartisan` | 50 governors | No | **live** (`governors.ts`) |
| 7 | unitedstates/images | `official` | Portraits by bioguideId | No | **live** |
| 8 | Ballotpedia / state SoS | `nonpartisan`/`official` | Statewide/local | Varies | future |

### Pipeline status (2026-07-09)

| Field | Status |
|-------|--------|
| Current office / In Office badge | **Real** — `resolveCurrentOffice` |
| Roster (537 Congress + 50 governors) | **Real** — `roster.json` + `currentLegislators.json` |
| Official photos | **Real** — `photos.ts` |
| Votes (national) | **Real** — `sync:votes-national` |
| FEC totals | **Real** — `sync:fec-national` |
| Stock trades (House PTR) | **Real** partial; Senate eFD = honest gap |
| Migrated profiles | **7 gold** — `generated/profiles/{bioguideId}/` per `_manifest.json` |
| Remaining 530 Congress | **Honest gaps** until batch migration |
| News | **Partial** — RSS primary (`sync:news-rss`) |
| Mock/hand-authored facts | **Banned** — DNU quarantine; build-gated guards |

**Coverage:** 587 officials searchable. `npm run verify:office` asserts resolution rules.

### Stock trades checkpoint semantics

`sync:stock-trades` preserves prior good trades on fetch-failed runs; checkpoint marks only successful member syncs. House index failures surface `houseIndexFailedYears` in meta. Guards: `scripts/__tests__/stockTradesCheckpoint.test.ts`.

### FEC refresh workflow

```bash
cp .env.example .env.local   # set FEC_API_KEY
npm run sync:legislators
npm run sync:fec
npm run verify:office
npm run build
```

Generated `fecFinance.json` is committed so production builds work without a live key; local refresh uses `.env.local`.

---

## Florida data layers

See **`docs/FLORIDA_DATA.md`** for script paths, raw JSON locations, and slice accessors.

---

## Current known gaps / next architecture work

| Gap | Impact | Priority |
|-----|--------|----------|
| Font CDN dependency (`fonts.gstatic.com`) | Build fails offline / in restricted networks | High — self-host fonts |
| `/lobbying`, `/elections` | Show honest empty states until real pipelines | Medium |
| Senate eFD stock trades (HTTP 503) | Senate trades missing from STOCK Act panel | Medium — honest gap in UI |
| OpenSecrets donor sector breakdown | Finance tab lacks sector analysis | Medium — FEC Schedule A path |
| M2 batch scaling | **7/537** profiles migrated to per-destination files (`lib/data/generated/profiles/_manifest.json`) | High — see `PROGRESS.md` M2 |
| `topicPositions.json` mega-bundle | Retire after full migration | High — reprocess guards live |
