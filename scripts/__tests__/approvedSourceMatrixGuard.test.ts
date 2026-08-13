/**
 * Build-gated: every wired catalog source must appear in the approved matrix
 * (docs/OBJECTIVE_SOURCES.md). Covers dead-source reintroduction without naming any.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { SOURCE_CATALOG } from '../../lib/data/sourceCatalog';
import {
  entryPresentInApprovedMatrix,
  wiredEntriesMissingFromMatrix,
} from '../../lib/data/approvedSourceMatrix';
import {
  APPROVED_MATRIX_HOST_COLLISION_BAD,
  APPROVED_MATRIX_KNOWN_BAD,
  APPROVED_MATRIX_KNOWN_GOOD,
} from '../../lib/data/__fixtures__/approvedSourceMatrixGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readObjectiveSources(): string {
  return readFileSync(path.join(projectRoot, 'docs/OBJECTIVE_SOURCES.md'), 'utf8');
}

/** Contiguous dead-source token — assembled so this file itself stays greppable-clean. */
const DEAD_SOURCE_TOKEN = ['vote', 'smart'].join('');

test('fixture: known-GOOD wired source is present in OBJECTIVE_SOURCES matrix', () => {
  const obj = readObjectiveSources();
  assert.match(obj, new RegExp(APPROVED_MATRIX_KNOWN_GOOD.mustAppearInObjective, 'i'));
  const entry = SOURCE_CATALOG.find((e) => e.id === APPROVED_MATRIX_KNOWN_GOOD.catalogId);
  assert.ok(entry, `catalog missing ${APPROVED_MATRIX_KNOWN_GOOD.catalogId}`);
  assert.equal(entryPresentInApprovedMatrix(entry, obj), true);
});

test('fixture: known-BAD wired source is detected as absent from matrix', () => {
  const obj = readObjectiveSources();
  const bad = {
    id: APPROVED_MATRIX_KNOWN_BAD.catalogId,
    name: APPROVED_MATRIX_KNOWN_BAD.name,
    status: APPROVED_MATRIX_KNOWN_BAD.status,
    url: 'https://zzzxqorv9.test/path',
  };
  assert.equal(entryPresentInApprovedMatrix(bad, obj), false);
  const missing = wiredEntriesMissingFromMatrix([...SOURCE_CATALOG, bad], obj);
  assert.ok(
    missing.some((e) => e.id === APPROVED_MATRIX_KNOWN_BAD.catalogId),
    'known-bad synthetic wired source must be reported missing',
  );
});

test('fixture: shared host alone cannot satisfy approved matrix membership', () => {
  const obj = readObjectiveSources();
  const bad = {
    id: APPROVED_MATRIX_HOST_COLLISION_BAD.catalogId,
    name: APPROVED_MATRIX_HOST_COLLISION_BAD.name,
    status: APPROVED_MATRIX_HOST_COLLISION_BAD.status,
    url: APPROVED_MATRIX_HOST_COLLISION_BAD.url,
  };
  assert.equal(entryPresentInApprovedMatrix(bad, obj), false);
  const missing = wiredEntriesMissingFromMatrix([...SOURCE_CATALOG, bad], obj);
  assert.ok(
    missing.some((e) => e.id === APPROVED_MATRIX_HOST_COLLISION_BAD.catalogId),
    'synthetic wired source sharing an approved host must still be reported missing',
  );
});

test('all wired SOURCE_CATALOG entries appear in docs/OBJECTIVE_SOURCES.md', () => {
  const obj = readObjectiveSources();
  const missing = wiredEntriesMissingFromMatrix(SOURCE_CATALOG, obj);
  assert.equal(
    missing.length,
    0,
    `wired catalog sources absent from approved matrix:\n${missing
      .map((e) => `- ${e.id} (${e.name})`)
      .join('\n')}`,
  );
});

test('criterion (A): no contiguous dead-source token outside history exempts', () => {
  const args = [
    'grep',
    '-ci',
    DEAD_SOURCE_TOKEN,
    '--',
    '.',
    ':!docs/archive',
    ':!docs/workflows/AGENT_HANDOFF_LOG.md',
    ':!docs/workflows/BATCH_SCALING.md',
    ':!docs/workflows/IMPROVEMENT_BACKLOG.md',
  ];
  let grepStatus: number | undefined;
  let grepStdout = '';
  try {
    grepStdout = execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim();
    grepStatus = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    grepStatus = e.status;
    grepStdout = (e.stdout ?? '').trim();
  }
  // Assert AFTER try/catch so AssertionError is never swallowed as "got undefined".
  if (grepStatus === 0 || grepStdout.length > 0) {
    assert.fail(
      `dead-source token "${DEAD_SOURCE_TOKEN}" found outside history exempts:\n${grepStdout || '(git grep exited 0 with empty stdout)'}`,
    );
  }
  assert.equal(grepStatus, 1, `expected git grep exit 1 (no matches); got ${grepStatus}`);
  assert.equal(grepStdout, '');
});
