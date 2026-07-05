# data/national/ — national-scope snapshots (all 537 federal members)

| Dir | File(s) | Written by | Read by | Refresh |
|-----|---------|-----------|---------|---------|
| `votes/` | `congress-votes.json` (keyed by `bioguideId`, 30 votes/member, senate.gov + Congress.gov sources) | `npm run sync:votes-national` | `lib/data/nationalCongressVotes.ts` → migrated profiles | daily (Actions) / on demand |
| `fec/` | `congress-finance.json`, `schedule-a.json` | `npm run sync:fec-national`, `sync:fec-schedule-a` | `lib/data/nationalFecFinance.ts`, `lib/data/fecScheduleA.ts` | daily (Actions) / on demand |
| `fec/pilot/` | `S000033-schedule-a.json` (Sanders pilot itemized receipts) | `sync:fec-schedule-a-pilot` | `lib/data/fecScheduleA.ts` | frozen pilot artifact |

These are the single source of truth for votes/finance on migrated profiles — the demo
`lib/data/generated/congressVotes.json` serves non-migrated members only.
