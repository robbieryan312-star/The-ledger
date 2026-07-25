/**
 * Append-only fixtures for the retired-NPAT purge guard.
 * Fixtures only grow — never reset.
 *
 * Banned host strings are stored base64-encoded so this fixture file itself
 * does not contain the contiguous purge token (criterion A).
 */

/** Documented survivors (enforced via git pathspecs in the guard test). */
export const RETIRED_NPAT_PURGE_ALLOWED_SURVIVOR_NOTES = [
  'scripts/__tests__/*RetiredGuard.test.ts — guard mechanism',
  'docs/archive/** — historical archive',
  'docs/workflows/AGENT_HANDOFF_LOG.md — append-only work record',
  'docs/workflows/BATCH_SCALING.md — historical improvement rows',
  'docs/workflows/IMPROVEMENT_BACKLOG.md — historical backlog rows',
  'docs/OBJECTIVE_SOURCES.md — exactly one canonical Retired sources line',
] as const;

/**
 * Known-BAD reintroduction: retired NPAT API host in sync-topic-positions.
 * Decode bannedSubstringBase64 → ascii host; must never appear in live sync.
 */
export const RETIRED_NPAT_PURGE_KNOWN_BAD_REINTRODUCTION = {
  label: 'retired NPAT API host reintroduced into sync-topic-positions (must never ship)',
  /** base64 of the banned API host — decode only inside the guard test */
  bannedSubstringBase64: 'YXBpLnZvdGVzbWFydC5vcmc=',
  bannedInRelativePath: 'scripts/sync-topic-positions.ts',
};

/**
 * Known-GOOD: OBJECTIVE_SOURCES.md carries exactly one contiguous purge-token match.
 */
export const RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT = {
  path: 'docs/OBJECTIVE_SOURCES.md',
  expectedCount: 1,
  mustInclude: 'Retired sources — never request a key, never re-add:',
};
