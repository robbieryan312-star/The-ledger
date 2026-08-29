/**
 * Append-only regression guards — profile migrate must not wipe committed statements/Said→Did
 * on a positions-only re-run (P000197 lost 8 CREC statements in commit 16bc226).
 */

export const PROFILE_MIGRATE_PRESERVE_MINIMUMS = [
  { bioguideId: 'P000197', minStatements: 8, minSaidDidLinks: 1 },
] as const;

/** Frozen bad example: positions refill overwrote committed CREC statements with empty. */
export const PROFILE_MIGRATE_KNOWN_BAD_EMPTY_OVERWRITE = {
  bioguideId: 'P000197',
  statements: { bioguideId: 'P000197', byTopic: {} },
  saidDid: { bioguideId: 'P000197', byTopic: {} },
} as const;

/** Frozen good counter-example: minimum verified counts after restore. */
export const PROFILE_MIGRATE_KNOWN_GOOD_P000197 = {
  bioguideId: 'P000197',
  minStatements: 8,
  minSaidDidLinks: 1,
} as const;

/** Frozen good counter-example: profile-only topic sync does not re-enter the mega-bundle. */
export const PROFILE_MIGRATE_PROFILE_ONLY_SIDECAR = {
  bioguideId: 'T000000',
  byTopic: {
    healthcare: {
      statements: [
        {
          title: 'Mr. TEST. Mr. Speaker, this is a profile-only floor remark about healthcare.',
          displayText: 'This is a profile-only floor remark about healthcare.',
          date: '2026-01-10',
          url: 'https://www.govinfo.gov/app/details/CREC-2026-01-10-pt1-PgH100-1',
          tier: 'official',
          topicId: 'healthcare',
          verbatim: true,
        },
      ],
    },
  },
} as const;
