# Archived scripts

Superseded one-off migration, benchmark, diagnostic, and ad-hoc collection tools.
**Do not run in agent sessions** — retained for git history and regression reference only.

| File | Superseded by |
|------|----------------|
| `migrate-s000033-profile.ts` | `npm run profile:build -- --members S000033` |
| `migrate-gold-profiles-batch1.ts` | `npm run profile:build` batch protocol |
| `benchmark-ingest-sample.ts` | `profile:build` + scoped `ingest-member-deep` |
| `fetch-batch1-news.ts` | `npm run sync:news-rss -- --members` |
| `test-cosponsor-pipeline.ts` | `ingest-member-deep` in CI / manual spot-check |
| `audit-overreject.ts` | `npm run sync:topic-positions` + `test:crec` guards |
| `compare-topic-batch.ts` | `test:topic-positions-bundle` / `profile:build` verification |
| `verify-phase17b-batch.ts` | `npm run profile:build` + `audit:profile-credibility --gate` |
| `stamp-profile-display-text.ts` | `scripts/lib/profileMigrate.ts` / `profile:build` |
| `apply-crec-sync-to-profiles.ts` | `npm run sync:topic-positions` + `npm run profile:build` |
| `report-pilot-coverage.ts` | `npm run audit:profile-credibility --gate` |
| `refresh-senate-cast-votes.ts` | `npm run sync:votes-national` + `npm run refresh:migrated-votes` |
| `generate-roster.ts` | `npm run sync:legislators` (writes `generated/roster.json`) |
| `sync-profile-news.ts` | `npm run sync:news-rss` (3rd news path retired; RSS → GDELT order) |
