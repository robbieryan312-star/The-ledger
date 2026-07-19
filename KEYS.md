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

## SET in `.env.local`

| Env var | Powers |
|---------|--------|
| `FEC_API_KEY` | `sync:fec`, `sync:fec-national`, `sync:fec-schedule-a` |
| `CONGRESS_API_KEY` | `sync:votes`, `sync:votes-national`, `ingest:member` |
| `CENSUS_API_KEY` | Optional for FL county/rankings ingest. `ingest:fl-counties` and `ingest:fl-state-rankings` fall back to keyless `data.census.gov` (full 67 counties). Still required for other Census scripts that hard-exit without a key (`ingest:census-fl`). |
| `DATA_GOV_API_KEY` / `GOVINFO_API_KEY` | GovInfo / GPO (Congressional Record pilot) |
| `LEGISCAN_API_KEY` | FL state bills |
| `COURTLISTENER_API_KEY` | FL court opinion cluster/opinion detail (`/search/` is keyless) |
| `OPENSTATES_API_KEY` | FL state legislators |
| `NEWSAPI_KEY` | FL news ingest (**deferred** — NewsAPI 426 plan restriction; national uses RSS/GDELT) |
| `PROPUBLICA_CONGRESS_KEY` | **Retired** — do not use |

**Cloud agent sessions:** keys load from (1) **Cursor Cloud Agents → Secrets** (recommended —
use **Runtime Secret** type so values are redacted from logs/commits), or (2) `.env.local`
(gitignored). Verify any session with `npm run verify:agent-keys` (prints SET/EMPTY only).

### Cursor Cloud Agents — Secrets to add (one-time)

Add each name below in [Cloud Agents → your environment → Secrets](https://cursor.com/dashboard/cloud-agents).
Use **Runtime Secret** for all API keys. Never commit values to the repo.

`FEC_API_KEY` · `CONGRESS_API_KEY` · `CENSUS_API_KEY` · `DATA_GOV_API_KEY` · `GOVINFO_API_KEY` ·
`BEA_API_KEY` ·
`LEGISCAN_API_KEY` · `OPENSTATES_API_KEY` · `NEWSAPI_KEY` · `COURTLISTENER_API_KEY` (optional)

After saving secrets, start a new agent run (or snapshot this environment with `.env.local` present).

### Key onboarding (from former API_KEYS.md)

| Key | Signup URL | What it powers |
|-----|------------|----------------|
| `FEC_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | Campaign finance sync |
| `CONGRESS_API_KEY` | [api.congress.gov/sign-up](https://api.congress.gov/sign-up/) | House roll-call votes |

> **Different services:** `FEC_API_KEY` (api.data.gov) does **not** work for Congress.gov.

**Prefer** editing `.env.local` over pasting keys in chat. **Rotate** any key pasted in chat.

After adding keys: `npm run sync:fec` → `npm run sync:votes` → `npm run sync:legislators` → `npm run verify:office` → `npm run build`.

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
| `BEA_API_KEY` | Optional for full MARPP components/metros (`ingest:bea-rpp-fl`). Without it, ingest falls back to BEA RPP all-items via FRED `*RPPALL` CSV (official BEA figures + rank-among-50). |

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
