/**
 * Frozen regression evidence for Wave 1 data-loss prevention (audit DATA-02..05, SYNC-01).
 * Append-only. The defect class: a failed/keyless re-fetch overwrote a prior fetched-live
 * snapshot with nulls / empty records / honest-gap, destroying verified data (core-rules §6).
 * Fix: writeSnapshotPreservingLive() refuses to clobber a live snapshot with a non-live one.
 */

/** A verified snapshot worth preserving (must be detected as live). */
export const LIVE_SNAPSHOT_KNOWN_GOOD = {
  meta: {
    source: { name: 'Census ACS', tier: 'official' },
    asOf: '2026-07-01',
    provenance: 'fetched-live' as const,
    fetchedLive: true,
    stateCode: 'FL',
  },
  ranks: { population: { rank: 3, value: 22_610_726, denominator: 50 } },
};

/** Split-live flags (counties): any true flag counts as live. */
export const SPLIT_LIVE_SNAPSHOT_KNOWN_GOOD = {
  meta: { provenance: 'honest-gap', censusFetchedLive: true, blsFetchedLive: false },
  records: [{ fips: '12086', name: 'Miami-Dade' }],
};

/** The honest-gap payload a failed re-fetch would try to write (must NOT clobber a live prior). */
export const HONEST_GAP_SNAPSHOT_KNOWN_BAD_OVERWRITE = {
  meta: {
    source: { name: 'Census ACS', tier: 'official' },
    asOf: '2026-07-19',
    provenance: 'honest-gap' as const,
    fetchedLive: false,
    stateCode: 'FL',
    note: 'fetch failed',
  },
  ranks: { population: { rank: null, value: null, denominator: null } },
};

/** Ingest scripts that MUST route non-live writes through the preserve helper. */
export const PRESERVE_WIRED_INGESTS = [
  'scripts/ingest/florida/ingest-florida-state-rankings.ts',
  'scripts/ingest/florida/ingest-bea-rpp-florida.ts',
  'scripts/ingest/florida/ingest-florida-counties.ts',
  'scripts/ingest/florida/ingest-news-florida.ts',
  'scripts/ingest/florida/ingest-openstates-florida.ts',
  'scripts/ingest/florida/ingest-legiscan-florida.ts',
  'scripts/ingest/florida/ingest-sam-florida.ts',
  'scripts/ingest/florida/ingest-govinfo-florida.ts',
];

/** National syncs that MUST require --members/--full-corpus scoping (SYNC-01). */
export const SCOPE_REQUIRED_SYNCS = [
  'scripts/sync-fec-national.ts',
  'scripts/sync-news-national.ts',
  'scripts/sync-topic-positions.ts',
];
