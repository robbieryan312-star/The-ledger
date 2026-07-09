# Cursor Work Log — Audit & Debt Remediation

**Living file.** Cursor updates + **commits** this after **every** work/verify session (§1.1 J).

**Current state (2026-07-09):**
- Branch: `cursor/florida-summaries-sample-70a6`
- HEAD: (pending commit)
- PR: https://github.com/robbieryan312-star/The-ledger/pull/19
- Tree: dirty · prebuild + build: **green**

---

## Latest session — Remove court summarization; verbatim metadata only (COMPLETE)

### Objective

Stop extractive court-opinion summarization; present CourtListener metadata exactly as
provided. Verify `COURTLISTENER_API_KEY` per KEYS.md.

### Verdict / outcome

**COMPLETE** on code/UI change. **Key verify FAIL in cloud:** `.env.local` has comments only
(no `COURTLISTENER_API_KEY=` value line). Ingest: 0/10 verbatim metadata, 10 title+status
fallback. Owner machine KEYS.md lists SET — cloud session does not have the value.

### Commands run (this session)

- `npm run test:source-integrity` → 85 pass
- `npm run ingest:courts-fl -- --limit 10` → 0 verbatim / 10 fallback, detail=false
- `npm run build:data-slices` → exit 0
- `npm run prebuild` + `npm run build` → exit 0

### Files touched

| Path | Action | What changed |
|------|--------|--------------|
| `scripts/lib/courtListenerSummary.ts` | modified | `pickCourtSourceText` verbatim only; no snippet/plain_text |
| `scripts/ingest/florida/ingest-courtlistener-florida.ts` | modified | cluster detail only; no opinion extractive |
| `components/states/FloridaCourtDecisionRow.tsx` | modified | case name headline; verbatim metadata in expand |
| `scripts/build-data-slices.ts` | modified | court row title = caseName |
| `scripts/__tests__/courtListenerSummary.test.ts` | modified | snippet ignored tests |
| `.github/workflows/refresh-data.yml` | modified | `COURTLISTENER_API_KEY` secret |
| `scripts/setup-github-secrets.sh` | modified | push `COURTLISTENER_API_KEY` |
| `data/florida/courts/florida-court-opinions.json` | modified | 10-sample, no extractive summaries |

### Acceptance evidence

- No `leadSummary` / `trimToWordBoundary` / snippet path in court pipeline
- 10-sample: all records lack `summary` field; `summaryFallback` only
- Build green

### Open / next

- Owner: ensure `COURTLISTENER_API_KEY=<token>` is a real line in cloud `.env.local` (not comment)
- Re-run `npm run ingest:courts-fl -- --limit 10` with key to populate verbatim cluster fields

---

## Session log (last 3 only)

### 3 — Verbatim court metadata only (2026-07-09)

Removed extractive summarization; cloud key still missing.

### 2 — FL summary samples (2026-07-09)

Court 10-sample search-only; LegiScan blocked on keys.

### 1 — Credibility gate landed (2026-07-09)

PR #17 merged `d463bc4`.
