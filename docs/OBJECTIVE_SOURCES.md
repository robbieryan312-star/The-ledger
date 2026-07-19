# The Ledger — OBJECTIVE_SOURCES.md
## The Source Constitution: approved sources, lean labels, key routing & gathering rules

**Status:** LIVING DOCUMENT — binding on all agents (Claude Code + every Cursor agent).
Adapted from `OBJECTIVE_SOURCES.md` in the original `code` repo, reconciled to The Ledger's
architecture (static JSON pipelines, no database) and its authoritative tier system.

**Inclusion criteria — every source here meets at least one:**
- Peer-reviewed or government-produced (primary source)
- Wire-service standard (AP, Reuters — verified fact, no opinion)
- Long-established nonpartisan track record with documented methodology
- Academic institution with transparent research standards

**State/local sources:** national outlets (AP, Reuters, Politico…) live in this file.
State-specific local outlets and agencies live in `docs/sources/<state>.md` — Florida is the
reference template (`docs/sources/florida.md`). See AGENT_INDEX §2–§3.

---

## HOW AGENTS USE THIS FILE (binding rules)

1. **Consult this registry FIRST** before hunting for any new data source. If a need is
   listed, use the routed source and key. Do not re-research settled routing.
2. **Ledger tiers are authoritative** (`lib/types/index.ts`):
   `'official'` · `'nonpartisan'` · `'media'` · `'alleged'` · `'unverified'`.
   The lean label is metadata carried alongside the tier, never a substitute for it.
3. **Usage rules by tier:** `'media'` content = verbatim quotes with attribution only,
   never paraphrased as fact. Opinion/editorial content (any outlet) is NEVER usable for
   factual claims. Leaning think-tank output is analysis/context only — lean label
   mandatory, never the sole source for a factual claim.
4. **CORROBORATION FLOOR (owner directive 2026-07-19):** when required information is NOT
   obtainable from any `'official'`/`'nonpartisan'` source in this registry, it may be
   shown ONLY when corroborated by **two or more independent** below-standard providers,
   and then ALWAYS at the lowest display tier (`'alleged'` at best), visibly flagged,
   every provider cited with its lean label. Single below-standard sourcing is never shown.
5. **LIVING REGISTRY (owner directive 2026-07-19):** any agent that discovers a better
   path — a keyless official mirror, a new endpoint, a dead feed, a rate limit, a
   superior source — MUST update the relevant row of this file in the SAME session.
   Routing knowledge lives on disk, never in chat. (Founding example: BEA Regional Price
   Parities blocked on a key → discovered FRED's keyless CSV mirror of the same official
   series. That class of discovery belongs HERE.)
6. **Key security:** this file records env-var NAMES and SET/EMPTY status only.
   Key VALUES live exclusively in gitignored `.env.local`, Cursor Runtime Secrets, and
   GitHub Actions secrets. A key value in any committed file or log is a critical defect.

---

## KEY-ROUTING MATRIX — which key unlocks what

| Data need | Source | Env var | Status | Command | Without it |
|---|---|---|---|---|---|
| Campaign finance, donors, Schedule A | OpenFEC | `FEC_API_KEY` | SET | `sync:fec*` | No finance data |
| Votes, bills, member data | Congress.gov API | `CONGRESS_API_KEY` | SET | `sync:votes*`, `ingest:member` | No vote records |
| Demographics, income, home value, county + state rankings, age | Census ACS | `CENSUS_API_KEY` | SET | `ingest:fl-counties`, `ingest:fl-state-rankings` | Keyless data.census.gov fallback (documented, lower limits) |
| Congressional Record (CREC) | GovInfo/GPO | `GOVINFO_API_KEY` / `DATA_GOV_API_KEY` | SET | CREC sync | No floor statements |
| State bills (FL + others) | LegiScan | `LEGISCAN_API_KEY` | SET | `ingest:legiscan-fl` | No state legislation |
| State legislators | Open States v3 | `OPENSTATES_API_KEY` | SET | `ingest:openstates-fl` | No state-legislator roster |
| News (member profiles) | Approved-outlet RSS registry | none | — | `sync:news-rss` | **Primary** — see `lib/data/SOURCE_LOOKUP.md` + AGENT_INDEX §3 |
| News (member profiles, fallback) | GDELT DOC API | none | — | `sync:news-rss` / `sync:news-national` | **Secondary** when RSS thin |
| News (API path) | NewsAPI | `NEWSAPI_KEY` | SET (plan 426-limited) | `ingest:news-fl` (FL snapshot only) | **Tertiary** — upgrade plan before relying on it |
| Cost of living (components/metros) | BEA Data API | `BEA_API_KEY` | EMPTY (owner CAPTCHA pending) | `ingest:bea-rpp-fl` | FRED keyless CSV covers the all-items state index |
| Labor/employment (state, county, metro CPI) | BLS API | `BLS_API_KEY` (optional) | keyless OK | `ingest:bls-*` | Keyless works at low volume |
| Court opinions | CourtListener | `COURTLISTENER_API_KEY` (optional) | keyless OK | `ingest:courts-fl` | Keyless works for basic use |
| Position surveys | Vote Smart | `VOTESMART_API_KEY` | EMPTY | — | Deferred — Ballotpedia + CREC substitute |
| — RETIRED — | ProPublica Congress API | `PROPUBLICA_CONGRESS_KEY` | do not use | — | API retired upstream |

