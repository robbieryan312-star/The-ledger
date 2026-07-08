/**
 * Append-only regression guards — migrated gold-standard profiles must never resolve
 * as lightweight roster entries (PR #9 / commit 7db9d32 guard salvage).
 */

import type { Politician } from '../../types';

/** Frozen bad: migrated member still gated as lightweight with integration disclaimer bio. */
export const MIGRATED_NOT_LIGHTWEIGHT_KNOWN_BAD: Pick<
  Politician,
  'bioguideId' | 'recordType' | 'bio' | 'id' | 'name'
> = {
  id: 'bernie-sanders',
  bioguideId: 'S000033',
  name: 'Bernie Sanders',
  recordType: 'lightweight',
  bio: 'Bernie Sanders is a Senator representing Vermont. This is a lightweight, real-sourced record; detailed votes, finance, and positions are not yet integrated for this profile.',
};

/** Frozen good: featured roster entry for a migrated member (no integration disclaimer). */
export const MIGRATED_NOT_LIGHTWEIGHT_KNOWN_GOOD: Pick<
  Politician,
  'bioguideId' | 'recordType' | 'bio'
> = {
  bioguideId: 'S000033',
  recordType: 'featured',
  bio: '',
};

export interface MigratedIntegrationViolation {
  bioguideId: string;
  reason: string;
}

/** Returns violation reasons when a migrated profile would render lightweight placeholders. */
export function collectMigratedLightweightViolations(
  bioguideId: string,
  profile: Pick<Politician, 'recordType' | 'bio'> | undefined,
  gates: {
    votesMissingPanel: boolean;
    financeMissingPanel: boolean;
    trackRecordMissingPanel: boolean;
  },
): MigratedIntegrationViolation[] {
  const violations: MigratedIntegrationViolation[] = [];
  if (!profile) {
    violations.push({ bioguideId, reason: 'missing from allPoliticians roster' });
    return violations;
  }
  if (profile.recordType === 'lightweight') {
    violations.push({ bioguideId, reason: 'recordType is lightweight' });
  }
  if (/not yet integrated/i.test(profile.bio ?? '')) {
    violations.push({ bioguideId, reason: 'bio contains not-yet-integrated disclaimer' });
  }
  if (gates.votesMissingPanel) {
    violations.push({ bioguideId, reason: 'would render MissingRecordPanel for votes' });
  }
  if (gates.financeMissingPanel) {
    violations.push({ bioguideId, reason: 'would render MissingRecordPanel for finance' });
  }
  if (gates.trackRecordMissingPanel) {
    violations.push({ bioguideId, reason: 'would render MissingRecordPanel for Track Record' });
  }
  return violations;
}
