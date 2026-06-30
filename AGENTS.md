<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ledger-data-rules -->
# The Ledger — Project Rules

Civic-info Next.js app. **Data credibility is the highest priority.** Every decision defers to it.

Product vision and editorial voice: `PRODUCT_VISION.md`, `.cursor/rules/ledger-editorial-voice.mdc`.

---

## What this product does

The Ledger presents what politicians promised versus what they actually did in office — using verified, sourced, dated facts. The core feature is the "Said → Did" factual diff: verbatim quote from a vetted journalism source paired with the official voting or financial record. No editorializing. No moral labels. The record speaks.

---

## Data credibility

### Source tiers — exact code values (never write "Tier 1/2/3/4")

| Code value | Meaning |
|------------|---------|
| `'official'` | `.gov`, FEC, STOCK Act, congress.gov, senate.gov, house.gov |
| `'nonpartisan'` | GovTrack, OpenSecrets, Ballotpedia, AP, Reuters, unitedstates/congress-legislators |
| `'media'` | Named mainstream outlet — verbatim quotes ONLY, never paraphrased |
| `'alleged'` | Credible but unproven — multi-source corroboration required, always flagged |
| `'unverified'` | No verified sourcing — maximum caveat, rarely shown |

### Multi-source corroboration rule

Any statement attributed to a politician from a `'media'` or lower tier source requires **2+ independent approved sources** before it can be displayed as verified.

- 1 source, tier `'official'` or `'nonpartisan'` → verified, display as-is
- 1 source, tier `'media'` → label `'alleged'`, show with caveat, never verified
- 2+ independent `'media'` sources → verified, list all sources
- Cannot corroborate → do not display; show "No verified statement on record"

AP/Reuters wire + an outlet republishing that wire = 1 source, not 2.

### Banned sources

- **Wikipedia** — never under any tier. User-editable, not authoritative.
- Social media posts — not verifiable at any tier without corroboration from an approved outlet.
- Anonymous sources — never, at any tier.
- Press releases from campaigns or PACs — `'alleged'` only, requires corroboration.
- Any source without a verifiable URL and publication date.

### Approved journalism sources (tier `'media'`)

NYT, Washington Post, Wall Street Journal, Politico, The Hill, AP, Reuters, NPR, PBS NewsHour, Roll Call, CQ, The Atlantic, Bloomberg, ProPublica, The Guardian, Miami Herald, Tampa Bay Times, Sun Sentinel, Orlando Sentinel, Florida Phoenix, WUSF, WLRN.

Journalism quotes must be **verbatim**, in quotation marks, with named outlet, author, date, and URL. Never paraphrase a quote and present it as the politician's words.

### Data organized by destination view

Every generated file is named and structured for the UI section it feeds — not by its source.
Before creating any new data file, confirm which profile tab or page section it belongs to.
See `ledger-data-policy.mdc` for the full destination map.

### Office resolution

Current office must come from `unitedstates/congress-legislators`, senate.gov LIS XML, house.gov, or governor.gov equivalents. Never from hand-typed `inOffice: true` flags alone. Most recent authoritative record wins.

### No fabrication

Show `"No verified record available"` for gaps. Never fabricate or paraphrase to fill holes.

---

## Architecture rules

### SSR on all route pages — non-negotiable

Route pages (`app/**/page.tsx`) must be **server components**. Do not add `'use client'` to a route page file. Interactive sub-components use `'use client'` — the route page shell does not.

Reason: crawlers index server-rendered HTML. A `'use client'` route page is invisible to Google. Individual politician profiles must be crawler-visible.

Known violation to fix: `app/politicians/[id]/page.tsx` is currently `'use client'`. Convert to server shell + client sub-components in the next architecture phase.

### Data flow

```
sync scripts → lib/data/generated/*.json → Next.js build-time import → UI
```

No Postgres. No runtime API calls from the browser. All data is static JSON pre-rendered at build time, refreshed via GitHub Actions on a schedule.

### bioguideId is the universal key

Links profiles across all data layers: votes, FEC finance, news, stock trades. Primary join key for all Congress member data. Never duplicate or alias this key.

---

## Build workflow

