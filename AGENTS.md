<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ledger-data-rules -->
# The Ledger — Project Rules

Civic-info Next.js app. **Data credibility is the highest priority.** Every decision defers to it.

**READ EVERY RESPONSE:** `.cursor/rules/ledger-core-rules.mdc` — the single concrete ruleset
(operating rules, data credibility, locked profile layout, guardrails). **Cursor also reads**
`docs/CURSOR_IMPLEMENTATION_MANUAL.md` every turn. It exists because approved specs were being
ignored and re-requested. Do not re-ask what a file already answers.

**Session start:** See **`docs/AGENT_INDEX.md`** for the canonical mandatory read order (do not maintain rival lists in this file).

**Also read when relevant:** `PRODUCT_VISION.md`, `.cursor/rules/ledger-editorial-voice.mdc`.

---

## What this product does

The Ledger presents what politicians promised versus what they actually did in office — using verified, sourced, dated facts. The core feature is the "Said → Did" factual diff: verbatim quote from a vetted journalism source paired with the official voting or financial record. No editorializing. No moral labels. The record speaks.

---

## Data credibility

**Source tiers, corroboration, banned sources:** canonical table in `.cursor/rules/ledger-core-rules.mdc` §3; full policy in `.cursor/rules/ledger-data-policy.mdc`.

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

### Data flow

```
sync scripts → lib/data/generated/*.json → Next.js build-time import → UI
```

No Postgres. No runtime API calls from the browser. All data is static JSON pre-rendered at build time, refreshed via GitHub Actions on a schedule.

### bioguideId is the universal key

Links profiles across all data layers: votes, FEC finance, news, stock trades. Primary join key for all Congress member data. Never duplicate or alias this key.

---

## Build workflow

- **Canonical repo:** `The-ledger` on `main` — see `REPO.md`
- Work on feature branches when useful; owner may direct commits to `main`
- `npm run build` must pass before any commit
- Commit after each completed task before starting the next
- Stop at review gates after each phase: Claude Code reviews every phase's output against the
  rules before it is accepted/pushed; the owner reviews visual/product checkpoints only. Do not
  chain unreviewed phases. (Conflict resolution: `.cursor/rules/ledger-core-rules.mdc` is the
  canonical ruleset — where any doc disagrees with it, core-rules wins.)
- Report in 3 lines: `Build: pass/fail | Files changed: [list] | Verified: [what you tested]`

After data changes always run: `npm run sync:legislators` → `npm run verify:office` → `npm run build`

---

## Scope discipline

- Do not add features, refactor, or introduce abstractions beyond what the task requires
- Do not change UI copy, rename things, or touch files not mentioned in the brief
- Scope creep is a task failure — the owner will reject and require a revert

---

### Mock data policy (DNU quarantine — 2026-07-04)

Mock/hand-authored fact data is permanently banned from the app interface.
Historical hand-authored data was removed; retrievable only via git history (quarantine commit 288e2df); it may never re-enter app code. Pipelines with verifiable sources are the only path into generated data.

- **Banned from interface:** No app/, components/, or lib/ code may import former DNU quarantine files
- **Guard-enforced:** Build fails on any DNU import (sourceIntegrity test suite) — guards remain permanently even though the directory is deleted
- **Pipelines are the only path:** Real data enters via sync scripts → lib/data/generated/ with verifiable sources
- **Identity scaffolding:** Politician roster/identity fields (name, party, state, photo) live in generated/roster.json
- **No mock keys:** generated/*.json files may never contain keys matching `/mock/i` (build-gated guard)
- **Honest empty states:** Any category without real pipeline data shows "No verified record available"
- **Demo surfaces:** /elections, /lobbying, /compare show "No verified data yet" until real pipelines exist

---

## Scope priority

1. Rich featured profiles with verbatim journalism quotes and "Said → Did" diffs — depth before breadth
2. All 537 federal Congress members — votes, FEC, office, news
3. Governors and top statewide via state `.gov` / SoS sources
4. Follow the Money: FEC schedule A, STOCK Act trades, lobbying disclosures
5. Local elections — demo templates only until a real local data pipeline exists

---

## Decision authority

Routine implementation: proceed without asking. **Credibility tradeoffs** (conflicting sources, which record to trust) route to **Claude Code** per the written spec — not the owner. Stop and ask the owner only for:
- Scope changes
- Major UX / visual / layout / product direction changes

(Conflict resolution: `.cursor/rules/ledger-core-rules.mdc` wins over any other doc.)

---

## Key reference files

| File | Purpose |
|------|---------|
| `REPO.md` | Canonical repo + mandatory session-start read order |
| `PROGRESS.md` | Sprint status and completed phase log |
| `PRODUCT_VISION.md` | What "desirable" means — voice, depth, Beat Google standard |
| `ARCHITECTURE.md` | System design, data sources, trusted outlets in full |
| `lib/data/SOURCE_LOOKUP.md` | Agent routing — data need → source → destination → tier |
| `lib/data/sourceCatalog.ts` | Machine-readable catalog with lookFor lists |
| `KEYS.md` | API key SET/EMPTY status |
| `lib/data/DATA_INTEGRATION_PLAN.md` | Redirect stub → **`ARCHITECTURE.md`** (pipeline roadmap) |
| `lib/data/officeResolution.ts` | Office resolution logic |
| `lib/types/index.ts` | SourceTier union — the authoritative list of tier values |
| `.env.local` | API keys (never paste values in chat or commit to any file) |
| `scripts/setup-github-secrets.sh` | Push keys to GitHub Actions |

## Cursor Cloud specific instructions

- Single Next.js 16 (Turbopack) app. Dependencies install via `npm install`; `.npmrc` sets `legacy-peer-deps=true`, so non-npm package managers will mis-resolve peers — use npm.
- The app runs fully on committed pipeline data (`lib/data/generated/`), so `npm run dev` and `npm run build` work without API keys for read-only verification.
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
