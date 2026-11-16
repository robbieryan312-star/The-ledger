import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { SaidDidLinkEntry } from '../../lib/data/topicPositions';
import { canRefreshSaidDidLinks, mergeSaidDidLinksForRefresh } from '../lib/topicPositionsPreserve';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

test('topic sync checkpoints only after topicPositions snapshot is durable', () => {
  const src = readFileSync(path.join(projectRoot, 'scripts/sync-topic-positions.ts'), 'utf8');
  const block = src.match(/await runExclusive\(async \(\) => \{([\s\S]*?)\n    \}\);/)?.[1] ?? '';

  assert.match(block, /await writeSnapshot\(rosterSize, byBioguideId, asOf, !!govinfoKey\);/);
  assert.match(block, /await writeFile\(CHECKPOINT_FILE, JSON\.stringify\(checkpoint\) \+ '\\n', 'utf8'\);/);

  const snapshotIndex = block.indexOf('await writeSnapshot(rosterSize, byBioguideId, asOf, !!govinfoKey);');
  const checkpointIndex = block.indexOf(
    "await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint) + '\\n', 'utf8');",
  );
  assert.ok(
    snapshotIndex < checkpointIndex,
    'checkpoint must advance after the output snapshot is written to avoid crash-resume data loss',
  );
});
