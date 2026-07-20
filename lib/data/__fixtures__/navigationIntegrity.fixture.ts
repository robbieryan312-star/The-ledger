/**
 * Frozen fixtures for navigationIntegrity guard — append-only regression evidence.
 */

/** A file explicitly wired in AGENT_INDEX §1 — must always pass reachability (GOOD). */
export const NAVIGABLE_FILE_KNOWN_GOOD = {
  path: 'docs/workflows/FILE_AUDIT_LEDGER.md',
  reason: 'AGENT_INDEX §1 session-start item 12; agent-preflight required',
};

/** Hypothetical unwired path — guard logic must classify as orphan (BAD pattern). */
export const ORPHAN_PATH_KNOWN_BAD = {
  path: 'scripts/__fixtures__/NAVIGATION_ORPHAN_NEVER_WIRE_THIS.ts',
  description:
    'deliberately unwired path — no AGENT_INDEX cite, no npm/CI entry, not in archive inventory',
};
