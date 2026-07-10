# The Ledger

Political transparency platform — verified, sourced facts on what officials said versus what they did.

**Canonical repo:** [The-ledger](https://github.com/robbieryan312-star/The-ledger) on `main` — see **`REPO.md`**.

## Start here

| Doc | Purpose |
|-----|---------|
| [`REPO.md`](./REPO.md) | Repo identity, session-start read order, branch workflow |
| [`PROGRESS.md`](./PROGRESS.md) | Milestones, status board, blockers |
| [`docs/AGENT_INDEX.md`](./docs/AGENT_INDEX.md) | Navigation map for agents (canonical index) |
| [`docs/SETUP.md`](./docs/SETUP.md) | Keys, sync commands, local dev |
| [`.cursor/rules/ledger-core-rules.mdc`](./.cursor/rules/ledger-core-rules.mdc) | Binding rules (all agents) |

## Quick commands

```bash
npm install
npm run dev          # owner: port 3000; agents: npm run dev -- -p 4100
npm run build        # prebuild guards + production build
npm run verify:office
```

## Architecture

Static JSON at build time — no runtime database. See **`ARCHITECTURE.md`**.
