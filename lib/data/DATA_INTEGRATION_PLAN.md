# The Ledger — Data Integration Plan

How The Ledger moves from hand-written mock data to **real, sourced, recency-aware**
data — without ever letting a stale record assert who currently holds an office.

This document is the design (Part A). The first real source (Part B,
`unitedstates/congress-legislators`) is already implemented and wired; see
[Status](#status) at the bottom.

**Future ideas (not current sprint):** see [`FUTURE_ROADMAP.md`](../../FUTURE_ROADMAP.md) at the project root.

---

## 1. Principles (owner requirements, encoded)

1. **Recency-weighted current office.** The most recent *authoritative* record
   determines a politician's CURRENT office. Older records can never set the
   current position.
2. **Historical data is retained, not current.** Older statements/votes/positions
   stay in the dataset and feed agenda/position summaries — each item dated,
   individually sourced, grouped by topic, sorted newest-first.
3. **Source-tier priority**, visible in the UI (most → least credible):
   - **Tier 1 — `official`**: official `.gov` (congress.gov, FEC, chamber records)
   - **Tier 2 — `nonpartisan`**: nonpartisan `.org` / public-domain official-derived datasets
   - **Tier 3 — `media`**: journalism
   - **Tier 4 — `alleged` / `unverified`**: speculative (e.g. prediction markets)
4. **Low-trust corroboration rule.** Tier 3/4 claims appear only when corroborated
   by multiple sources, always flagged as unverified/reported, with every
   corroborating source listed.
5. **Everything links to a source** with a checked / as-of date.

---

## 2. TypeScript shape for sourced, dated, tiered facts

We **build on** the existing `lib/types/index.ts` (which already has `SourceTier`,
`Source`, and per-claim `EvidenceItem[]`). New, reusable additions:

```ts
// Numeric rank for the 5 existing tiers — drives tie-breaking in the resolver.
export const SOURCE_TIER_RANK: Record<SourceTier, number> = {
  official: 4, nonpartisan: 3, media: 2, alleged: 1, unverified: 0,
};

// Only these tiers may assert a CURRENT, structural fact (e.g. office held).
export const AUTHORITATIVE_TIERS: SourceTier[] = ['official', 'nonpartisan'];

// Any real value carries provenance: a tiered source, the date it became
// effective, and the date we last checked it. Low-trust facts carry corroboration.
interface SourcedFact<T> {
  value: T;
  source: Source;          // already includes `tier`
  effectiveDate: string;   // when the underlying record became true
  asOf: string;            // when we last verified it
  corroboration?: Source[];
  note?: string;
}

// One dated, sourced record of an office held. Many records → one current office.
interface OfficeRecord {
  bioguideId?: string;
  chamber: Chamber; office: string;
  state: string; stateCode: string; district?: string;
  party: Party;
  termStart: string; termEnd: string;   // termStart drives recency ordering
  source: Source; asOf: string;
}

// Result of resolution: the single current-by-construction office + audit trail.
interface ResolvedOffice {
  isCurrent: boolean;
  label: string;                                   // "U.S. Senator (FL)" / "Former U.S. Senator (FL)"
  current?: OfficeRecord;
  reason: 'real-current' | 'real-former' | 'unresolved-demo';
  source: Source; asOf: string;
}
```

`Politician` gains one optional field, `bioguideId`, that links a profile to
authoritative congressional datasets. When present, the current office label is
**derived**, not hand-typed.

---

## 3. Recency-resolution algorithm (current office)

Implemented in `lib/data/officeResolution.ts`.

**For members of Congress** (the structural case the owner cares about), the
authoritative current-members snapshot is the source of truth:

```
resolveCurrentOffice(politician):
  rec = currentLegislators[politician.bioguideId]        # O(1) lookup
  if rec exists                       -> real-current  (office from real data)
  else if bioguideId && chamber∈{senate,house}
                                      -> real-former  ("Former U.S. Senator …")
  else                                -> unresolved-demo (mock, visibly flagged)
```

Presence in the dataset ⇒ current; **absence ⇒ former, automatically.** No human
has to flip an `inOffice` flag. This is what makes the "Rubio shown as current
senator" bug *structurally impossible*: Rubio's bioguide (`R000595`) is not in
`legislators-current`, so any profile claiming `inOffice: true` still resolves to
*Former U.S. Senator*.

**General recency collapse** (`resolveMostRecentOffice`), used when a person has
multiple dated `OfficeRecord`s from different sources:

```
1. Keep only records whose source.tier ∈ AUTHORITATIVE_TIERS.
2. Sort by termStart DESC.
3. Break date ties by higher SOURCE_TIER_RANK.
4. The top record is the current office; the rest become historical.
```

Older records are never discarded — they remain available for the agenda/position
history (requirement #2), just never as the *current* office.

---

## 4. Corroboration rule for low-trust facts

Implemented as `meetsCorroborationRule(fact)`:

- `official` / `nonpartisan` → always allowed (single source is enough).
- `media` / `alleged` / `unverified` → shown **only** if there are **≥ 2 distinct
  sources** (the primary + at least one corroborator). Otherwise withheld.
- When shown, such facts must be visibly flagged (e.g. "Reported — unverified")
  and list every corroborating source. `isLowTrust(tier)` gates the badge.

This keeps prediction-market / single-outlet claims from masquerading as fact
while still surfacing them transparently when multiple independent sources agree.

---

## 5. Ranked source roadmap

| # | Source | Tier | Data | Key? | Notes |
|---|--------|------|------|------|-------|
| 1 | **unitedstates/congress-legislators** (`legislators-current`) | 1 (public-domain) | Current members of Congress, terms, IDs | **No key** | ✅ Implemented. Source of truth for current office. |
| 2 | **FEC API** (`api.open.fec.gov`) | 1 | Campaign finance: receipts, disbursements, PACs, cash-on-hand | API key (free, api.data.gov) | Link via `fecIds` already captured in the snapshot. |
| 3 | **Senate eFD** + **House Clerk financial disclosures** (STOCK Act) | 1 | Member securities trades + disclosure dates | No key (scrape/bulk); 3rd-party mirrors are Tier 2 | Powers the conflict-of-interest trade timelines. |
| 4 | **Congress.gov API** / **GovTrack** / **ProPublica Congress** | 1 / 2 | Roll-call votes, sponsorship, committees | Congress.gov & ProPublica: key; GovTrack bulk: no key | Replaces hand-typed `votingRecord`. Match by bioguide. |
| 5 | **unitedstates/congress-legislators** (`legislators-historical`) | 1 | Former members + full term history | No key | Enriches "Former …" labels with exact prior dates. |
| 6 | **National Governors Association roster** (`nga.org/governors`) | 2 | 50 current governors: name, party, term start, state site | No key | ✅ Implemented as the curated `lib/data/governors.ts` list (Tier 2 · nonpartisan). |
| 7 | **unitedstates/images** (`theunitedstates.io/images/congress`) | 1 (public-domain) | Official member portraits, keyed by bioguide ID | No key | ✅ Implemented via `lib/data/photos.ts` + `PoliticianAvatar` (initials fallback). |
| 8 | **Ballotpedia / state SoS** | 2 / 1 | Statewide & local elections, lt. governors, AGs, local offices | Varies | Future: extend resolution below governor level. |

**Integration order rationale:** start with the zero-key dataset that fixes the
most damaging correctness bug (current office), then layer finance (FEC), then
trades (eFD/STOCK Act), then votes (Congress.gov/ProPublica). Each integration
reuses the same `SourcedFact` / `OfficeRecord` provenance envelope and the
recency + corroboration rules above.

---

## 6. Real vs. mock — current state

| Field | Status |
|-------|--------|
| Current office label & "In Office / Former" badge (politicians with `bioguideId`) | **Real** — derived from `legislators-current` via `resolveCurrentOffice` |
| `bioguideId`, current term start/end, state, chamber, party (in generated snapshot) | **Real** |
| Current office for **all 537 members of Congress** (national backbone) | **Real** — every member in `legislators-current` is a listed, searchable record |
| Current office for **50 state governors** | **Real** — Tier 2 curated NGA roster (`governors.ts`), resolved by state + name |
| Official member **photos** | **Real** — public-domain `unitedstates/images` by bioguide; initials fallback |
| Votes (House) | **Real** for featured House members when `CONGRESS_API_KEY` set — `npm run sync:votes` → Congress.gov API |
| Votes (Senate) | **Real** for featured senators — same sync pulls official senate.gov LIS XML (no key) |
| Stock trades | **Demo** on featured profiles (labeled); `npm run sync:stock-trades` writes empty official snapshot stub |
| Campaign finance totals (receipts, disbursements, cash on hand) for **featured profiles** | **Real** — from OpenFEC via `npm run sync:fec` → `fecFinance.json`, Tier-1 FEC badge in UI |
| Campaign finance lobbyist/industry/donor breakdowns | **Mock/demo** on featured profiles, honestly labeled when FEC totals are present |

---

## 7. National coverage & record types

The roster (`lib/data/allPoliticians.ts`) merges two kinds of records, de-duplicated
by bioguide ID (Congress) and by state (governors):

- **Featured** (`recordType` undefined): the ~17 richly hand-authored profiles.
  They keep their detailed votes/finance/issues **and** now derive their
  current-office label from the resolver + carry an official photo.
- **Lightweight** (`recordType: 'lightweight'`): every other current member of
  Congress and every governor. Real, verified office/term/party/state/photo;
  votes/finance/issues are intentionally empty and rendered as honest
  "no verified record available" placeholders. **Nothing is fabricated.**

Coverage: **587 officials** = 100 senators + 437 representatives + 50 governors,
538 with official photos. `getCoverageStats()` surfaces these numbers and
`npm run verify:office` asserts them.

### Governor re-verification TODO

`governors.ts` is a hand-verified snapshot (`GOVERNORS_AS_OF`). All 50 are
confirmed sitting governors, but unlike Congress there is no zero-key live feed,
so this list must be **manually re-verified after each gubernatorial election**
(and on any mid-term resignation/succession). Future automation candidate:
source #8 (Ballotpedia / state SoS) once a key/feed is chosen.

### API keys the owner should request next

Most Sprint 1 keys are **already wired** in `.env.local`. Remaining optional keys:

1. ~~**FEC / OpenFEC**~~ ✅ Integrated — `FEC_API_KEY`, `npm run sync:fec` + `sync:fec-national`
2. ~~**Congress.gov API**~~ ✅ Integrated — `CONGRESS_API_KEY`, `sync:votes` + `sync:votes-national`
3. ~~**Census, LegiScan, OpenStates, NewsAPI**~~ ✅ Integrated for Florida ingests
4. **GitHub Actions secrets** — run `gh auth login` then `./scripts/setup-github-secrets.sh` so production auto-refreshes keyed sources
5. **DATAVERSE_API_TOKEN** — MIT Election Lab (guestbook-gated)
6. **OPENSECRETS_API_KEY** — industry/donor aggregates (emailed)
7. **SAM_API_KEY** — login.gov identity verification
8. Stock trades: **House PTR** via `npm run sync:stock-trades` (no key). Senate eFD still maintenance (503).

---

## 8. Stock trades — integration stub

`scripts/sync-stock-trades.ts` (`npm run sync:stock-trades`) probes Senate eFD reachability and writes
`lib/data/generated/stockTrades.json` with **zero fabricated trades**. Featured profile stock tabs and `/congress`
continue to show **demo-labeled** mock trades until official PTR parsing lands.

**Next implementation steps** (encoded in snapshot `meta.nextSteps`):

1. Senate PTR list via `efdsearch.senate.gov/search/report/data/` (session + CSRF).
2. House YTD ZIP from `disclosures-clerk.house.gov/FinancialDisclosure`.
3. Map to `bioguideId`; merge via `lib/data/stockTrades.ts` (future) over hand-authored demo rows.

---

## Status

- ✅ `scripts/sync-legislators.ts` (`npm run sync:legislators`) fetches the dataset
  and writes `lib/data/generated/currentLegislators.json` (537 members, as-of date,
  Tier-1 source metadata). No API key.
- ✅ **Florida data pipeline** — 17+ sources in `/data/<source>/florida-*.json` with
  ingest scripts (`npm run ingest:*-fl`), daily refresh via `.github/workflows/refresh-data.yml`,
  `/sources` explorer, and per-page data slices (`lib/data/generated/slices/`).
- ✅ API keys integrated locally: FEC, Congress, Census, DATA_GOV, LegiScan, OpenStates, NewsAPI.
- ✅ **Sprint 1 (2026-06-24):** National FEC + votes sync scripts (`npm run sync:fec-national`,
  `npm run sync:votes-national`, `npm run sync:fec-schedule-a`); merge layers read
  `data/fec/national/` and `data/votes/national/` by `bioguideId` for all 537 Congress members;
  Follow the Money v1 (`FollowTheMoneyPanel`); House PTR extended to full House roster in
  `sync:stock-trades`. GitHub Actions secrets: run `scripts/setup-github-secrets.sh` after `gh auth login`.
- ✅ `lib/data/officeResolution.ts` implements recency resolution + corroboration,
  extended to resolve **governors** against the curated NGA roster.
- ✅ `lib/data/generatedPoliticians.ts` builds lightweight, real-sourced records for
  all 537 members + 50 governors; `lib/data/allPoliticians.ts` merges + de-dups them
  with the featured profiles and is the single roster the app lists/searches.
- ✅ Official photos wired via `lib/data/photos.ts` + `components/ui/PoliticianAvatar.tsx`
  (public-domain `unitedstates/images`, graceful initials fallback, visible attribution).
- ✅ Lists, dashboard, state map panel, search, and profile pages all derive
  current/former status from `resolveCurrentOffice`, never the hand-typed `inOffice`.
- ✅ `npm run verify:office` proves FL senators = Scott + Moody, that Rubio
  (`R000595`) resolves to *Former U.S. Senator* even with `inOffice: true`, and that
  national coverage = 537 Congress + 50 governors, de-duped, with photos.
- ✅ `scripts/sync-fec-finance.ts` (`npm run sync:fec`) fetches OpenFEC candidate
  totals for featured profiles (linked via `fecIds` in `currentLegislators.json` or
  FEC name search fallback) and writes `lib/data/generated/fecFinance.json`. Requires
  `FEC_API_KEY` in `.env.local` (free at [api.data.gov](https://api.data.gov)); exits
  gracefully with an empty snapshot when the key is missing. Profile **Money & Donors**
  tabs and `/finance` show Tier-1 FEC receipts/disbursements/cash-on-hand where synced;
  lobbyist/industry breakdowns stay demo-labeled.
- ✅ Senate roll-call votes for featured senators sync from **official senate.gov LIS XML** (Tier 1, no key),
  mapped through `unitedstates/congress-legislators` LIS IDs in `lib/data/senateVotesClient.ts`.
- ✅ House roll-call votes require `CONGRESS_API_KEY` (Congress.gov API v3). `npm run sync:votes` merges both chambers into `congressVotes.json`.
- ✅ `scripts/sync-stock-trades.ts` (`npm run sync:stock-trades`) — STOCK Act integration stub; writes empty `stockTrades.json` with documented next steps.

### FEC sync workflow

```bash
# 1. Copy .env.example → .env.local and set FEC_API_KEY (never commit .env.local)
cp .env.example .env.local

# 2. Ensure legislators snapshot is current (fecIds come from here)
npm run sync:legislators

# 3. Pull featured-profile finance from OpenFEC
npm run sync:fec

# 4. Verify office resolution still passes, then build
npm run verify:office
npm run build
```

Refresh `sync:fec` after election cycles or when adding new featured profiles with
`bioguideId`. The generated `fecFinance.json` is checked into the repo so production
builds work without a live API key; local/dev refresh uses `.env.local`.
