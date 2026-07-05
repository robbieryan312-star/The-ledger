# API Keys Setup — The Ledger

## What is `.env.local`?

A plain-text file in the project root that holds your API keys. It is **gitignored** — never committed. Copy `.env.example` to `.env.local` and fill in values.

## Two ways to provide keys

**A) Paste in chat** — tell the agent which keys you have. The agent writes them to `.env.local` for you.

**B) Edit yourself** — create or edit `.env.local` directly, then tell the agent: *"keys are in .env.local"*.

Prefer **B** when you can — keys stay out of chat history.

## Keys

| Key | Signup URL | What it powers | Status |
|-----|------------|----------------|--------|
| `FEC_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | Campaign finance sync (`npm run sync:fec`) | have / need |
| `CONGRESS_API_KEY` | [api.congress.gov/sign-up](https://api.congress.gov/sign-up/) | House roll-call votes (`npm run sync:votes`) | have / need |
| ProPublica Congress API | — | — | **retired** — do not use |

> `FEC_API_KEY` and `CONGRESS_API_KEY` are **different services**. A key from api.data.gov does **not** work for Congress.gov.

Mark **have** or **need** in the table as you go.

## After adding keys

```bash
npm run sync:fec          # campaign finance snapshot
npm run sync:votes        # roll-call vote snapshot
npm run sync:legislators  # federal roster (no key required)
npm run verify:office     # check office resolution
npm run build             # confirm app builds
```

## Security

- **Never commit** `.env.local` or paste keys into tracked files.
- **Prefer** editing `.env.local` over pasting keys in chat.
- **Rotate** any key you pasted in chat — treat chat as semi-public.

## Optional later

| Key | Signup URL | What it would power |
|-----|------------|---------------------|
| OpenSecrets API | [opensecrets.org/open-data](https://www.opensecrets.org/open-data/) | Lobbyist / industry breakdowns (not wired yet) |