**Currently unobtainable (stop re-attempting; honest gap in UI):** Senate eFD stock trades
(upstream 503), VoteSmart NPAT (deferred), OpenSecrets API (deferred — FEC Schedule A
substitute), SAM.gov entity details (identity verification wall). See `PROGRESS.md` blockers.

---

## TIER: OFFICIAL — government/primary records (`'official'`)

| Source | What it provides | Access |
|---|---|---|
| Congress.gov API | Bills, votes, members | `CONGRESS_API_KEY` |
| OpenFEC | Campaign finance | `FEC_API_KEY` |
| Census Bureau ACS | Demographics, income, housing, education, age, county data | `CENSUS_API_KEY` (keyless fallback) |
| Bureau of Labor Statistics | Employment, unemployment (LAUS/CPS), metro CPI | keyless / optional key |
| Bureau of Economic Analysis | Regional Price Parities (cost of living) | `BEA_API_KEY`; **FRED keyless CSV mirror for state all-items (`*RPPALL`)** |
| FRED (St. Louis Fed) | Official-series mirror (BEA RPP, economic series), keyless CSV | none |
| IRS (published brackets) | Federal income-tax schedules (computed-from-published-tables) | none |
| GovInfo / GPO | Congressional Record (CREC) | `GOVINFO_API_KEY` |
| senate.gov / house.gov / state .gov | Office resolution, portraits (Bioguide), governor portraits (flgov.com) | none |
| C-SPAN | Gavel-to-gavel video — the unedited floor record; primary citation for spoken quotes | YouTube Data API, channel `UCb-oTHQsEPvS4FCTLG3IFkA` |
| Federal/state courts (opinion documents) | The rulings themselves (linked via CourtListener) | none |

## TIER: NONPARTISAN — established methodology, official-derived (`'nonpartisan'`)

| Source | Lean | What it provides | Access |
|---|---|---|---|
| Associated Press (AP) | none (wire) | Verified fact reporting; two-source standard; 52 Pulitzers | RSS: rsshub.app/apnews/politics · apnews.com/APFactCheck |
| Reuters | none (wire) | Wire standard; Trust Principles since 1941 | RSS: feeds.reuters.com/Reuters/PoliticsNews |
| ProPublica (journalism + datastores) | none | Investigative + machine-readable data; Nonprofit Explorer API (1.8M nonprofits incl. 501(c)(4)s) | propublica.org/datastore · projects.propublica.org/nonprofits/api |
| GovTrack | none | Legislative data, member stats | govtrack.us |
| Voteview | none (academic) | DW-NOMINATE ideology scores | voteview.com |
| Ballotpedia | none | Encyclopedia of officials/elections | ballotpedia.org |
| OpenSecrets | none | Donor/lobbying context; revolving-door + dark-money databases | opensecrets.org/revolving · /outsidespending |
| CourtListener (Free Law Project) | none | All federal opinions, PACER dockets, judge profiles — tier per Ledger precedent: aggregator = nonpartisan; linked opinion doc = official | api: courtlistener.com/api/rest/v3/ (search `?q={name}&type=r`) |
| PolitiFact | none (methodology) | Fact-checks, 3-editor review; per-politician feeds | politifact.com/rss/people/{slug}/ |
| FactCheck.org | none (academic, Annenberg/UPenn) | Fact-checks | factcheck.org/feed |
| MERIC (Missouri Economic Research) | none (state gov research) | State cost-of-living index, quarterly | meric.mo.gov |
| Tax Foundation | center-right | State tax brackets/burden (used with citation, computed-from-published-tables) | taxfoundation.org |
| MIT Election Data + Science Lab | none (academic) | Every election result since 1976, precinct level | electionlab.mit.edu · Harvard Dataverse |
| Pew Research Center | none | Public opinion, polarization tracking (1994–), datasets | pewresearch.org/download-datasets |
| Gallup | none | Presidential/gubernatorial approval back to Truman | news.gallup.com/rss.aspx |
| RAND Corporation | none | Defense, veterans, security research | rand.org/pubs |
| Sabato's Crystal Ball (UVA) | none (academic) | Race ratings since 1984 | centerforpolitics.org/crystalball/feed |
| Cook Political Report | none | Race ratings, documented methodology | cookpolitical.com (limited free) |
| Bipartisan Policy Center | center (bipartisan by charter) | Joint D+R policy proposals | bipartisanpolicy.org/feed |
| Tax Policy Center (Urban+Brookings) | center | Distributional analysis of tax proposals | taxpolicycenter.org/resources/data |
| CRFB | center | Deficit/debt/budget scoring | crfb.org/rss.xml |
| POGO | none | Contractor fraud, Pentagon waste, whistleblowers | pogo.org/feed |
| The Marshall Project | none | Criminal-justice policy data | feeds.themarshallproject.org/marshall-project-all |
| NORC GSS (UChicago) | none (academic) | Longest-running U.S. social survey (1972–) | gss.norc.org/get-the-data |
| Cooperative Election Study (Harvard) | none (academic) | 60k-person election-year voter survey | cces.gov.harvard.edu |
| Harvard Dataverse | none (academic) | Political-science dataset repository + API | dataverse.harvard.edu/api |
| Redistricting Data Hub | none | District maps, PVI, demographics per district | redistrictingdatahub.org |
| Supreme Court Database (WashU) | none (academic) | Every SCOTUS decision since 1791 (CSV) | scdb.wustl.edu |
| Freedom House | none | Freedom/civil-liberty ratings (international context) | freedomhouse.org |
| Transparency International | none | Corruption Perceptions Index | transparency.org/en/cpi |
| V-Dem (Gothenburg) | none (academic) | 500 democracy indicators, 202 countries, since 1789 | v-dem.net/data/api |
| FiveThirtyEight (data repo) | center (data methodology neutral) | Poll aggregation, PVI — use the public data repo | github.com/fivethirtyeight/data |

