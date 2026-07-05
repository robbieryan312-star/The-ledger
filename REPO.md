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

Before advising, coding, syncing data, or asking the owner for keys/email/scope, read **in order**:

1. `.cursor/rules/ledger-core-rules.mdc`
2. `PROGRESS.md`
3. `lib/data/SOURCE_LOOKUP.md`
4. `KEYS.md`

Task-specific: `AGENTS.md`, `.cursor/rules/ledger-data-policy.mdc`, `.cursor/rules/ledger-editorial-voice.mdc`. Do **not** use `docs/archive/` for current policy.

Navigation index: `docs/AGENT_INDEX.md`. Canonical repo: `The-ledger` / `main` (see `REPO.md`).

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
