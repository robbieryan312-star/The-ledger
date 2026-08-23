import assert from 'node:assert/strict';
import test from 'node:test';
import type { SaidDidLinkEntry, TopicStatementEntry } from '../../lib/data/topicPositions';
import {
  canRefreshSaidDidLinks,
  mergeSaidDidLinksForRefresh,
  mergeStatementsForRefresh,
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

const PRIOR_MEDIA_STATEMENT: TopicStatementEntry = {
  title: '"Health care is a human right," Sanders said during the campaign.',
  date: '2019-04-10',
  url: 'https://www.washingtonpost.com/politics/example-sanders-healthcare',
  tier: 'media',
  topicId: 'healthcare',
  verbatim: true,
  outlet: 'Washington Post',
};

const PRIOR_CREC_STATEMENT: TopicStatementEntry = {
  title: 'Mr. SANDERS. Mr. President, this is a prior committed floor remark.',
  date: '2025-02-01',
  url: 'https://www.govinfo.gov/app/details/CREC-2025-02-01-pt1-PgS3474-2',
  tier: 'official',
  topicId: 'healthcare',
  verbatim: true,
};

const FRESH_CREC_DUPLICATE: TopicStatementEntry = {
  ...PRIOR_CREC_STATEMENT,
  url: 'https://www.govinfo.gov/app/details/CREC-2025-02-01-pt1-PgS3474-3',
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

test('topic sync preserves prior verified media statements when fresh statement search is empty', () => {
  const merged = mergeStatementsForRefresh([PRIOR_MEDIA_STATEMENT], [], {
    isProceduralCrecText: () => false,
  });

  assert.deepEqual(merged, [PRIOR_MEDIA_STATEMENT]);
});

test('topic sync preserves prior official CREC statements that age out of the fresh search pool', () => {
  const merged = mergeStatementsForRefresh([PRIOR_CREC_STATEMENT], [], {
    isProceduralCrecText: () => false,
  });

  assert.deepEqual(merged, [PRIOR_CREC_STATEMENT]);
});

test('topic sync de-dupes prior CREC statement variants already present in fresh output', () => {
  const merged = mergeStatementsForRefresh([PRIOR_CREC_STATEMENT], [FRESH_CREC_DUPLICATE], {
    isProceduralCrecText: () => false,
  });

  assert.deepEqual(merged, [FRESH_CREC_DUPLICATE]);
});

test('topic sync still rejects prior procedural CREC statements', () => {
  const merged = mergeStatementsForRefresh([PRIOR_CREC_STATEMENT], [], {
    isProceduralCrecText: () => true,
  });

  assert.deepEqual(merged, []);
});
