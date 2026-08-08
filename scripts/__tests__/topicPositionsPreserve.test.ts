import assert from 'node:assert/strict';
import test from 'node:test';
import type { SaidDidLinkEntry } from '../../lib/data/topicPositions';
import { canRefreshSaidDidLinks, mergeSaidDidLinksForRefresh } from '../lib/topicPositionsPreserve';

const PRIOR_LINK: SaidDidLinkEntry = {
  topicId: 'healthcare',
  statedPositionDate: '2019-04-10',
  voteDate: '2017-07-25',
  billTitle: 'American Health Care Act of 2017',
  billNumber: 'HR 1628',
  congressGovUrl: 'https://www.congress.gov/bill/115th-congress/house-bill/1628',
  voteChoice: 'Nay',
  tier: 'official',
};

test('topic sync preserves Said-Did links when national votes failed to load', () => {
  const canRefresh = canRefreshSaidDidLinks(false, new Map(), 'P000197');
  const merged = mergeSaidDidLinksForRefresh([PRIOR_LINK], [], canRefresh);

  assert.equal(canRefresh, false);
  assert.deepEqual(merged, [PRIOR_LINK]);
});

test('topic sync preserves Said-Did links when national votes omit member row', () => {
  const canRefresh = canRefreshSaidDidLinks(true, new Map([['S000033', []]]), 'P000197');
  const merged = mergeSaidDidLinksForRefresh([PRIOR_LINK], [], canRefresh);

  assert.equal(canRefresh, false);
  assert.deepEqual(merged, [PRIOR_LINK]);
});

test('topic sync preserves Said-Did links when member vote row is empty', () => {
  const canRefresh = canRefreshSaidDidLinks(true, new Map([['P000197', []]]), 'P000197');
  const merged = mergeSaidDidLinksForRefresh([PRIOR_LINK], [], canRefresh);

  assert.equal(canRefresh, false);
  assert.deepEqual(merged, [PRIOR_LINK]);
});

test('topic sync can refresh Said-Did links to empty when member has vote input', () => {
  const canRefresh = canRefreshSaidDidLinks(true, new Map([['P000197', [{}]]]), 'P000197');
  const merged = mergeSaidDidLinksForRefresh([PRIOR_LINK], [], canRefresh);

  assert.equal(canRefresh, true);
  assert.deepEqual(merged, []);
});
