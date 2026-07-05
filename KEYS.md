# API key pool — The Ledger

**Agent source routing:** `lib/data/SOURCE_LOOKUP.md` + `lib/data/sourceCatalog.ts`  
**Credibility tiers:** code values `'official'` | `'nonpartisan'` | `'media'` | `'alleged'` | `'unverified'`

| Source of truth | Purpose |
|-----------------|---------|
| `lib/data/sourceCatalog.ts` | What to pull from where, destination view, lookFor lists |
| `lib/data/reference-sources.ts` | Backward-compatible re-export of catalog |
| `scripts/setup-github-secrets.sh` | Groups pushed to GitHub Actions |
| `.env.local` | Actual key values (never commit) |

**Owner contact (registration forms):** `robbie.ryan312@gmail.com`

---

## SET in `.env.local` (working)

| Env var | Powers |
|---------|--------|
| `FEC_API_KEY` | `sync:fec`, `sync:fec-national`, `sync:fec-schedule-a` |
| `CONGRESS_API_KEY` | `sync:votes`, `sync:votes-national`, `ingest:member` |
| `CENSUS_API_KEY` | FL census ingest |
| `DATA_GOV_API_KEY` / `GOVINFO_API_KEY` | GovInfo / GPO (Congressional Record pilot) |
| `LEGISCAN_API_KEY` | FL state bills |
| `OPENSTATES_API_KEY` | FL state legislators |
| `NEWSAPI_KEY` | FL news (national uses GDELT) |
| `PROPUBLICA_CONGRESS_KEY` | **Retired** — do not use |

---

## EMPTY — priority

| Env var | Action |
|---------|--------|
| `VOTESMART_API_KEY` | **Deferred** — use Ballotpedia + GovInfo CREC |
| `OPENSECRETS_API_KEY` | **Deferred** — use FEC Schedule A (Phase 17) |
| `GOOGLE_CIVIC_API_KEY` | **Deferred** — elections demo until MIT bulk pipeline |
| `MEDIASTACK_API_KEY` | **Deferred** — GDELT covers news |
| `FRED_API_KEY` | Optional later — instant free signup when economic charts wired |
| `FOLLOWTHEMONEY_API_KEY` | Optional later — state finance beyond FEC |
| `OPENCORPORATES_API_KEY` | Optional later — employer→company crosswalk |
| `SAM_API_KEY` | Optional — login.gov verification required |

---

## No key required (integrated)

GovTrack, USASpending, Senate LDA, GDELT, Voteview, MIT Election Lab, House/Senate disclosures, unitedstates/congress-legislators, Ballotpedia scrape — see `SOURCE_CATALOG`.

---

## After adding a key

```bash
# Write value in .env.local, then:
./scripts/setup-github-secrets.sh
npm run build
```

Pilot member before 537 scale: `npm run sync:topic-positions -- --member S000033`
