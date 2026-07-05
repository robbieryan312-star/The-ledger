# Agent navigation index

Single map of where to read before acting. **Do not** use `docs/archive/` for current policy.

## Session start (mandatory order)

1. `.cursor/rules/ledger-core-rules.mdc` — binding rules for all agents
2. `PROGRESS.md` — milestones M1–M8, status board, blockers
3. `lib/data/SOURCE_LOOKUP.md` — data need → source → tier → sync command
4. `KEYS.md` — SET vs EMPTY env vars (values in `.env.local` only)
5. `PILOT_PROFILE_CHECKLIST.md` — what a complete profile requires

Also read when relevant: `REPO.md`, `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`,
`.cursor/rules/ledger-editorial-voice.mdc`.

## Setup & operations

| Topic | File |
|-------|------|
| API keys, demo commands, GitHub secrets | `docs/SETUP.md` → `KEYS.md`, `OWNER_SETUP.md` |
| Canonical repo / branch workflow | `REPO.md` |
| Architecture & data flow | `ARCHITECTURE.md` |
| Integration roadmap | `lib/data/DATA_INTEGRATION_PLAN.md` |
| Machine-readable source catalog | `lib/data/sourceCatalog.ts` |

## Workflows

| Topic | File |
|-------|------|
| Batch scaling (M2) | `docs/workflows/BATCH_SCALING.md` |
| Florida state data ingest | `docs/FLORIDA_DATA.md` |
| Product vision & voice | `PRODUCT_VISION.md` |

## Data layer

| Topic | File |
|-------|------|
| Generated JSON (build-time) | `lib/data/generated/` |
| Accessors (import these in app code) | `lib/data/*.ts` |
| Raw Florida snapshots (not imported by Next.js) | `data/<source>/florida-*.json` |
| Guard suites | `scripts/__tests__/` |

## Historical (archive only)

| File | Notes |
|------|-------|
| `docs/archive/DATA_SOURCES.md` | Pre-DNU mock framing |
| `docs/progress/README.md` | 2026-06-23 screenshots (caption tier labels outdated) |
