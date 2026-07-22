/**
 * Append-only regression guards — manifest must match on-disk category content;
 * controversies/endorsements/orgVoteLinks require top-level status.
 */

/** Frozen bad: manifest honest-gap while controversies.json has items (O000172 audit P1). */
export const PROFILE_CATEGORY_KNOWN_BAD_MANIFEST_MISMATCH = {
  bioguideId: 'O000172',
  manifestCategories: { controversies: 'honest-gap' },
  controversies: {
    bioguideId: 'O000172',
    items: [{ id: 'c1', title: 'Example controversy', summary: 'Has content', category: 'Conduct' }],
  },
  expectedManifestStatus: 'filled',
} as const;

/** Frozen bad: empty orgVoteLinks without top-level status (all 7 audit P2). */
export const PROFILE_CATEGORY_KNOWN_BAD_MISSING_STATUS = {
  bioguideId: 'S000033',
  orgVoteLinks: { bioguideId: 'S000033', links: [] },
} as const;

/** Frozen good: empty category with explicit honest-gap status. */
export const PROFILE_CATEGORY_KNOWN_GOOD_EMPTY_WITH_STATUS = {
  bioguideId: 'S000033',
  orgVoteLinks: { bioguideId: 'S000033', links: [], status: 'honest-gap' },
} as const;

/**
 * Frozen expected manifest status for orgVoteLinks + positions on the 7 locked profiles.
 * W3c (2026-07-19): guards against silent regression of earned honest-gap/filled labels.
 * Append-only — update only when a category is genuinely restored with verified data.
 */
export const LOCKED_PROFILE_ORG_POSITIONS_STATUS_KNOWN_GOOD: Record<
  string,
  { positions: string; orgVoteLinks: string }
> = {
  S000033: { positions: 'honest-gap', orgVoteLinks: 'honest-gap' },
  O000172: { positions: 'filled', orgVoteLinks: 'honest-gap' },
  M000355: { positions: 'filled', orgVoteLinks: 'honest-gap' },
  M001184: { positions: 'honest-gap', orgVoteLinks: 'honest-gap' },
  W000817: { positions: 'honest-gap', orgVoteLinks: 'honest-gap' },
  C001098: { positions: 'filled', orgVoteLinks: 'honest-gap' },
  P000197: { positions: 'honest-gap', orgVoteLinks: 'honest-gap' },
};

/** PILOT_PROFILE_CHECKLIST.md row 5 & 6 for S000033 must not claim "done" when manifest is honest-gap. */
export const PILOT_CHECKLIST_S000033_ROWS_KNOWN_GOOD = {
  pilotBioguideId: 'S000033',
  checklistPath: 'PILOT_PROFILE_CHECKLIST.md',
  rows: [
    { rowNum: 5, mustNotContain: '**done**', manifestCategory: 'orgVoteLinks' as const },
    { rowNum: 6, mustNotContain: '**done**', manifestCategory: 'positions' as const },
  ],
};

/**
 * Said→Did depth target for reference profile (layout spec). Checklist must not claim **done**
 * when on-disk link count is below target (W3d audit 2026-07-19 — docs wrongly claimed 8).
 */
export const PILOT_SAID_DID_DEPTH_KNOWN_GOOD = {
  pilotBioguideId: 'S000033',
  checklistPath: 'PILOT_PROFILE_CHECKLIST.md',
  checklistRowNum: 8,
  targetLinks: 15,
  /** On-disk count at guard wiring — update only when genuinely restored with verified pairs. */
  onDiskLinksAtWiring: 8,
};
