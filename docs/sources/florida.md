# Florida — state-specific sources (index)

**Binding scope:** This tree holds **Florida-local journalists** and **Florida-native information
providers** only. It does **not** list API keys, multi-state vendors, or pipeline commands.

| Need | Go to the ONE owner |
|------|---------------------|
| FL local media / journalists | [`docs/sources/florida/media.md`](./florida/media.md) |
| FL state agencies & state-hosted providers | [`docs/sources/florida/agencies.md`](./florida/agencies.md) |
| API keys (SET/EMPTY) | `KEYS.md` |
| Key → data need routing (all states) | `docs/OBJECTIVE_SOURCES.md` key matrix |
| Commands, scripts, output paths | `docs/FLORIDA_DATA.md` + `lib/data/SOURCE_LOOKUP.md` |
| National / federal approved sources | `docs/OBJECTIVE_SOURCES.md` only |

**Agent rule:** When collecting for Florida, open the sub-file for the conduit you are filling
(media vs state-native agency). Do not hunt local outlets in the national constitution. Do not
document API keys in this tree — keys are account-wide, not state-specific.

**Runbook:** `docs/AGENT_INDEX.md` §3 (news fallback order) · `docs/PILOT_STATE_CHECKLIST.md` (FL pilot conduits)

---

## Sub-files

| File | Contents |
|------|----------|
| [`florida/media.md`](./florida/media.md) | Approved FL local outlets + RSS registry alignment |
| [`florida/agencies.md`](./florida/agencies.md) | FLDOE, state `.gov`, FL lobbyist dirs, FL-published tables |

---

## Scaling template (other states)

Copy this structure for each new state code:

```
docs/sources/<state>.md          ← index (no keys, no vendors)
docs/sources/<state>/media.md    ← local journalists only
docs/sources/<state>/agencies.md ← state-native providers only
```

Pipeline scripts and keys stay in `docs/<STATE>_DATA.md` (or `FLORIDA_DATA.md` pattern) and
`lib/data/SOURCE_LOOKUP.md` — never in the state source sub-files.
