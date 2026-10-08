import assert from 'node:assert/strict';
import test from 'node:test';
import type { SaidDidLinkEntry } from '../../lib/data/topicPositions';
import {
  canRefreshSaidDidLinks,
  combineFreshSaidDidLinks,
  mergeSaidDidLinksForRefresh,
  mergeTopicSyncSaidDidLinks,
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

test('topic sync keeps overlap-based CREC links for legislation catch-all on valid refresh', () => {
  const crecLegislationLink: SaidDidLinkEntry = {
    topicId: 'legislation',
    statedPositionDate: '2025-03-12',
    saidQuote: 'Mr. EXAMPLE. Mr. President, I rise to discuss rural hospital funding.',
    saidUrl: 'https://www.govinfo.gov/content/pkg/CREC-2025-03-12/html/CREC-2025-03-12-pt1-PgS1234.htm',
    saidOutlet: 'Congressional Record (GovInfo)',
    voteDate: '2025-03-20',
    billTitle: 'Rural Hospital Funding Act',
    billNumber: 'S. 123',
    congressGovUrl: 'https://www.congress.gov/bill/119th-congress/senate-bill/123',
    voteChoice: 'Yea',
    tier: 'official',
  };

  const merged = mergeTopicSyncSaidDidLinks(
    [PRIOR_LINK],
    [],
    [crecLegislationLink],
    true,
  );

  assert.deepEqual(merged, [crecLegislationLink]);
});

test('topic sync preserves prior links instead of fresh overlap links when votes cannot refresh', () => {
  const merged = mergeTopicSyncSaidDidLinks(
    [PRIOR_LINK],
    [],
    [
      {
        ...PRIOR_LINK,
        saidQuote: 'Mr. EXAMPLE. Mr. President, I rise to discuss health care.',
        saidUrl: 'https://www.govinfo.gov/content/pkg/CREC-2025-03-12/html/CREC-2025-03-12-pt1-PgS1234.htm',
      },
    ],
    false,
  );

  assert.deepEqual(merged, [PRIOR_LINK]);
});

test('topic sync prefers embedded CREC quote link over duplicate topic-only vote link', () => {
  const topicOnly: SaidDidLinkEntry = {
    ...PRIOR_LINK,
    topicId: 'healthcare',
  };
  const withCrecQuote: SaidDidLinkEntry = {
    ...topicOnly,
    saidQuote: 'Mr. EXAMPLE. Mr. President, I rise to discuss health care.',
    saidUrl: 'https://www.govinfo.gov/content/pkg/CREC-2025-03-12/html/CREC-2025-03-12-pt1-PgS1234.htm',
    saidOutlet: 'Congressional Record (GovInfo)',
  };

  assert.deepEqual(combineFreshSaidDidLinks([topicOnly], [withCrecQuote]), [withCrecQuote]);
});
