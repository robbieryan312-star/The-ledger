/**
 * Build-gated: if a PR/commit changes collection output under
 * lib/data/generated/{profiles,countyMap,newsNational,slices} (data files, not accessors),
 * the same diff vs merge-base(main) MUST touch docs/workflows/BATCH_SCALING.md.
 *
 * Skip cleanly when no generated-data change. Fixture pairs are append-only (§6).
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  BATCH_SCALING_PATH,
  COLLECTION_IMPROVEMENT_KNOWN_BAD,
  COLLECTION_IMPROVEMENT_KNOWN_GOOD,
  COLLECTION_IMPROVEMENT_KNOWN_SKIP,
} from '../../lib/data/__fixtures__/collectionImprovementGuard.fixture';
import {
  evaluateCollectionImprovementCompliance,
  isCollectionDataPath,
} from '../../lib/data/collectionImprovementCompliance';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function resolveMainRef(): string | null {
  for (const ref of ['origin/main', 'main']) {
    try {
      git(['rev-parse', '--verify', ref]);
      return ref;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Working-tree + branch commits vs merge-base with main (tracked paths). */
function changedFilesVsMain(): string[] | null {
  const mainRef = resolveMainRef();
  if (!mainRef) return null;
  let mergeBase: string;
  try {
    mergeBase = git(['merge-base', 'HEAD', mainRef]);
  } catch {
    return null;
  }
  const fromBaseToWorktree = git(['diff', '--name-only', '--diff-filter=ACDMRT', mergeBase]);
  const untracked = git(['ls-files', '--others', '--exclude-standard']);
  const names = new Set<string>();
  for (const line of [...fromBaseToWorktree.split('\n'), ...untracked.split('\n')]) {
    const t = line.trim();
    if (t) names.add(t.replace(/\\/g, '/'));
  }
  return [...names].sort();
}

test('fixture: known-GOOD data + BATCH_SCALING passes', () => {
  const result = evaluateCollectionImprovementCompliance([
    ...COLLECTION_IMPROVEMENT_KNOWN_GOOD.changedFiles,
  ]);
  assert.equal(result.verdict, COLLECTION_IMPROVEMENT_KNOWN_GOOD.expect);
  assert.equal(result.touchedBatchScaling, true);
  assert.ok(result.collectionDataFiles.length > 0);
});

test('fixture: known-BAD data-without-row fails', () => {
  const result = evaluateCollectionImprovementCompliance([
    ...COLLECTION_IMPROVEMENT_KNOWN_BAD.changedFiles,
  ]);
  assert.equal(result.verdict, COLLECTION_IMPROVEMENT_KNOWN_BAD.expect);
  assert.equal(result.touchedBatchScaling, false);
  assert.match(result.reason, /BATCH_SCALING\.md/);
});

test('fixture: known-GOOD skip when no generated-data change', () => {
  const result = evaluateCollectionImprovementCompliance([
    ...COLLECTION_IMPROVEMENT_KNOWN_SKIP.changedFiles,
  ]);
  assert.equal(result.verdict, COLLECTION_IMPROVEMENT_KNOWN_SKIP.expect);
  assert.deepEqual(result.collectionDataFiles, []);
});

test('accessor .ts under profiles/ is not collection data', () => {
  assert.equal(isCollectionDataPath('lib/data/generated/profiles/index.ts'), false);
  assert.equal(isCollectionDataPath('lib/data/generated/profiles/S000033/news.json'), true);
  assert.equal(isCollectionDataPath('lib/data/generated/newsNational.json'), true);
  assert.equal(isCollectionDataPath('lib/data/generated/roster.json'), false);
});

test('live diff vs main: collection data requires BATCH_SCALING.md (skip if none)', () => {
  const changed = changedFilesVsMain();
  if (changed === null) {
    // Shallow clone / missing main — cannot evaluate; do not false-pass a data change.
    assert.ok(
      false,
      'cannot resolve merge-base with origin/main|main — fetch main (guards.yml fetch-depth: 0)',
    );
  }
  const result = evaluateCollectionImprovementCompliance(changed);
  if (result.verdict === 'skip') {
    assert.equal(result.collectionDataFiles.length, 0);
    return;
  }
  assert.equal(
    result.verdict,
    'pass',
    `${result.reason}\n(changed sample: ${changed.slice(0, 20).join(', ')})`,
  );
  assert.ok(
    changed.includes(BATCH_SCALING_PATH),
    `expected ${BATCH_SCALING_PATH} among changed files`,
  );
});