## TIER: MEDIA — named outlets, verbatim-quote use only (`'media'`)

Editorial process known; **verbatim quotes with attribution only — never paraphrased as
fact; opinion sections never usable for factual claims.** Lean label mandatory on display.

| Source | Lean | Notes | Feed |
|---|---|---|---|
| PBS NewsHour | center | High factual accuracy; long-form policy interviews | pbs.org/newshour/feeds/rss/politics |
| NPR Politics | center-left | Rigorous fact-checking; strong state/local coverage | feeds.npr.org/1014/rss.xml |
| Axios | center | "What happened / why it matters / other side" format | api.axios.com/feed |
| The Hill | center | Both-sides Hill sourcing | thehill.com/rss/syndicator/19110 |
| Politico | center | Best day-to-day Congress/WH coverage | rss.politico.com/politics-news.xml |
| Bloomberg Government | center | Business/finance/policy intersection, lobbying | bloomberg.com/politics/feeds/site.xml |
| NYT (news + The Upshot) | center-left | Data visualization, district-level analysis | — |
| Washington Post (news + Fact Checker) | center-left | Kessler's 30k-claim statement archive (independent methodology) | washingtonpost.com/news/fact-checker/feed |
| WSJ news desk | center-right | News desk only; editorial page = opinion, right | — |
| The Dispatch | center-right | Rigorous conservative journalism | thedispatch.com/feed |
| The Bulwark | center-right | Critical coverage of the right from the right | thebulwark.com/feed |
| Reason | libertarian | The third-perspective outlet (civil liberties, spending) | reason.com/feed |
| The Intercept | left | Investigative (surveillance, corporate influence) — prominent label | — |
| The American Conservative | right | Non-mainstream conservative foreign policy/civil liberties | — |
| BBC / The Economist | center (international) | International standard, outside perspective | — |
| RealClearPolitics | center-right editorial / neutral aggregation | Poll aggregation only; label editorial | realclearpolitics.com/epolls |
| Snopes | slight center-left | Viral-claim flagging ONLY — never policy sourcing | snopes.com/feed |

**Leaning think tanks (analysis/context only — never sole factual source; lean mandatory):**
Brookings (center-left) · Urban Institute (center-left) · CBPP (center-left) · EPI
(center-left) · CREW (center-left watchdog; covers both parties) · Cato (libertarian) ·
Heritage (conservative) · PIIE (center) · Fox News news desk (right) · MSNBC (left) ·
WSJ editorial (right, opinion-only).

## TIER: ALLEGED / UNVERIFIED — the corroboration floor

Reserved for claims that cannot be sourced above. `'alleged'` requires 2+ independent
sources and visible flagging (see rule 4). `'unverified'` = maximum caveat, shown only
when explicitly relevant. Below-standard providers NEVER rise above this floor
regardless of volume.

---

## JOURNALIST-STANDARD CRITERIA (what earns a tier)

- **Wire standard (AP/Reuters):** two independent sources per claim; no opinion;
  prominent corrections; beat rotation.
- **Quality outlet:** pre-publication editor review; public corrections policy; named
  sources preferred, anonymous sourcing explained; conflicts disclosed.
- **Opinion/editorial:** always labeled; never a factual source, any outlet.

Registry metadata per source: tier (Ledger union) · lean (none/center/center-left/
center-right/left/right/libertarian/conservative) · type (government/wire/think-tank/
research/polling/watchdog/media/academic) · endpoints · key required · known limits.

---

*Companion: `lib/data/SOURCE_LOOKUP.md` (need→routing), `lib/data/sourceCatalog.ts`
(machine-readable), `KEYS.md` (key status — this file owns routing). Where any doc
disagrees, `.cursor/rules/ledger-core-rules.mdc` wins.*
*Last updated: 2026-07-19 — update in the same session as any routing discovery (rule 5).*
