import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  isAllowedNewsArticleUrl,
  isOfficialRecordNewsUrl,
  isRegistryNewsHost,
  NEWS_FEED_REGISTRY,
} from '../../lib/data/newsFeedRegistry';
import type { NewsItem } from '../../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('news feed registry has unique feed URLs and valid tiers', () => {
  const urls = new Set<string>();
  for (const entry of NEWS_FEED_REGISTRY) {
    assert.ok(entry.outlet.length > 0);
    assert.ok(entry.feedUrl.startsWith('https://'));
    assert.ok(['media', 'nonpartisan'].includes(entry.tier));
    assert.ok(entry.articleHosts.length > 0);
    assert.ok(!urls.has(entry.feedUrl), `duplicate feed: ${entry.feedUrl}`);
    urls.add(entry.feedUrl);
  }
});

test('registry host guard accepts Guardian RSS articles', () => {
  assert.equal(
    isRegistryNewsHost('https://www.theguardian.com/us-news/2026/jun/25/elizabeth-warren-trump-mergers'),
    true,
  );
});

test('official-record congress.gov URLs allowed alongside registry hosts', () => {
  assert.equal(isOfficialRecordNewsUrl('https://www.congress.gov/bill/119th-congress/house-bill/1'), true);
  assert.equal(
    isAllowedNewsArticleUrl('https://www.congress.gov/bill/119th-congress/house-bill/1'),
    true,
  );
  assert.equal(isAllowedNewsArticleUrl('https://example.com/fake'), false);
});

test('append-only news registry fixture rejects bare homepage URLs', () => {
  const fixturePath = path.join(projectRoot, 'lib/data/__fixtures__/sourceIntegrity.fixture.ts');
  const text = readFileSync(fixturePath, 'utf8');
  assert.match(text, /PLATFORM_KNOWN_BAD_EVENT_NARRATION/);
  assert.ok(existsSync(path.join(projectRoot, 'lib/data/newsFeedRegistry.ts')));
});

test('sync-news-rss derives members from manifest (no hard-coded MEMBERS)', () => {
  const src = readFileSync(path.join(projectRoot, 'scripts/sync-news-rss.ts'), 'utf8');
  assert.doesNotMatch(src, /export const MEMBERS/);
  assert.match(src, /_manifest\.json/);
});

test('news status: honest-gap only when zero feed failures in run', async () => {
  const { resolveNewsStatus } = await import('../sync-news-rss');
  const empty: never[] = [];
  const gap = resolveNewsStatus(empty, empty, {
    feedsAttempted: 10,
    feedFailures: 0,
    memberSkipped: false,
    legName: 'Test Member',
  });
  assert.equal(gap.status, 'honest-gap');

  const failed = resolveNewsStatus(empty, empty, {
    feedsAttempted: 10,
    feedFailures: 10,
    memberSkipped: false,
    legName: 'Test Member',
  });
  assert.equal(failed.status, 'fetch-failed');
  assert.match(failed.note, /feed\(s\) timed out or errored/);

  const partialFailure = resolveNewsStatus(empty, empty, {
    feedsAttempted: 10,
    feedFailures: 1,
    memberSkipped: false,
    legName: 'Test Member',
  });
  assert.equal(partialFailure.status, 'fetch-failed');
  assert.match(partialFailure.note, /0 qualified matches/);
});

test('sync-news-rss preserves committed items that current matcher would reject', async () => {
  const { mergeProfileNewsItems } = await import('../sync-news-rss');
  const leg = {
    bioguideId: 'S000033',
    name: 'Bernie Sanders',
    lastName: 'Sanders',
    state: 'VT',
    chamber: 'senate',
  };
  const existing: NewsItem = {
    id: 'committed-prior',
    headline: 'Budget deal advances after committee markup',
    summary: 'Previously committed approved-outlet item from an earlier verified refresh.',
    date: '2026-01-02',
    category: 'Congress',
    isOpinion: false,
    isVerified: false,
    url: 'https://www.theguardian.com/us-news/2026/jan/02/budget-deal',
    source: {
      name: 'The Guardian',
      url: 'https://www.theguardian.com/us-news/2026/jan/02/budget-deal',
      tier: 'media',
      date: '2026-01-02',
    },
  };
  const freshRejected: NewsItem = {
    ...existing,
    id: 'fresh-rejected',
    headline: 'Unrelated budget story',
    summary: 'No qualifying member subject or quote.',
    date: '2026-01-03',
    url: 'https://www.theguardian.com/us-news/2026/jan/03/unrelated-budget-story',
    source: {
      ...existing.source,
      url: 'https://www.theguardian.com/us-news/2026/jan/03/unrelated-budget-story',
      date: '2026-01-03',
    },
  };

  const merged = mergeProfileNewsItems([existing], [freshRejected], leg);
  assert.deepEqual(merged.map((item) => item.id), ['committed-prior']);
});
