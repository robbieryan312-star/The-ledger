<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ledger-data-rules -->
# The Ledger — Project Rules

Civic-info Next.js app. Data credibility is the highest priority. Product vision and editorial voice: `PRODUCT_VISION.md`, `.cursor/rules/ledger-editorial-voice.mdc`.

## Data credibility

- **Current office** must come from authoritative feeds (official `.gov`, official-derived datasets like `unitedstates/congress-legislators`) — never hand-typed `inOffice` flags alone.
- **Recency-weighted resolution**: most recent authoritative record wins; older records only for historical summaries (dated, sourced, topic-grouped, newest-first).
- **Source tiers** (visible in UI): Tier 1 official `.gov` → Tier 2 nonpartisan `.org`/research → Tier 3 journalism → Tier 4 speculative. Low-trust (3/4) only when corroborated by multiple sources, always flagged.
- Every claim/vote/fact needs: date, source tier, link, as-of/checked date.
- Do not fabricate facts — show *"No verified record available"* placeholders.
- Never expand hand-written mock data for national coverage; use the real integration pipeline (sync scripts, generated JSON, `officeResolution.ts`).

## Scope priority

1. All federal Congress members
2. Governors/top statewide via state `.gov` / SoS sources
3. Rich featured profiles with real office labels
4. Finance/votes/trades via APIs
5. Local/small elections last

Local profiles (e.g. Palm Beach sheriff) are demo templates only until a local data pipeline exists.

## Build workflow

- Finish integration passes before demo polish unless user explicitly asks to demo.
- Do not launch parallel agents editing the same data files.
- After data changes: `npm run sync:legislators` and `npm run verify:office`.
- Build must pass (`npm run build`). User runs `npm run dev` for demos.

## Decision authority

Routine implementation: proceed without asking. Pause only for scope changes, credibility tradeoffs, or major UX direction changes.

## Reference

- `lib/data/DATA_INTEGRATION_PLAN.md`
- `lib/data/officeResolution.ts`
- `scripts/sync-legislators.ts`
- `scripts/verify-office-resolution.ts`
<!-- END:ledger-data-rules -->
