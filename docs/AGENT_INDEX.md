# Agent navigation index

Single map of where to read before acting. **Do not** use `docs/archive/` for current policy.

## Session start (mandatory order)

1. `.cursor/rules/ledger-core-rules.mdc` — binding rules for all agents
2. `PROGRESS.md` — milestones M1–M8, status board, blockers
3. `lib/data/SOURCE_LOOKUP.md` — data need → source → tier → sync command
4. `KEYS.md` — SET vs EMPTY env vars (values in `.env.local` only)
5. `REPO.md` — canonical repo is `The-ledger` on `main`
6. `PILOT_PROFILE_CHECKLIST.md` — what a complete profile requires

Also read when relevant: `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`,
`.cursor/rules/ledger-editorial-voice.mdc`.

## Post-data-change chain

After any data sync or generated JSON change:

```bash
npm run sync:legislators && npm run verify:office && npm run build
```

Vote-sync routing and full sync catalog: `lib/data/SOURCE_LOOKUP.md`.

## Guard suites (11 — all must pass before commit)

| Script | Guard |
|--------|-------|
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

Prebuild runs all 11; CI: `.github/workflows/guards.yml`.

## Agent preflight

```bash
npm run agent:preflight
```

Checks session-start files exist, guard scripts registered, and key npm scripts resolve.

## Setup & operations

| Topic | File |
|-------|------|
| API keys, demo commands, GitHub secrets | `docs/SETUP.md` → `KEYS.md`, `OWNER_SETUP.md` |
| Canonical repo / branch workflow | `REPO.md` |
| Architecture & data flow | `ARCHITECTURE.md` |
| Integration roadmap | `lib/data/DATA_INTEGRATION_PLAN.md` |
| Machine-readable source catalog | `lib/data/sourceCatalog.ts` |
| National data snapshots | `data/national/README.md` |
| Canonical sync paths | `scripts/lib/dataPaths.ts` |

## Workflows

| Topic | File |
|-------|------|
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
| `docs/progress/README.md` | 2026-06-23 screenshots (caption tier labels outdated) |
