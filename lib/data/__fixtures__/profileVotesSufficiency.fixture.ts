/**
 * Build-gated fixtures — migrated profile vote sufficiency (append-only).
 */

/** Sitting senators whose votes MUST resolve from the national snapshot (W000817/C001098 wiring regression). */
export const PROFILE_VOTES_SUFFICIENCY_MUST_HAVE: readonly string[] = ['W000817', 'C001098'];

/** Locked migrated profiles must keep the 30-vote depth approved for the gold-profile batch. */
export const PROFILE_VOTES_DEPTH_MINIMUMS = [
  { bioguideId: 'S000033', minVotes: 30 },
  { bioguideId: 'O000172', minVotes: 30 },
  { bioguideId: 'M000355', minVotes: 30 },
  { bioguideId: 'M001184', minVotes: 30 },
  { bioguideId: 'W000817', minVotes: 30 },
  { bioguideId: 'C001098', minVotes: 30 },
  { bioguideId: 'P000197', minVotes: 30 },
] as const;
