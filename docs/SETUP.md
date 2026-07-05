# Setup & environment

Quick index for keys, sync commands, and local dev. **Never paste secret values into chat or commits.**

## API keys

| File | Purpose |
|------|---------|
| `KEYS.md` | Which env vars are SET vs EMPTY |
| `.env.local` | Actual key values (gitignored) |
| `.env.example` | Template variable names |
| `OWNER_SETUP.md` | Owner walkthrough (~10 min) |
| `scripts/setup-github-secrets.sh` | Push keys to GitHub Actions after `gh auth login` |

Owner email for registrations: `robbie.ryan312@gmail.com` (canonical in `KEYS.md`).

## Build & verify (always after data changes)

```bash
npm run sync:legislators
npm run verify:office
npm run build
```

Prebuild runs guard suites (source-integrity, client-bundle, topic-positions-bundle, etc.).

## National sync commands

```bash
npm run sync:fec-national       # FEC campaign finance (537 members)
npm run sync:votes     # Roll-call votes via Congress.gov + Senate LIS
npm run sync:stock-trades       # House PTR STOCK Act trades
npm run sync:news-rss           # Approved-outlet RSS (primary news path)
npm run sync:news-national      # GDELT bulk (rate-limited; secondary)
```

## Profile pipeline

```bash
npm run profile:build -- --members S000033   # Single-member collect→validate→apply
npm run ingest:member-all                    # 537 deep bill files (Phase 16)
```

## Florida ingest

All Florida scripts live under `scripts/ingest/florida/`. See `docs/FLORIDA_DATA.md`.

```bash
npm run ingest:florida-all    # All 21 Florida sources
npm run ingest:no-key         # Subset requiring no API keys
npm run build:data-slices     # Merge raw FL snapshots → lib/data/generated/slices/
```

## Dev server

Port **3000 is reserved** for the owner's browser session. Agents use an alternate port:

```bash
npm run dev -- -p 4100
```

Stop any dev server you start when verification is done.

## CI

`.github/workflows/guards.yml` — guard test suites + build on push.
