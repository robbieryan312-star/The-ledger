# Owner Setup — The Ledger (~10 minutes)

Quick steps so agents can sync real data and you can demo reliably. See also `API_KEYS.md` and `AGENTS.md`.

---

## 1. API keys — `.env.local`

**Path:** project root — `/Users/robertryan/Downloads/code-claude-cool-ride-iomjzf/.env.local`

**Format** (copy from `.env.example`):

```env
FEC_API_KEY=your_key_here
CONGRESS_API_KEY=your_key_here
```

| Key | Where to get it | Powers |
|-----|-----------------|--------|
| `FEC_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | `npm run sync:fec` |
| `CONGRESS_API_KEY` | [api.congress.gov/sign-up](https://api.congress.gov/sign-up/) | House votes in `npm run sync:votes` |

You already have both keys configured. **Do not paste key values into chat or git.**

**Alternative:** paste keys in agent chat once and say *"write these to .env.local"* — works, but editing the file yourself keeps keys out of chat history.

Tell the agent: *"keys are in .env.local"* when starting a session.

---

## 2. Git snapshot (recommended, optional)

Versioning helps you roll back. The agent **will not commit** unless you run these yourself.

```bash
cd /Users/robertryan/Downloads/code-claude-cool-ride-iomjzf
git add .
git commit -m "Initial Ledger snapshot"
```

Skip this if you do not want version control yet. `.env.local` stays gitignored.

---

## 3. Stable demo — Vercel (optional)

One-time deploy for a shareable URL (not required for local demos).

1. Sign up: [vercel.com/signup](https://vercel.com/signup)
2. From project root:

```bash
npm run build
npx vercel
```

Follow prompts (link to your Vercel account, confirm project). Add `FEC_API_KEY` and `CONGRESS_API_KEY` in the Vercel dashboard → Project → Settings → Environment Variables if you want live syncs on deploy.

---

## 4. When YOU demo locally

Run the dev server in **your own Terminal** (not the agent's — agent-started servers get reaped):

```bash
cd /Users/robertryan/Downloads/code-claude-cool-ride-iomjzf
npm run dev
```

Leave that terminal open. Open [http://localhost:3000](http://localhost:3000).

---

## 5. API keys to get LATER (not tonight)

| Key | When | URL |
|-----|------|-----|
| OpenSecrets | When we wire lobbying/industry imports | [opensecrets.org/open-data/api](https://www.opensecrets.org/open-data/api) |

**Already done:** FEC, Congress.gov. **Do not pursue:** ProPublica Congress API (retired).

---

## 6. What NOT to do

- **Do not** run a separate Claude session to harvest random political APIs — use our pipeline: `npm run sync:*` scripts in `scripts/`.
- **Do not** paste API keys into public repos, PRs, or tracked files.
- **Do not** ask the agent to commit unless you explicitly want a git snapshot (see §2).

---

## 7. Refresh all data (optional)

Run when you want the latest roster, finance, votes, and STOCK Act filings:

```bash
npm run sync:legislators && npm run sync:fec && npm run sync:votes && npm run sync:stock-trades
npm run verify:office
npm run build
```

`sync:legislators` needs no key. Senate PTR sync may fail during Senate eFD maintenance — retry `sync:stock-trades` later.

---

## Quick reference

| Task | Command |
|------|---------|
| Local demo | `npm run dev` (your terminal) |
| Refresh data | sync block above |
| Check office labels | `npm run verify:office` |
| Production build | `npm run build` |
