# The Ledger — Progress Log

Agent session log and status checkpoint. Read at the start of every session; update after every completed task.

**Last updated:** 2026-06-24  
**Branch:** `main`  
**Live demo:** https://the-ledger-gamma.vercel.app

---

## Current phase

**Phase 1 — Florida first:** Federal/state FL featured profiles + Palm Beach county demo. Data pipeline uses `lib/data/generated/*.json` (not `/data/` folders yet).

**Next queued (awaiting instruction):** No fetch tasks started. Endpoint configs registered in `.env.local`.

---

## Completed log

| Date | Task | Commit |
|------|------|--------|
| 2026-06-24 | Recovery session merged to `main` (copy, legislation, votes, nav) | `efb6a20` |
| 2026-06-24 | Sync safeguards for FEC/House votes when keys missing | `35b6dfa` |
| 2026-06-24 | `.env.example` template added | `f3e6cbf` |
| 2026-06-24 | Section 7 deployment rule + PROGRESS.md + no-key endpoint configs in `.env.local` | *(this commit)* |

---

## Section 7 — Agent behavior rules

### EVERY SESSION START

- Read `AGENTS.md` and this `PROGRESS.md`
- Confirm `.env.local` keys and endpoint configs present
- Check `lib/data/generated/` for existing snapshots
- Report status before taking action
- Continue from where this log last ended

### DURING WORK

- **One agent at a time. Always.**
- Never auto-start Next.js dev server
- Never auto-start debug or test agents
- Never stop mid-task to ask questions unless blocked on scope/credibility/UX
- If blocked, log it here and move to the next task
- Never propose architecture changes mid-task

### DEPLOYMENT RULE (PRIMARY PRIORITY)

Saving and deploying to the live demo is a **primary priority**, not an afterthought.

**COMMIT AND PUSH AFTER EVERY COMPLETED TASK** — not just at end of session. After every single completed unit of work including:

- Any data file successfully written to `/data/` or `lib/data/generated/`
- Any feature fully implemented
- Any copy or text update applied
- Any bug fixed or error resolved

**Sequence after every completed task:**

1. `git add .`
2. `git commit -m "[specific description of exactly what was just completed]"`
3. `git push origin main`
4. Confirm Vercel deployment triggered
5. Log completion in this `PROGRESS.md`
6. Then immediately begin next task

**Reason:** If Cursor crashes, restarts, or loses context between tasks, every completed unit of work is permanently saved and live on the demo. Nothing gets lost regardless of what happens to the session.

**Never accumulate more than one completed task worth of uncommitted changes at any time.**

### BROWSER PRIORITY

1. REST API endpoint with key in header
2. If blocked, Playwright/Chrome
3. If both fail, log and continue

### DATA PRIORITY

1. Check existing JSON snapshots first
2. If missing, hit REST API
3. If blocked, use browser
4. If all fail, log in this file

### END OF EVERY SESSION

- Update this `PROGRESS.md` with full summary
- `git add .`
- `git commit -m "[descriptive message]"`
- `git push origin main`
- Confirm Vercel deployment triggered
- Stop and await next instruction

---

## Registered no-key endpoints (`.env.local`)

| Variable | URL |
|----------|-----|
| `FARA_ENDPOINT` | https://efts.fara.justice.gov/motd-search/api/documents |
| `USASPENDING_ENDPOINT` | https://api.usaspending.gov/api/v2 |
| `GOVTRACK_ENDPOINT` | https://www.govtrack.us/api/v2 |
| `SENATE_LDA_ENDPOINT` | https://lda.senate.gov/api/v1 |
| `HOUSE_DISCLOSURES_URL` | https://disclosures.house.gov/public_disc/financial-pdfs |
| `SENATE_DISCLOSURES_URL` | https://efts.senate.gov/LATEST/search-index |
| `CENSUS_ENDPOINT` | https://api.census.gov/data |
| `GDELT_ENDPOINT` | https://api.gdeltproject.org/api/v2 |
| `MIT_ELECTIONS_URL` | https://electionlab.mit.edu/data |
| `OPENCORPORATES_ENDPOINT` | https://api.opencorporates.com/v0.4 |

---

## Blockers

| Item | Status |
|------|--------|
| `FEC_API_KEY` / `CONGRESS_API_KEY` in cloud agent | Not in cloud `.env.local` — owner keys on local Mac; snapshots checked into git |
| Senate eFD stock trades | HTTP 503 maintenance |
| ProPublica Congress API | Retired — do not use |
