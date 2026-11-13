import assert from 'node:assert/strict';
import test from 'node:test';
import type { SaidDidLinkEntry, TopicStatementEntry } from '../../lib/data/topicPositions';
import {
  canRefreshSaidDidLinks,
  mergeSaidDidLinksForRefresh,
  mergeStatementsPreservingPriorMedia,
} from '../lib/topicPositionsPreserve';

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

test('topic sync can refresh Said-Did links to empty when member vote row is available', () => {
  const canRefresh = canRefreshSaidDidLinks(true, new Map([['P000197', []]]), 'P000197');
  const merged = mergeSaidDidLinksForRefresh([PRIOR_LINK], [], canRefresh);

  assert.equal(canRefresh, true);
  assert.deepEqual(merged, []);
});

const PRIOR_MEDIA_STATEMENT: TopicStatementEntry = {
  title: 'Together we are going to guarantee health care to all as a right.',
  date: '2019-04-10',
  url: 'https://www.washingtonpost.com/politics/example-story/?utm_source=test',
  tier: 'media',
  topicId: 'healthcare',
  verbatim: true,
  outlet: 'Washington Post',
};

test('topic sync preserves prior media statements when fresh verification is empty', () => {
  const merged = mergeStatementsPreservingPriorMedia([PRIOR_MEDIA_STATEMENT], []);

  assert.deepEqual(merged, [PRIOR_MEDIA_STATEMENT]);
});

test('topic sync does not duplicate prior media statements refreshed from same article', () => {
  const fresh = {
    ...PRIOR_MEDIA_STATEMENT,
    url: 'https://www.washingtonpost.com/politics/example-story/',
  };
  const merged = mergeStatementsPreservingPriorMedia([PRIOR_MEDIA_STATEMENT], [fresh]);

  assert.deepEqual(merged, [fresh]);
});
