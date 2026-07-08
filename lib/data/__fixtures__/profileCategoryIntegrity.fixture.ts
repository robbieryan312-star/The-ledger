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
