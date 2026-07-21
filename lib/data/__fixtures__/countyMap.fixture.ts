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

export const COUNTY_MAP_REFERENCE_FIPS = {
  miamiDade: '12086',
  liberty: '12077',
} as const;

export const COUNTY_MAP_KNOWN_GOOD_REFERENCE = {
  defect: 'county-map-reference-filled',
  description: 'Reference counties must have ≥1 sourced official and status filled',
  fips: [COUNTY_MAP_REFERENCE_FIPS.miamiDade, COUNTY_MAP_REFERENCE_FIPS.liberty],
  minOfficials: 1,
} as const;
