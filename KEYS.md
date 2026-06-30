# API key pool — The Ledger

Canonical registry for env vars, signup URLs, and status. **Values live only in `.env.local`** (gitignored).

| Source of truth | Purpose |
|-----------------|---------|
| `lib/data/reference-sources.ts` | Full catalog — tiers, integration status, `keyVar` names |
| `scripts/setup-github-secrets.sh` | Groups pushed to GitHub Actions |
| `.env.local` | Actual key values (never commit) |

**Owner contact (registration forms):** `robbie.ryan312@gmail.com` — see `scripts/ingest-secedgar-florida.ts` User-Agent string.

---

## Tier 1 — have keys (`.env.local` SET)

| Env var | Signup | Powers |
|---------|--------|--------|
| `FEC_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | `sync:fec`, `sync:fec-national`, `sync:fec-schedule-a` |
| `CONGRESS_API_KEY` | [api.congress.gov/sign-up](https://api.congress.gov/sign-up/) | `sync:votes`, `sync:votes-national`, `ingest:member` |
| `CENSUS_API_KEY` | [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html) | Florida census ingest |
| `DATA_GOV_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | Shared api.data.gov key |
| `GOVINFO_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | GovInfo / GPO ingest |
| `LEGISCAN_API_KEY` | [legiscan.com/legiscan](https://legiscan.com/legiscan) | FL state legislation |
| `OPENSTATES_API_KEY` | [openstates.org/account/profile/](https://openstates.org/account/profile/) | FL state legislators |
| `NEWSAPI_KEY` | [newsapi.org/register](https://newsapi.org/register) | News (426 plan — GDELT used nationally) |
| `PROPUBLICA_CONGRESS_KEY` | — | **Retired API** — key may remain in env; do not use for new work |

---

## Tier 2 — EMPTY in `.env.local` (register when wired)

| Env var | Signup | Priority | Notes |
|---------|--------|----------|-------|
| `VOTESMART_API_KEY` | [votesmart.org/share/api/register](https://www.votesmart.org/share/api/register) | **Now** | NPAT stated positions — Phase 15c blocker |
| `OPENSECRETS_API_KEY` | Email [opendata@opensecrets.org](mailto:opendata@opensecrets.org) | Later | Public API discontinued Apr 2025; FEC Schedule A preferred |
| `FRED_API_KEY` | [fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html) | Later | Instant after free account |
| `FOLLOWTHEMONEY_API_KEY` | [followthemoney.org/our-data/apis](https://www.followthemoney.org/our-data/apis) | Later | State money-in-politics request form |
| `GOOGLE_CIVIC_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) | Later | Representatives endpoint deprecated |
| `MEDIASTACK_API_KEY` | [mediastack.com](https://mediastack.com) | Later | Supplementary news |
| `OPENCORPORATES_API_KEY` | [opencorporates.com/api_accounts/new](https://opencorporates.com/api_accounts/new) | Later | Company records |

---

## Tier 3 — login / identity (manual)

| Env var | Signup | Notes |
|---------|--------|-------|
| `SAM_API_KEY` | [sam.gov](https://sam.gov) + login.gov | Identity verification required |

---

## No key required (already integrated)

GovTrack, USASpending, Senate LDA, GDELT, Voteview bulk, MIT Election Lab, House/Senate disclosures — see `REFERENCE_SOURCES` in `lib/data/reference-sources.ts`.

---

## After adding a key

```bash
# Write value in .env.local, then:
npm run sync:topic-positions -- --member S000033   # VoteSmart pilot
./scripts/setup-github-secrets.sh                  # push to GitHub Actions
npm run build
```
