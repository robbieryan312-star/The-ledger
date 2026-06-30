# The Ledger — canonical repository

**One repo. One history. One place agents read before acting.**

| Item | Value |
|------|--------|
| **Canonical GitHub repo** | [github.com/robbieryan312-star/The-ledger](https://github.com/robbieryan312-star/The-ledger) |
| **Default branch** | `main` |
| **Local clone** | Any folder name is fine — remote must be `The-ledger` |
| **Legacy repo (do not use)** | `robbieryan312-star/code` — stale snapshot; superseded by `The-ledger` |

---

## Why multiple folders existed

Cursor Cloud and local sessions often spawn **new workspace directories** (e.g. `code-claude-cool-ride-iomjzf`) to limit context size. That split history and caused agents to **re-ask for email, keys, and scope** already documented in this repo.

**Rule:** Open **one** clone pointed at `The-ledger` / `main`. Do not start new GitHub repos for the same app.

---

## Session start (agents — mandatory)

Read **in order** before implementing or asking the owner anything:

1. `PROGRESS.md` — current phase, blockers, what’s done  
2. `lib/data/SOURCE_LOOKUP.md` — data need → source → tier → sync command  
3. `KEYS.md` — which env vars are SET vs EMPTY (values only in `.env.local`)  
4. `AGENTS.md` + `.cursor/rules/ledger-data-policy.mdc` — credibility and scope  

Do **not** re-derive owner expectations from memory. Do **not** ask for email (`robbie.ryan312@gmail.com` is in `KEYS.md`). Do **not** treat VoteSmart or OpenSecrets as blockers — see deferred sources in `SOURCE_LOOKUP.md`.

---

## Where development continues

See `PROGRESS.md` → **Next priorities**. Summary:

| Phase | Focus |
|-------|--------|
| 16 | `ingest:member-all` — 537 deep bill files |
| 17a | S000033 pilot — GovInfo CREC + FEC Schedule A org→topic votes |
| 17b | Scale pilot pipelines to all 537 members |

Full source catalog: `lib/data/sourceCatalog.ts`.

---

## Branch workflow (updated)

- **`main`** — integration branch; owner may direct commits here (consolidated history).  
- **Feature branches** — optional for large reviews; merge to `main` when complete.  
- **`npm run build`** must pass before commit.

---

## Cursor / Claude split

| Role | Reads | Does |
|------|--------|------|
| Owner + Claude Code (PM) | Same session-start files | Briefs, priorities, scope |
| Cursor agent | Same session-start files | Code, syncs, builds |

Both use **this repo only** — no parallel `code` repo.
