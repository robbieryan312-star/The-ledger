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
