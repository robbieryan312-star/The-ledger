/**
 * Append-only fixtures for approvedSourceMatrixGuard.
 * Fixtures only grow — never reset.
 */

/** Known-GOOD: wired catalog source that appears in the OBJECTIVE_SOURCES matrix. */
export const APPROVED_MATRIX_KNOWN_GOOD = {
  catalogId: 'fec',
  nameFragment: 'OpenFEC',
  mustAppearInObjective: 'OpenFEC',
};

/**
 * Known-BAD: a wired source that is absent from the approved matrix.
 * Used only inside the guard test (injected synthetically) — must never ship in SOURCE_CATALOG.
 */
export const APPROVED_MATRIX_KNOWN_BAD = {
  catalogId: 'zzzx-qorv-9',
  name: 'Zzzx Qorv Nine',
  status: 'integrated' as const,
};

/**
 * Known-BAD: a wired source that shares an approved host but has no approved source identity.
 * Guards against URL/host substring collisions passing as matrix membership.
 */
export const APPROVED_MATRIX_HOST_COLLISION_BAD = {
  catalogId: 'shadow-feed-x',
  name: 'Unapproved Shadow Feed',
  status: 'integrated' as const,
  url: 'https://api.congress.gov/shadow-feed',
};

/** Catalog statuses that count as "wired" for matrix membership. */
export const APPROVED_MATRIX_WIRED_STATUSES = ['integrated', 'pilot'] as const;
