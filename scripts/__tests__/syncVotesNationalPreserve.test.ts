import assert from 'node:assert/strict';
import test from 'node:test';

import { selectNationalVoteRefreshVotes } from '../sync-votes-national';
import type { VoteRecord } from '../../lib/types';

function vote(id: string, date: string): VoteRecord {
  return {
    id,
    billId: id,
    billTitle: id,
    billDescription: id,
    voteAction: 'Voted Yea',
    date,
    vote: 'Yea',
    result: 'Passed',
    category: 'legislation',
    source: {
      name: 'Congress.gov',
      tier: 'official',
      url: `https://www.congress.gov/vote/${id}`,
      date,
    },
  };
}

test('full national vote refresh preserves prior votes when fresh fetch returns zero rows', () => {
  const existing = Array.from({ length: 35 }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0');
    return vote(`prior-${i}`, `2026-01-${day}`);
  });

  const result = selectNationalVoteRefreshVotes(existing, [], true);

  assert.equal(result.preservedExistingAfterEmptyFullRefresh, true);
  assert.equal(result.votes.length, existing.length);
  assert.deepEqual(
    new Set(result.votes.map((item) => item.id)),
    new Set(existing.map((item) => item.id)),
  );
});

test('full national vote refresh still replaces prior votes when fresh rows exist', () => {
  const existing = [vote('prior-1', '2026-01-01')];
  const fresh = [vote('fresh-1', '2026-02-01')];

  const result = selectNationalVoteRefreshVotes(existing, fresh, true);

  assert.equal(result.preservedExistingAfterEmptyFullRefresh, false);
  assert.deepEqual(result.votes.map((item) => item.id), ['fresh-1']);
});
