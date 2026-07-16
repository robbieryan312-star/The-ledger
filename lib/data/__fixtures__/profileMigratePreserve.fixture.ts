/**
 * Append-only regression guards — profile migrate must not wipe committed statements/Said→Did
 * on a positions-only re-run (P000197 lost 8 CREC statements in commit 16bc226), and must not
 * truncate prior-good profile votes when a fresh national snapshot is shallow.
 */
import type { VoteRecord } from '../../types';

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

function fixtureVote(index: number): VoteRecord {
  const roll = String(index + 1).padStart(3, '0');
  return {
    id: `fixture-roll-${roll}`,
    billId: `H.R. ${1000 + index}`,
    billTitle: `Fixture roll call ${roll}`,
    billDescription: `Official fixture vote ${roll}`,
    date: `2025-01-${String((index % 28) + 1).padStart(2, '0')}`,
    vote: index % 2 === 0 ? 'Yea' : 'Nay',
    result: index % 3 === 0 ? 'Failed' : 'Passed',
    category: 'legislation',
    source: {
      name: 'Congress.gov',
      url: `https://www.congress.gov/bill/119th-congress/house-bill/${1000 + index}`,
      tier: 'official',
      date: `2025-01-${String((index % 28) + 1).padStart(2, '0')}`,
    },
  };
}

/** Frozen bad example: shallow fresh vote input would have truncated a locked 30-vote profile. */
export const PROFILE_MIGRATE_KNOWN_BAD_SHALLOW_VOTES = {
  bioguideId: 'W000817',
  existingVotes: Array.from({ length: 30 }, (_, index) => fixtureVote(index)),
  freshVotes: Array.from({ length: 8 }, (_, index) => fixtureVote(index)),
} as const;
