import type { CongressVoteEntry } from '../congressVotes';

const source = {
  name: 'Congress.gov',
  url: 'https://www.congress.gov',
  tier: 'official' as const,
  date: '2026-07-01',
};

/** Frozen good: prior verified vote row that must survive a thin refresh. */
export const LEGACY_VOTE_PRIOR_GOOD: CongressVoteEntry = {
  politicianId: 'example-member',
  bioguideId: 'E000001',
  chamber: 'house',
  votes: [
    {
      id: 'example-member-119-2-101',
      billId: 'H.R.1',
      billTitle: 'Example verified roll-call bill',
      billDescription: 'Official House roll-call record from Congress.gov.',
      voteAction: 'On Passage',
      date: '2026-07-01',
      vote: 'Yea',
      result: 'Passed',
      category: 'economy',
      source,
    },
  ],
  source,
  asOf: '2026-07-01',
  congressGovUrl: 'https://www.congress.gov',
  note: '1 recent House roll-call position from Congress.gov API.',
};

/** Frozen bad: a transient refresh miss represented as an empty replacement entry. */
export const LEGACY_VOTE_EMPTY_REFRESH_BAD: CongressVoteEntry = {
  politicianId: 'example-member',
  bioguideId: 'E000001',
  chamber: 'house',
  votes: [],
  source,
  asOf: '2026-09-10',
  congressGovUrl: 'https://www.congress.gov',
  note: 'No matching House roll-call positions found in scanned votes.',
};
