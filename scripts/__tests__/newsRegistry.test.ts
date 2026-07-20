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
});

/**
 * M7c: FL member profile News must use RSS (`sync:news-rss` → mergeProfileNews).
 * NewsAPI is snapshot-only (`ingest:news-fl` → FloridaNewsSections), never the profile primary.
 */
test('FL profile News path is RSS (mergeProfileNews); NewsAPI is snapshot-only', () => {
  const page = readFileSync(path.join(projectRoot, 'app/politicians/[id]/page.tsx'), 'utf8');
  const memberProfile = readFileSync(path.join(projectRoot, 'lib/data/memberProfile.ts'), 'utf8');
  const newsFlorida = readFileSync(path.join(projectRoot, 'lib/data/slices/newsFlorida.ts'), 'utf8');
  const floridaPanel = readFileSync(
    path.join(projectRoot, 'components/records/FloridaRecordPanel.tsx'),
    'utf8',
  );
  const floridaDataDoc = readFileSync(path.join(projectRoot, 'docs/FLORIDA_DATA.md'), 'utf8');

  assert.match(page, /mergeProfileNews/);
  assert.match(page, /displayNews=\{displayNews\}/);
  assert.match(page, /getNewsFloridaBundle/);
  assert.match(page, /floridaNewsBundle=\{floridaNewsBundle\}/);

  assert.match(memberProfile, /sync:news-rss/);
  // Profile news accessor must not import the FL NewsAPI slice module.
  assert.doesNotMatch(memberProfile, /from ['\"].*newsFlorida['\"]|getNewsFloridaBundle/);
  assert.doesNotMatch(memberProfile, /news-florida\.json/);

  assert.match(newsFlorida, /news-florida\.json/);
  assert.match(floridaPanel, /not the member profile News path/);
  assert.match(floridaDataDoc, /Profile News \(every member, including FL\)/);
  assert.match(floridaDataDoc, /never\*\* via NewsAPI|never.*via NewsAPI/i);
});
