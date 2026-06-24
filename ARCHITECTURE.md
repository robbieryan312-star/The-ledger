# The Ledger — Architecture

Static JSON pre-render pattern. No Postgres or system services.

## Data flow

```
API scripts (scripts/ingest-*.ts, scripts/sync-*.ts)
  → clean JSON snapshots
  → /data/<source>/florida-*.json  (Florida-first ingestion)
  → lib/data/generated/*.json       (national roster, featured syncs)
  → Next.js build-time import
  → frontend display
```

## Source tiers (shown in UI)

| Tier | Type |
|------|------|
| 1 | Official `.gov` |
| 2 | Nonpartisan `.org` / research |
| 3 | Journalism |
| 4 | Speculative |

## Keys

All API keys live in `.env.local` (gitignored). Never hardcode in tracked files.

## Florida ingestion order

1. FEC → `data/fec/florida-candidates.json`
2. Congress.gov → `data/congress/florida-votes.json`
3. GovTrack (replaces retired ProPublica) → `data/govtrack/florida-members.json`
4. OpenStates → `data/openstates/florida-legislators.json`
5. LegiScan → `data/legiscan/florida-legislation.json`
6. USASpending → `data/spending/florida-contracts.json`
7. SAM.gov → `data/sam/florida-contractors.json`
8. Census + congress-legislators (replaces deprecated Google Civic) → `data/civic/florida-districts.json`
9. FARA → `data/fara/florida-registrants.json`
10. Senate LDA → `data/lobbying/florida-disclosures.json`
11. NewsAPI → `data/news/florida-coverage.json`
12. Census demographics → `data/census/florida-demographics.json`

## Agent rules

See `PROGRESS.md` Section 7. Commit and push after every completed ingestion or feature.
