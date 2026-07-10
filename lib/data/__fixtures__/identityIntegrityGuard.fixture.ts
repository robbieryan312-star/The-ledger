/**
 * Frozen regression fixtures for identityIntegrityGuard — append-only.
 * DeSantis/D000628 (Neal Dunn portrait bleed) is the canonical bad case.
 */
import {
  GOVERNOR_IDENTITY_KNOWN_BAD,
  GOVERNOR_IDENTITY_KNOWN_GOOD,
} from './governorIdentityGuard.fixture';

export const IDENTITY_INTEGRITY_KNOWN_BAD = {
  ...GOVERNOR_IDENTITY_KNOWN_BAD,
  /** Wrong party/state if Dunn's record were shown on DeSantis card */
  wrongLegislatorLastName: 'Dunn',
};

export const IDENTITY_INTEGRITY_KNOWN_GOOD = {
  ...GOVERNOR_IDENTITY_KNOWN_GOOD,
  expectedStateCode: 'FL',
  expectedParty: 'Republican',
};

/** Migrated profile sample for identity cross-check in render batch */
export const IDENTITY_INTEGRITY_PROFILE_SAMPLES = [
  { bioguideId: 'S000033', path: '/politicians/bernie-sanders', lastName: 'Sanders' },
  { bioguideId: 'P000197', path: '/politicians/nancy-pelosi', lastName: 'Pelosi' },
] as const;
