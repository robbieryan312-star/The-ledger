# Cursor Work Log — Audit & Debt Remediation

**Living file.** Cursor updates + **commits** this after **every** work/verify session (§1.1 J).
Claude Code reads **this file**, not chat. Only the **last 3 session entries** are kept below.

**Current state (2026-07-09):**
- Branch: `cursor/florida-summaries-sample-70a6`
- HEAD: `061f181`
- PR: https://github.com/robbieryan312-star/The-ledger/pull/19
- Tree: clean · prebuild + build: **green**
- Parent branch: `cursor/florida-state-page-4114` @ `fa9eac8`

---

## Latest session — FL court/LegiScan 10-item samples (BLOCKED partial)

### Objective

Phase 1: investigate CourtListener detail fields; run 10-opinion + 10-bill
verified samples; STOP for Claude review before scaling.

### Verdict / outcome

**PARTIAL PASS / BLOCKED on LegiScan live sample.** Court 10-opinion sample
completed (search-only; no `COURTLISTENER_API_KEY` in cloud). LegiScan 10-bill
sample **not run** — `LEGISCAN_API_KEY` empty; Cloudflare blocks automated
registration. Detail-endpoint enrichment code shipped; awaits owner keys + CAPTCHA.

### Commits

- (this commit) `4356f2f` — FL summary sample ingest + CourtListener detail wiring

### Commands run (this session)

- `npm run test:source-integrity` → exit 0 (85 tests)
- `npm run ingest:courts-fl -- --limit 10` → 10 records, holding=0 extractive=5 fallback=5, detail=false
- `npm run build:data-slices` → exit 0
- `npm run prebuild` → exit 0
- `npm run build` → exit 0
- CourtListener detail probe: `curl clusters/10919893/` → 401 without token
- CourtListener search probe: `curl search/?court=fla&page_size=1` → syllabus/posture empty; snippet truncated

### Files touched

| Path | Action | What changed |
|------|--------|--------------|
| `scripts/lib/courtListenerDetail.ts` | created | cluster/opinion detail fetch with field selection |
| `scripts/lib/courtListenerSummary.ts` | modified | headnotes/summary/disposition/plain_text priority; caption guards |
| `scripts/ingest/florida/ingest-courtlistener-florida.ts` | modified | `--limit`, optional detail enrichment, quality counters |
| `scripts/ingest/florida/ingest-legiscan-florida.ts` | modified | `--limit` / `--list-limit` for samples |
| `scripts/__tests__/courtListenerSummary.test.ts` | modified | headnotes + plain_text tests |
| `data/florida/courts/florida-court-opinions.json` | modified | 10-record sample snapshot |
| `lib/data/generated/slices/judiciary-courts.json` | modified | slice rebuild |
| `.env.example`, `KEYS.md` | modified | `COURTLISTENER_API_KEY` documented |

### Acceptance evidence

**CourtListener investigation (Task 1):**
- `/search/` (no auth): `syllabus`, `posture`, `procedural_history`, `opinions[].snippet`, `cluster_id`, `opinions[].id`
- `/clusters/{id}/` (auth required): `syllabus`, `posture`, `procedural_history`, `headnotes`, `summary`, `disposition`, `history`, `correction`, `cross_reference`, `other_dates`, `sub_opinions`
- `/opinions/{id}/` (auth required): `plain_text`, `html_with_citations`, `type`, `download_url`, `opinions_cited`, `ordering_key`
- Live FL search sample: all 10 had empty `syllabus`/`posture`/`procedural_history`

**Court 10-sample (Task 2):** holding-level 0 · extractive (snippet) 5 · fallback 5 · inferred outcomes 0

**LegiScan 10-sample (Task 3):** **BLOCKED** — no `LEGISCAN_API_KEY`; ingest preserves existing JSON

### Open / next

- Owner: complete CourtListener CAPTCHA registration → set `COURTLISTENER_API_KEY`; provide `LEGISCAN_API_KEY`
- Claude review samples; on PASS scale 10→30→full (court) and 10→30→100 (bills)
- Re-run court sample with detail enrichment once token set (expect `plain_text` tier upgrades)

---

## Session log (last 3 only)

### 3 — FL summary samples (2026-07-09)

Court 10-sample search-only; LegiScan blocked on keys.

### 2 — Credibility gate landed (2026-07-09)

PR #17 merged `d463bc4`.

### 1 — Credibility audit continuous gate (2026-07-09)

Branch `cursor/credibility-audit-gate-4114`.
