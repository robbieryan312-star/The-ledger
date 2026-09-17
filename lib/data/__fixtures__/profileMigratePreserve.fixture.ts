/**
 * Append-only regression guards — profile migrate must not wipe committed statements/Said→Did
 * on a positions-only re-run (P000197 lost 8 CREC statements in commit 16bc226).
 * Same-topic subject-overlap guard (2026-09-17): prior P000197 saidDid=1 row was a broad-topic
 * false pair, so the on-disk minimum protects statements only until a verified pair is restored.
 */

export const PROFILE_MIGRATE_PRESERVE_MINIMUMS = [
  { bioguideId: 'P000197', minStatements: 8, minSaidDidLinks: 0 },
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
  minSaidDidLinks: 0,
} as const;
