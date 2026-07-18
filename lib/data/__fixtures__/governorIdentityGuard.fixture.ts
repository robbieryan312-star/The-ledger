/**
 * Frozen bad example: ron-desantis roster entry carried bioguideId D000628 (Neal P. Dunn)
 * which caused Neal Dunn's congressional portrait to render on DeSantis's governor card.
 */
export const GOVERNOR_IDENTITY_KNOWN_BAD = {
  id: 'ron-desantis',
  name: 'Ron DeSantis',
  lastName: 'DeSantis',
  chamber: 'governor' as const,
  bioguideId: 'D000628',
  /** Bioguide portrait for Neal P. Dunn (bioguide D000628 in currentLegislators.json). */
  wrongPhotoUrl: 'https://bioguide.congress.gov/bioguide/photo/D/D000628.jpg',
};

export const GOVERNOR_IDENTITY_KNOWN_GOOD = {
  id: 'gov-fl',
  name: 'Ron DeSantis',
  lastName: 'DeSantis',
  chamber: 'governor' as const,
  stateCode: 'FL',
  expectedProfileId: 'ron-desantis',
};
