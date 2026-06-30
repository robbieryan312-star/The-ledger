# Pilot profile checklist — Phase 17a / 17b template

**Pilot member:** `S000033` (Bernie Sanders, Senate, Vermont)  
**Purpose:** Define what a *complete* Ledger profile requires before scaling org→topic joins and Said→Did depth to all 537 members.

Honest gaps are required — never fill with paraphrase or fabrication. Use `"No verified record available"` in UI when a row is empty.

---

## Required data layers

| # | Data need | Source (tier) | Destination view | Sync / build | S000033 status |
|---|-----------|---------------|------------------|--------------|----------------|
| 1 | Current office, bioguideId | unitedstates/congress-legislators (`nonpartisan`) | Profile header | `npm run sync:legislators` | **done** |
| 2 | Roll-call votes (**Did**) | Congress.gov + Senate LIS (`official`) | Voting Record | `npm run sync:votes-national` | **done** |
| 3 | Campaign finance totals | OpenFEC (`official`) | Money & Donors | `npm run sync:fec-national` | **done** |
| 4 | Itemized Schedule A donors | OpenFEC Schedule A (`official`) | Follow the Money · topic context | `npm run sync:fec-schedule-a` · pilot: `data/fec/pilot/S000033-schedule-a.json` | **done** (pilot file) |
| 5 | Org/PAC → topic → vote join | `fecOrgRegistry.ts` + `buildOrgVoteTopicLinks.ts` | Track Record · Topic Record panel | build-time from Schedule A + votes | **done** — 2+ topic buckets with receipt+vote rows |
| 6 | Platform / survey text | Ballotpedia (`nonpartisan`) | Track Record · Topic Record | `npm run sync:topic-positions` | **done** |
| 7 | Floor speech verbatim (**Said**) | GovInfo Congressional Record (`official`) | Track Record · `statements[]` | `npm run sync:topic-positions -- --member S000033` (GOVINFO_API_KEY SET) | **done** — verbatim CREC excerpts, dated + GovInfo URL |
| 8 | Said→Did pairing | topicPositions + `buildSaidDidDiffsFromTopicPositions` | Track Record · Said→Did panel | build-time | **done** — ≥1 official CREC quote paired with roll-call vote |
| 9 | Topic legislation (sponsored/cosponsored) | Congress.gov API v3 (`official`) | Topic Record · legislation | `npm run ingest:member -- --bioguide S000033` | **done** — `lib/data/generated/members/S000033.json` |
| 10 | Journalism quotes (**Said**, optional) | Approved outlets (`media`) | Track Record | curated + `articleCache.json` | **partial** — 2-source corroboration rule applies |
| 11 | News mentions | GDELT (`nonpartisan`) | News section | `npm run sync:news-national` | **partial** |
| 12 | STOCK Act trades | House PTR / Senate eFD (`official`) | Stock Trades | `npm run sync:stock-trades` | **gap** for Senate eFD (503 maintenance) |

---

## Acceptance rules (every member at scale)

### Said (statements)

- Verbatim text in quotation marks with speaker attribution
- `tier`: `'official'` (CREC), `'nonpartisan'` (Ballotpedia platform), or `'media'` (approved journalism only)
- Date + URL visible in UI
- `'media'` requires **2+ independent approved outlets** before displaying as verified — otherwise `'alleged'` or omit

### Did (actions)

- Roll-call vote, trade, or official signature only — tier `'official'`
- congress.gov (or primary `.gov`) link + vote date

### Said→Did diff

- **Said** side: verbatim quote from tier `'official'` or corroborated `'media'`
- **Did** side: official roll-call record
- Gap: date math only — no editorial label

### Donor / org context (Phase 17)

- Schedule A itemized receipts — tier `'official'`
- Org→topic mapping via `fecOrgRegistry.ts` (curated + keyword fallback)
- Topic panel shows receipt + roll-call on **same topic** — label must state no causation implied
- Honest empty when no Schedule A row or no vote on that topic

### Topic record

- 10 canonical topic buckets (+ `legislation` catch-all)
- Legacy keys (`defense`, `economy`, etc.) merged at read time via `lib/data/topicAliases.ts`

---

## S000033 verification commands

```bash
# Refresh Said (CREC + Ballotpedia) for pilot only (~7 min)
npm run sync:topic-positions -- --member S000033 2>&1 | tee /tmp/ledger-phase17-pilot.log

# Build
npm run build

# Spot-check Said→Did count (expect ≥1 official pair)
npx tsx -e "
import { buildSaidDidDiffsFromTopicPositions } from './lib/data/buildSaidDidDiffs.ts';
console.log(buildSaidDidDiffsFromTopicPositions('S000033', 'Bernie Sanders').length);
"

# Spot-check org→topic links (expect ≥2 distinct topicIds)
npx tsx -e "
import { getScheduleAForBioguide } from './lib/data/fecScheduleA.ts';
import { buildOrgVoteTopicLinks } from './lib/data/buildOrgVoteTopicLinks.ts';
import { getCongressVotes } from './lib/data/congressVotes.ts';
const s = getScheduleAForBioguide('S000033');
const v = getCongressVotes('bernie-sanders', 'S000033')?.votes ?? [];
const links = s ? buildOrgVoteTopicLinks(s, v) : [];
console.log([...new Set(links.map(l => l.orgTopicId))]);
"
```

**Profile URL (local):** `/politicians/bernie-sanders` — Track Record tab: Said→Did panel + Topic Record with donor context rows.

---

## Phase 17b scale checklist (per member)

For each `bioguideId` when rolling beyond S000033:

- [ ] `members/{bioguideId}.json` exists (Phase 16 ingest)
- [ ] Entry in `congressVotes.json` with roll-call records
- [ ] Entry in `fecFinance.json` or honest empty on Money tab
- [ ] Schedule A row in national snapshot OR honest gap (no demo fill-in)
- [ ] `topicPositions.json` row with platform positions where Ballotpedia has content
- [ ] GovInfo CREC statements where floor speeches exist (same sync path as pilot)
- [ ] Said→Did links only when Said source matches topic + vote context
- [ ] Org→topic→vote rows only when registry maps org and member has topic vote
- [ ] No Wikipedia, no paraphrased quotes, no moral labels in UI copy

---

## Deferred (do not block pilot)

| Item | Substitute |
|------|------------|
| VoteSmart NPAT | Ballotpedia + GovInfo CREC |
| OpenSecrets API | FEC Schedule A + org registry |
| Senate eFD stock trades | Show gap; House PTR only where available |

---

## Generated files to commit after pilot sync

| File | Produced by |
|------|-------------|
| `lib/data/generated/topicPositions.json` | `sync:topic-positions` |
| `lib/data/generated/articleCache.json` | `sync:topic-positions` (approved media fetch path) |
| `data/fec/pilot/S000033-schedule-a.json` | `sync:fec-schedule-a-pilot` (already committed) |
