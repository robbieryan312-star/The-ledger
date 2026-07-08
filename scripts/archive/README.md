# Archived scripts

Superseded one-off migration, benchmark, and ad-hoc collection tools. Use `npm run profile:build` and scheduled syncs instead.

| File | Superseded by |
|------|----------------|
| `migrate-s000033-profile.ts` | `profile:build -- --members S000033` |
| `migrate-gold-profiles-batch1.ts` | `profile:build` batch protocol |
| `benchmark-ingest-sample.ts` | `profile:build` + scoped `ingest-member-deep` |
| `fetch-batch1-news.ts` | `sync:news-rss --members` |
| `test-cosponsor-pipeline.ts` | `ingest-member-deep` in CI / manual spot-check |

**Do not run archived scripts in agent sessions** — they are retained for git history and regression reference only.
