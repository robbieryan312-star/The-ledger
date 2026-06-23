# Cursor SDK agent scripts

These scripts run **local** Cursor agents against this repo via `@cursor/sdk` (on your machine, not a cloud VM).

## Setup

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
export CURSOR_API_KEY=<your-cursor-api-key>
```

Get an API key from [Cursor Settings](https://cursor.com/settings) (or your team's documented key source).

## Commands

From the project root:

```bash
npm run agent:verify   # build + map/search/county review (streams output)
npm run agent:demo     # one-shot demo route / ZIP 33426 check
```

Run the dev server in a **separate terminal** before `agent:demo` if you want live HTTP checks:

```bash
npm run dev
```

## Exit codes

- `0` — success
- `1` — startup failure (`CursorAgentError`, missing `CURSOR_API_KEY`, etc.)
- `2` — agent run started but finished with `status: "error"`
