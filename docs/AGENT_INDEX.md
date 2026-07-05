# Agent navigation index

Single map of where to read before acting. **Do not** use `docs/archive/` for current policy.

## Session start (mandatory order)

Before advising, coding, syncing data, or asking the owner for keys/email/scope, read **in order**:

1. `.cursor/rules/ledger-core-rules.mdc`
2. `PROGRESS.md`
3. `lib/data/SOURCE_LOOKUP.md`
4. `KEYS.md`

Also read when relevant: `REPO.md`, `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`,
`.cursor/rules/ledger-editorial-voice.mdc`.

## Setup & operations

| Topic | File |
|-------|------|
| API keys, demo commands, GitHub secrets | `KEYS.md`, `docs/SETUP.md`, `OWNER_SETUP.md` |
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
