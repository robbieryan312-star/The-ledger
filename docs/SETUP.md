# Setup & environment

Quick index for keys, sync commands, and local dev. **Never paste secret values into chat or commits.**

## API keys

| File | Purpose |
|------|---------|
| `KEYS.md` | Which env vars are SET vs EMPTY (authoritative) |
| `.env.local` | Actual key values (gitignored) |
| `.env.example` | Template variable names |
| `scripts/setup-github-secrets.sh` | Push keys to GitHub Actions after `gh auth login` |

**Owner email for registrations:** `robbie.ryan312@gmail.com` (canonical in `KEYS.md`).

### Getting started with keys (~10 min)

1. Copy `.env.example` → `.env.local` in the project root.
2. Register keys (free):

| Key | Signup URL | Powers |
|-----|------------|--------|
| `FEC_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | `npm run sync:fec`, `sync:fec-national` |
| `CONGRESS_API_KEY` | [api.congress.gov/sign-up](https://api.congress.gov/sign-up/) | House votes in `npm run sync:votes` |

> `FEC_API_KEY` and `CONGRESS_API_KEY` are **different services**. A key from api.data.gov does **not** work for Congress.gov.

**Two ways to provide keys:** (A) paste in agent chat once and say *"write these to .env.local"* — works but chat is semi-public; (B) edit `.env.local` yourself and tell the agent *"keys are in .env.local"* — **preferred**.

**Security:** Never commit `.env.local`. Rotate any key pasted in chat.

Tell the agent: *"keys are in .env.local"* when starting a session.

### Optional: Vercel deploy

1. [vercel.com/signup](https://vercel.com/signup)
2. From project root: `npm run build && npx vercel`
3. Add `FEC_API_KEY` and `CONGRESS_API_KEY` in Vercel → Settings → Environment Variables for live syncs on deploy.

### Owner local demo

Run the dev server in **your own terminal** (port **3000 is reserved** for your browser session):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Agents use `npm run dev -- -p 4100` instead.

### Keys to get later (deferred)

| Key | When | URL |
|-----|------|-----|
| OpenSecrets | Lobbying/industry imports | [opensecrets.org/open-data/api](https://www.opensecrets.org/open-data/api) |

**Do not pursue:** ProPublica Congress API (retired).

### What NOT to do

- Do not run a separate session to harvest random political APIs — use `npm run sync:*` in `scripts/`.
- Do not paste API keys into public repos, PRs, or tracked files.

## Build & verify (always after data changes)

```bash
npm run sync:legislators
npm run verify:office
npm run build
```

Prebuild runs guard suites — see `docs/AGENT_INDEX.md` for the full list.

## Refresh all data (optional)

```bash
npm run sync:legislators && npm run sync:fec && npm run sync:votes && npm run sync:stock-trades
npm run verify:office
npm run build
```

`sync:legislators` needs no key. Senate PTR sync may fail during eFD maintenance — retry later.

## National sync commands

```bash
npm run sync:fec-national       # FEC campaign finance (537 members)
npm run sync:votes-national     # Roll-call votes via Congress.gov + Senate LIS (all 537)
npm run sync:votes              # Legacy per-member overlay → generated/congressVotes.json
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
npm run ingest:florida-all    # All Florida sources
npm run ingest:no-key         # Subset requiring no API keys
npm run build:data-slices     # Merge raw FL snapshots → lib/data/generated/slices/
```

## Dev server (agents)

Port **3000 is reserved** for the owner's browser session. Agents use an alternate port:

```bash
npm run dev -- -p 4100
```

Stop any dev server you start when verification is done.

## CI

`.github/workflows/guards.yml` — guard test suites + build on push.

## Git workflow

Cursor agents commit locally when work passes review; **push to `origin/main` requires explicit APPROVAL** (see `.cursor/rules/ledger-core-rules.mdc` §1.1 K).

## Deploy model (single Vercel project — owner renamed 2026-07-21)

- **Only project + public hostname:** `the-ledger-main` → https://the-ledger-main.vercel.app
- **Retired:** `the-ledger-s4dn` / https://the-ledger-s4dn.vercel.app (404 after domain rename)
- **GitHub:** Production deploy statuses use `the-ledger-main-*` deployment URLs.
  Stale GitHub Environments (`Production – the-ledger-s4dn`, `Preview – the-ledger`, etc.) are
  leftover labels — delete in GitHub → Settings → Environments (integration token cannot).
- **Production** tracks `main`. Merges to `main` happen only on Claude APPROVAL; Vercel redeploys
  production from that project automatically.
- **Deleted (do not reference):** `the-ledger-jcjh`, `the-ledger`, and any other former Vercel
  projects. Agents must not attempt deploys, cite preview URLs, or treat bot comments for those
  names as live or approved. **Do not** treat `ledger-main.vercel.app` as this app (different stub).
- **Repo `vercel.json`:** `git.deploymentEnabled` enables deploys on `main` only (`"*": false`)
  so PR/feature branches do not create Preview deployments. Production on `the-ledger-main`
  still advances when PRs **merge to main**. Owner should keep Production Branch = `main` and a
  single project connected.
