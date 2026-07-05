# Pipeline-generated data layer

This directory holds **typed accessors** and **build-time generated JSON** for The Ledger.
All fact data enters via sync/ingest scripts → `lib/data/generated/` — never hand-authored mock rows.

## Agent routing

| Need | Read |
|------|------|
| Which source feeds which UI section | [`SOURCE_LOOKUP.md`](./SOURCE_LOOKUP.md) |
| Machine-readable catalog | [`sourceCatalog.ts`](./sourceCatalog.ts) |
| Integration roadmap | [`DATA_INTEGRATION_PLAN.md`](./DATA_INTEGRATION_PLAN.md) |
| Florida raw snapshots | [`docs/FLORIDA_DATA.md`](../../docs/FLORIDA_DATA.md) |

## Generated files (examples)

| File | Updated by |
|------|------------|
| `generated/currentLegislators.json` | `npm run sync:legislators` |
| `generated/roster.json` | Derived from legislators + office resolution |
| `generated/profiles/<bioguideId>/` | Profile pipeline / reprocess scripts |
| `generated/congressVotes.json` | `npm run sync:votes` (legacy per-member) · national: `npm run sync:votes-national` |
| `generated/fecFinance.json` | `npm run sync:fec-national` |

## DNU quarantine (2026-07-04)

Mock/hand-authored fact data is permanently banned from the app interface. Build-gated guards in
`lib/data/sourceIntegrity.ts` enforce no DNU imports and no `/mock/i` keys in generated JSON.

## Production sources (reference)

Authoritative integrations include FEC, Congress.gov, GovTrack, unitedstates/congress-legislators,
GovInfo CREC, approved journalism RSS, STOCK Act PTR, and Florida state pipelines — see
`SOURCE_LOOKUP.md` for live status per data need.
