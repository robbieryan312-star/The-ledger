/**
 * How a Florida (and future state) dashboard fact was obtained.
 * Prefer this over boolean `fetchedLive` — computed tables are not network fetches.
 */
export type DataProvenance =
  | 'fetched-live'
  | 'computed-from-published-tables'
  | 'honest-gap';

export const DATA_PROVENANCE_VALUES: readonly DataProvenance[] = [
  'fetched-live',
  'computed-from-published-tables',
  'honest-gap',
] as const;

export function isDataProvenance(value: unknown): value is DataProvenance {
  return (
    value === 'fetched-live' ||
    value === 'computed-from-published-tables' ||
    value === 'honest-gap'
  );
}

/** Section-level provenance for computed published-table derivations (e.g. tax brackets). */
export type ComputedProvenanceMeta = {
  provenance: 'computed-from-published-tables';
  citation: string;
  computedAt: string;
  tier: 'official' | 'nonpartisan';
  name?: string;
  url?: string;
};

/** Section-level provenance for live API fetches. */
export type FetchedLiveProvenanceMeta = {
  provenance: 'fetched-live';
  tier: 'official' | 'nonpartisan';
  name?: string;
  url?: string;
  citation?: string;
};

/** Honest gap — no verified numeric payload. */
export type HonestGapProvenanceMeta = {
  provenance: 'honest-gap';
  tier?: 'official' | 'nonpartisan' | string;
  note?: string;
};
