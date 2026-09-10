import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_VOTE_EMPTY_REFRESH_BAD,
  LEGACY_VOTE_PRIOR_GOOD,
} from '../../lib/data/__fixtures__/legacyVotePreserve.fixture';
import { mergeLegacyVoteEntriesWithPrior } from '../lib/legacyVotePreserve';

test('legacy sync:votes preserves prior rows when a refresh returns an empty member entry', () => {
  const merged = mergeLegacyVoteEntriesWithPrior(
    { 'example-member': LEGACY_VOTE_EMPTY_REFRESH_BAD },
    { 'example-member': LEGACY_VOTE_PRIOR_GOOD },
    ['example-member'],
  );

  assert.equal(merged['example-member'].votes.length, 1);
  assert.equal(merged['example-member'].votes[0].id, 'example-member-119-2-101');
  assert.match(
    merged['example-member'].note ?? '',
    /Prior vote rows preserved because this refresh produced no replacement rows/,
  );
});

test('legacy sync:votes uses fresh rows when the refresh has verified replacements', () => {
  const fresh = {
    ...LEGACY_VOTE_EMPTY_REFRESH_BAD,
    votes: [
      {
        ...LEGACY_VOTE_PRIOR_GOOD.votes[0],
        id: 'example-member-119-2-202',
        date: '2026-09-10',
      },
    ],
  };

  const merged = mergeLegacyVoteEntriesWithPrior(
    { 'example-member': fresh },
    { 'example-member': LEGACY_VOTE_PRIOR_GOOD },
    ['example-member'],
  );

  assert.equal(merged['example-member'].votes.length, 1);
  assert.equal(merged['example-member'].votes[0].id, 'example-member-119-2-202');
});
