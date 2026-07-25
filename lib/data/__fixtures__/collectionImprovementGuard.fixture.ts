/**
 * Append-only fixtures for collectionImprovementGuard.
 * Frozen 2026-07-25 — collection output under lib/data/generated/** must ship with a
 * BATCH_SCALING.md improvement-log row (same diff vs main).
 */

/** Paths that count as collection data (not TypeScript accessors). */
export const COLLECTION_DATA_PATH_PREFIXES = [
  'lib/data/generated/profiles/',
  'lib/data/generated/countyMap/',
  'lib/data/generated/slices/',
] as const;

export const COLLECTION_DATA_EXACT_FILES = ['lib/data/generated/newsNational.json'] as const;

export const BATCH_SCALING_PATH = 'docs/workflows/BATCH_SCALING.md';

/** Known-GOOD: collection data change + improvement log row in the same diff. */
export const COLLECTION_IMPROVEMENT_KNOWN_GOOD = {
  label: 'data-with-batch-scaling-row',
  changedFiles: [
    'lib/data/generated/profiles/S000033/news.json',
    'docs/workflows/BATCH_SCALING.md',
  ] as const,
  expect: 'pass' as const,
};

/** Known-BAD: collection data without BATCH_SCALING.md touch (regression this guard catches). */
export const COLLECTION_IMPROVEMENT_KNOWN_BAD = {
  label: 'data-without-batch-scaling-row',
  changedFiles: ['lib/data/generated/profiles/S000033/news.json'] as const,
  expect: 'fail' as const,
};

/** Known-GOOD skip: no collection data in the diff → guard is a no-op. */
export const COLLECTION_IMPROVEMENT_KNOWN_SKIP = {
  label: 'no-generated-data-change',
  changedFiles: ['scripts/__tests__/collectionImprovementGuard.test.ts'] as const,
  expect: 'skip' as const,
};
