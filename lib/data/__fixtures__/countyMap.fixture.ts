/**
 * Append-only fixtures — M8 county map must not pretend empty counties are live.
 */
export const COUNTY_MAP_KNOWN_BAD_EMPTY_AS_LIVE = {
  defect: 'county-panel-empty-as-live',
  description:
    'Hardcoded countyByFips = {} with "integration in progress" / fake live counts is banned',
  bannedCopy: [
    'Official records integration in progress',
    'County-level official directories are being connected',
  ],
} as const;

/** Original reference-2 FIPS (append-only; scale batches add more filled FIPS). */
export const COUNTY_MAP_REFERENCE_FIPS = {
  miamiDade: '12086',
  liberty: '12077',
} as const;

/** Frozen good: reference-2 must remain filled after scale batches. */
export const COUNTY_MAP_KNOWN_GOOD_REFERENCE = {
  defect: 'county-map-reference-filled',
  description: 'Reference counties must have ≥1 sourced official and status filled',
  fips: [COUNTY_MAP_REFERENCE_FIPS.miamiDade, COUNTY_MAP_REFERENCE_FIPS.liberty],
  minOfficials: 1,
} as const;

/** Scale batch 1 (2026-07-21): +9 counties; Charlotte deferred. */
export const COUNTY_MAP_SCALE_BATCH1_FIPS = [
  '12001', // Alachua
  '12003', // Baker
  '12005', // Bay
  '12007', // Bradford
  '12009', // Brevard
  '12011', // Broward
  '12013', // Calhoun
  '12017', // Citrus
  '12019', // Clay
] as const;

/** A Florida FIPS that must remain absent (honest-gap) after batch 1. */
export const COUNTY_MAP_KNOWN_ABSENT_FIPS = '12015' as const; // Charlotte — deferred

export const COUNTY_MAP_FILLED_COUNT_AFTER_BATCH1 = 11 as const;
