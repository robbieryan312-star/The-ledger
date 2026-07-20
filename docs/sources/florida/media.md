# Florida — local media (journalists & outlets)

**Scope:** Florida-local journalism only. National wire/national outlets live in
[`docs/OBJECTIVE_SOURCES.md`](../../OBJECTIVE_SOURCES.md) — do not duplicate them here.

**Parent index:** [`docs/sources/florida.md`](../florida.md)

**Pipeline wiring:** outlets listed here must appear in `lib/data/newsFeedRegistry.ts` when used by
`npm run sync:news-rss`. Keys, commands, and destination paths live in
[`docs/FLORIDA_DATA.md`](../../FLORIDA_DATA.md) and [`lib/data/SOURCE_LOOKUP.md`](../../../lib/data/SOURCE_LOOKUP.md) — not in this file.

---

## Approved local outlets

Used by the approved-outlet RSS registry when syncing Florida politician news via
`npm run sync:news-rss`. Same tier/corroboration rules as national media
(`.cursor/rules/ledger-data-policy.mdc`).

| Outlet | Tier | Feed | Status |
|--------|------|------|--------|
| Miami Herald | `media` | miamiherald.com politics RSS | active |
| Tampa Bay Times | `media` | tampabay.com Arc RSS | active |
| Florida Phoenix | `media` | floridaphoenix.com/feed | active |
| Sun Sentinel | `media` | sun-sentinel.com Arc politics RSS | feed unavailable (HTML not XML) |
| Orlando Sentinel | `media` | orlandosentinel.com Arc politics RSS | feed unavailable (timeout) |
| WUSF | `media` | wusf.org politics | feed unavailable (404) |
| WLRN | `media` | wlrn.org politics | feed unavailable (timeout) |

---

## Collection rules (binding)

1. **Verbatim quotes only** — tier `'media'`; corroboration per ledger-data-policy.
2. **Profile News tab path:** RSS primary (`sync:news-rss`) → GDELT secondary → NewsAPI tertiary
   only if plan upgraded. See `docs/AGENT_INDEX.md` §3 — not `ingest:news-fl` for profile tabs.
3. **Adding an outlet:** append a row here **and** register the feed in `newsFeedRegistry.ts` in
   the same session. Do not cite an outlet in code without a row in this file.

---

*Template for other states: `docs/sources/<state>/media.md`*
