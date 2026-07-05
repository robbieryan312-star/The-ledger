# data/ — raw + snapshot data layer

Committed snapshots written by sync/ingest scripts and read by `lib/data/` accessors and
slice builders. **Layout is scope-first** so the tree explains itself:

| Dir | Scope | What lives here |
|-----|-------|-----------------|
| `national/` | All 537 federal members | National snapshots (votes, FEC) keyed by `bioguideId` |
| `florida/` | Florida pilot (state expansion template) | One dir per source, one snapshot each |
| `cache/` | Fetch cache | Bill summaries + roll-call pages (safe to regenerate) |
| `reports/` | Generated reports | e.g. `data-gaps.md` (regenerate on demand) |

Rules: no new top-level dirs outside these four (guard-enforced). Member-level generated
profile data does NOT live here — it lives in `lib/data/generated/profiles/{bioguideId}/`
(one file per destination view). A failed fetch must never overwrite a good snapshot (§6).
