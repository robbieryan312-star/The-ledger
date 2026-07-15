# Agent navigation index

Single map of where to read before acting. **Do not** use `docs/archive/` for current policy.

## Session start (mandatory order)

1. `.cursor/rules/ledger-core-rules.mdc` — binding rules for all agents
2. `docs/workflows/AGENT_HANDOFF_LOG.md` — agent handoff log + improvement backlog (**Claude reads this, not chat** — §1.1 J)
3. `PROGRESS.md` — milestones M1–M8, status board, blockers
4. `lib/data/SOURCE_LOOKUP.md` — data need → source → tier → sync command
5. `KEYS.md` — SET vs EMPTY env vars (values in `.env.local` only)
6. `REPO.md` — canonical repo is `The-ledger` on `main`
7. `PILOT_PROFILE_CHECKLIST.md` — what a complete profile requires

Also read when relevant: `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`,
`.cursor/rules/ledger-editorial-voice.mdc`.

## Post-data-change chain

After any data sync or generated JSON change:

```bash
npm run sync:legislators && npm run verify:office && npm run build
```

Vote-sync routing and full sync catalog: `lib/data/SOURCE_LOOKUP.md`.

## Guard suites (17 commands in prebuild + dedicated render-integrity — all must pass before commit)

| Script | Guard |
|--------|-------|
| `test:typecheck` | TypeScript compile (`tsc --noEmit`) |
| `test:crec` | CREC procedural filter |
| `test:org-join` | FEC org/donor join |
| `test:source-integrity` | Source URL + profile integrity |
| `test:copy-compliance` | Editorial voice |
| `test:topic-positions-bundle` | Mega-bundle quality |
| `test:news-registry` | Approved-outlet registry |
| `test:profile-snapshots` | Golden profile snapshots |
| `test:client-bundle` | Client import boundaries |
| `test:docs-integrity` | Doc citations ↔ package.json |
| `test:data-layout` | `data/` layout orphans |
| `test:env-truth` | `.env.example` ↔ code |
| `test:optimization` | syncKernel + manifest + fetch timeout guards |
| `test:docs-consistency` | Doc contradictions (retired scripts, counts, Tier labels, §1.1 cites) |
| `test:governor-identity` | Governor bioguideId ↔ portrait identity guard |
| `test:identity-integrity` | Roster portrait ↔ bioguideId ↔ name/party/state/office |
| `test:render-integrity` | Headless render: overflow, images, sections (dedicated post-build CI/manual guard) |
| `audit:profile-credibility` | Profile credibility audit gate |

Prebuild runs the non-Playwright guard suites plus `audit:profile-credibility`; postbuild runs
`test:client-chunks`. CI runs `test:render-integrity` as a dedicated Playwright step after the
production build. Manual rendered checks still use `npm run test:render-integrity`.

## Agent preflight

```bash
npm run agent:preflight
```

Checks session-start files exist, guard scripts registered, and key npm scripts resolve.

## Setup & operations

| Topic | File |
|-------|------|
| API keys, demo commands, GitHub secrets | `docs/SETUP.md` → `KEYS.md` |
| Canonical repo / branch workflow | `REPO.md` |
| Architecture & data flow | `ARCHITECTURE.md` |
| Integration roadmap | `ARCHITECTURE.md` (§ Data integration) |
| Machine-readable source catalog | `lib/data/sourceCatalog.ts` |
| National data snapshots | `data/national/README.md` |
| Canonical sync paths | `scripts/lib/dataPaths.ts` |

## Workflows

| Topic | File |
|-------|------|
| **Agent handoff log (mandatory end-of-turn — §1.1 J)** | `docs/workflows/AGENT_HANDOFF_LOG.md` |
| Batch scaling (M2) | `docs/workflows/BATCH_SCALING.md` |
| Florida state data ingest | `docs/FLORIDA_DATA.md` |
| Product vision & voice | `PRODUCT_VISION.md` |
| Profile build pipeline (Phase E) | `scripts/profile-build.ts` |

## Data layer

| Topic | File |
|-------|------|
| Generated JSON (build-time) | `lib/data/generated/` |
| Per-destination profiles (migrated) | `lib/data/generated/profiles/{bioguideId}/` |
| Accessors (import these in app code) | `lib/data/*.ts` |
| National votes/fec snapshots | `data/national/votes/`, `data/national/fec/` |
| Raw Florida snapshots (not imported by Next.js) | `data/florida/` |
| Guard suites | `scripts/__tests__/` |

## Historical (archive only)

| File | Notes |
|------|-------|
| `docs/archive/DATA_SOURCES.md` | Pre-DNU mock framing |
| `docs/archive/progress-screenshots.md` | 2026-06-23 screenshots (caption tier labels outdated) |
| `docs/archive/FUTURE_ROADMAP.md` | Idea backlog — not scheduled work |
| `docs/archive/STATE_COUNTY_EXPANSION.md` | Deferred local expansion proposal |
