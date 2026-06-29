# The Ledger — Architecture

Static JSON pre-render pattern. No Postgres, no runtime database, no server.

---

## Core design principle

Every data fact the UI displays must be traceable to a specific source entry in `lib/data/trustedSources.ts` with a tier value, a URL, and a checked date. No fact appears in the UI without provenance. This is not optional — it is the product.

---

## Data flow

```
Authoritative sources (APIs, XML feeds, official datasets)
  ↓
scripts/ingest-*.ts      — Florida-specific deep ingestion (state data, local data)
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

Known violation pending fix: `app/politicians/[id]/page.tsx` is currently `'use client'`.

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

## Tier 1 — Official sources (live integration)

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

## Tier 2 — Nonpartisan / official-derived sources (live or planned)

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
| **Census Bureau** | District demographics, economic indicators | **live** — `CENSUS_ENDPOINT` |
| **BLS (Bureau of Labor Statistics)** | State economic data | live — Florida ingested |
| **GDELT Project** | News coverage aggregated from global media | **live** — national news sync |
| **OpenStates** | State legislature data | live — Florida ingested |
| **LegiScan** | State and federal bill tracking | live — Florida ingested |
| **FL DOE** | Florida education finance | live — Florida slices |
| **FL Commission on Ethics** | Florida financial disclosures | live — Florida slices |
| **FL Lobbyist Registration** | Florida lobbying registrations | live — Florida slices |
| **SEC EDGAR** | Public company filings (stock context) | live — Florida slices |

---

## Tier 3 — Approved journalism sources (verbatim quotes only)

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
| `lib/data/generated/congressVotes.json` | Roll-call votes keyed by bioguideId | `sync:congress-votes` |
| `lib/data/generated/fecFinance.json` | FEC campaign finance totals for 527/537 members | `sync:fec-national` |
| `lib/data/generated/stockTrades.json` | STOCK Act PTR trades — House roster | `sync:stock-trades` |
| `lib/data/generated/newsNational.json` | GDELT news articles keyed by bioguideId | `sync:news-national` |
| `lib/data/generated/slices/` | Florida-specific panel data (legislation, lobbying, voteview, etc.) | `build:data-slices` |

---

## Sync script commands

```bash
npm run sync:legislators        # refresh congressional roster from unitedstates/congress-legislators
npm run sync:fec-national       # FEC campaign finance for all 537 members
npm run sync:congress-votes     # roll-call votes via Congress.gov API
npm run sync:stock-trades       # STOCK Act PTR trades — House roster
npm run sync:news-national      # GDELT news for all 537 members (keyed by bioguideId)
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
| `CENSUS_ENDPOINT` | Census Bureau API |
| `GOVINFO_API_KEY` | GovInfo / GPO |
| `LEGISCAN_API_KEY` | LegiScan |
| `OPENSTATES_API_KEY` | OpenStates |
| `NEWS_API_KEY` | NewsAPI (426 plan restriction — use GDELT instead) |

Run `./scripts/setup-github-secrets.sh` after `gh auth login` to push all keys to GitHub Actions for scheduled refresh.

---

## Florida data layers

Florida has the deepest state-level data integration. All Florida-specific data is ingested separately and available as UI panel slices on Florida politician profiles:

- `slices/legislationFlorida.ts` — FL state legislation via LegiScan
- `slices/lobbyingFllobbyist.ts` — FL lobbying registrations
- `slices/newsFlorida.ts` — FL news via GDELT (superseded by national news)
- `slices/financeFldoe.ts` — FL education finance data
- `slices/judiciaryCourts.ts` — FL federal court records
- `slices/filingsSecedgar.ts` — SEC EDGAR filings for FL entities
- `slices/stateEconomic.ts` — FL economic indicators
- `slices/voteview.ts` — DW-NOMINATE ideology scores (national, not FL-only)

---

## Current known gaps / next architecture work

| Gap | Impact | Priority |
|-----|--------|----------|
| `app/politicians/[id]/page.tsx` is `'use client'` | Individual profiles not crawler-visible | High |
| `/lobbying`, `/elections` show mock data | Credibility risk on live site | High |
| Nav sub-links ("Lobbyist Tracker", "PACs & Advocacy", "Election Calendar") point to unbuilt views | Silent broken nav | Medium |
| Senate eFD stock trades (HTTP 503) | Senate trades missing from STOCK Act panel | Medium |
| OpenSecrets donor sector breakdown | Finance tab lacks sector analysis | Medium |
| "Said → Did" verbatim quote layer | Core product feature not yet wired for national profiles | High |