- Work on feature branches — never directly on `main`
- `npm run build` must pass before any commit
- Commit after each completed task before starting the next
- Stop and wait for owner review after each phase — do not chain phases
- Report in 3 lines: `Build: pass/fail | Files changed: [list] | Verified: [what you tested]`

After data changes always run: `npm run sync:legislators` → `npm run verify:office` → `npm run build`

---

## Scope discipline

- Do not add features, refactor, or introduce abstractions beyond what the task requires
- Do not change UI copy, rename things, or touch files not mentioned in the brief
- Scope creep is a task failure — the owner will reject and require a revert

---

## Mock data policy

- Mock data (`mockLobbyingGroups`, `mockElections`, `mockStockTrades`) exists only for the 16 featured profiles and as UI scaffolding
- Pages that display mock data to users must carry a visible disclaimer
- Never present demo or fabricated data as official records
- Never expand hand-written mock data for national coverage

---

## Scope priority

1. All 537 federal Congress members — votes, FEC, office, news
2. Governors and top statewide via state `.gov` / SoS sources
3. Rich featured profiles with verbatim journalism quotes and "Said → Did" diffs
4. Follow the Money: FEC schedule A, STOCK Act trades, lobbying disclosures
5. Local elections — demo templates only until a real local data pipeline exists

---

## Decision authority

Routine implementation: proceed without asking. Stop and ask the owner only for:
- Scope changes
- Credibility tradeoffs (conflicting sources, which record to trust)
- Major UX direction changes

---

## Key reference files

| File | Purpose |
|------|---------|
| `PROGRESS.md` | Sprint status and completed phase log |
| `PRODUCT_VISION.md` | What "desirable" means — voice, depth, Beat Google standard |
| `ARCHITECTURE.md` | System design, data sources, trusted outlets in full |
| `lib/data/SOURCE_LOOKUP.md` | Agent routing — data need → source → destination → tier |
| `lib/data/sourceCatalog.ts` | Machine-readable catalog with lookFor lists |
| `KEYS.md` | API key SET/EMPTY status |
| `lib/data/DATA_INTEGRATION_PLAN.md` | Data pipeline roadmap |
| `lib/data/officeResolution.ts` | Office resolution logic |
| `lib/types/index.ts` | SourceTier union — the authoritative list of tier values |
| `.env.local` | API keys (never paste values in chat or commit to any file) |
| `scripts/setup-github-secrets.sh` | Push keys to GitHub Actions |

## Cursor Cloud specific instructions

- Single Next.js 16 (Turbopack) app. Dependencies install via `npm install`; `.npmrc` sets `legacy-peer-deps=true`, so non-npm package managers will mis-resolve peers — use npm.
- The app runs fully on committed data (mock + `lib/data/generated`), so `npm run dev` and `npm run build` work without any API keys or external services.
- API keys (`FEC_API_KEY`, `CONGRESS_API_KEY` in a gitignored `.env.local`) are only needed for the optional `npm run sync:fec` / `npm run sync:votes` data-refresh scripts; `npm run sync:legislators` and `npm run verify:office` need no key.
- `npm run lint` currently reports pre-existing errors (e.g. `lib/hooks/useUserProfile.ts` set-state-in-effect) unrelated to environment setup; lint tooling itself works.

### Port 3000 is reserved — never start or kill anything on it

`localhost:3000` is the owner's manual browser window onto the live Ledger demo. It is not
a sandbox port.

- **Never** run `npm run dev`, `npm run start`, or any server bound to port 3000 from an
  agent session. Use an explicit alternate port instead: `npm run dev -- -p 4100` (pick any
  free port in the 4100–4999 range, or let the tooling auto-assign one).
- **Never** kill a process holding port 3000, even if it looks idle or "in the way" — it is
  very likely the owner's own browser-connected session, not an orphaned agent process.
- Always stop any dev/test server you started yourself once verification is done — do not
  leave long-running background servers from agent sessions. A leaked agent server is what
  causes the next session to wrongly suspect port 3000 itself and go looking for something
  to kill there.
- If you need a live preview to verify a change, start it on a non-3000 port and report that
  port back — do not assume 3000 is free or available to you.
<!-- END:ledger-data-rules -->
