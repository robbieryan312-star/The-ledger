# The Ledger — canonical repository

**One repo. One history. One place agents read before acting.**

| Item | Value |
|------|--------|
| **Canonical GitHub repo** | [github.com/robbieryan312-star/The-ledger](https://github.com/robbieryan312-star/The-ledger) |
| **Default branch** | `main` |
| **Production URL (sole Vercel project)** | https://the-ledger-s4dn.vercel.app — project name `the-ledger-s4dn` only; owner deleted all other Vercel projects (2026-07-20) |
| **Local clone** | Any folder name is fine — remote must be `The-ledger` |
| **Legacy repo (do not use)** | `robbieryan312-star/code` — stale snapshot; superseded by `The-ledger` |

---

## Why multiple folders existed

Cursor Cloud and local sessions often spawn **new workspace directories** (e.g. `code-claude-cool-ride-iomjzf`) to limit context size. That split history and caused agents to **re-ask for email, keys, and scope** already documented in this repo.

**Rule:** Open **one** clone pointed at `The-ledger` / `main`. Do not start new GitHub repos for the same app.

---

## Session start (agents — mandatory)

Read **in order** before implementing or asking the owner anything:

1. `.cursor/rules/ledger-pre-ingest.mdc` — **before every owner/Claude instruction and every response** (keys/EMPTY/RETIRED confusion ban)
2. `.cursor/rules/ledger-core-rules.mdc` — binding rules (all agents)
3. `docs/workflows/AGENT_HANDOFF_LOG.md` — agent handoff log + improvement backlog (Claude reads this, not chat)
4. `PROGRESS.md` — milestones M1–M8, status board, blockers
5. `lib/data/SOURCE_LOOKUP.md` — data need → source → tier → sync command
6. `KEYS.md` — which env vars are SET vs EMPTY (values only in `.env.local`)
7. `REPO.md` — canonical repo is `The-ledger` on `main`
8. `PILOT_PROFILE_CHECKLIST.md` — what a complete profile requires

Navigation index: `docs/AGENT_INDEX.md`. Task-specific: `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`.

Do **not** use `docs/archive/` for current policy. Do **not** re-derive owner expectations from memory. Do **not** ask for email (`robbie.ryan312@gmail.com` is in `KEYS.md`). VoteSmart is **RETIRED/DEFUNCT** — never request a key. Checklist `EMPTY` is not an owner debt — see `ledger-pre-ingest.mdc`. Do **not** treat OpenSecrets as a blocker — see deferred sources in `SOURCE_LOOKUP.md`.

---

## Where development continues

See `PROGRESS.md` → **Status board**. Summary:

| Milestone | Focus |
|-----------|--------|
| **M1** (in flight) | Hardening: DNU quarantine, guards, RSS news, bundle reprocess, client-bundle split |
| **M2** | Scale to 537 in reviewed batches — `docs/workflows/BATCH_SCALING.md` |
| **M3–M8** | Follow the Money depth, controversies, SEO, scheduled refresh, launch |

Full source catalog: `lib/data/sourceCatalog.ts`.

---

## Branch workflow

- **`main`** — integration branch; owner may direct commits here (consolidated history).  
- **Feature branches** — optional for large reviews; merge to `main` when complete.  
- **`npm run build`** must pass before any commit.

---

## Cursor / Claude split

| Role | Reads | Does |
|------|--------|------|
| Owner + Claude Code (PM) | Same session-start files | Briefs, priorities, scope |
| Cursor agent | Same session-start files | Code, syncs, builds |

Both use **this repo only** — no parallel `code` repo.
