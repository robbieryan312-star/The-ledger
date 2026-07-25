/**
 * Build-gated: M-RETIRED-NPAT-PURGE — purge token must not reappear outside allowed survivors.
 * Criterion (A) from the Claude brief IS this test.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  RETIRED_NPAT_PURGE_KNOWN_BAD_REINTRODUCTION,
  RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT,
} from '../../lib/data/__fixtures__/retiredNpatPurgeGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Contiguous purge token (kept only in this allowed survivor file). */
const PURGE_TOKEN = 'votesmart';

function gitGrepCiPurgeToken(extraPathspecs: string[] = []): {
  exitCode: number;
  stdout: string;
} {
  const args = [
    'grep',
    '-ci',
    PURGE_TOKEN,
    '--',
    '.',
    ':!docs/archive',
    ':!docs/workflows/AGENT_HANDOFF_LOG.md',
    ':!docs/workflows/BATCH_SCALING.md',
    ':!docs/workflows/IMPROVEMENT_BACKLOG.md',
    ':!scripts/__tests__/voteSmartRetiredGuard.test.ts',
    ...extraPathspecs,
  ];
  try {
    const stdout = execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    return { exitCode: 0, stdout: stdout.trim() };
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    return { exitCode: e.status ?? 1, stdout: (e.stdout ?? '').trim() };
  }
}

test('fixture: known-BAD reintroduction host decodes and is frozen', () => {
  const host = Buffer.from(
    RETIRED_NPAT_PURGE_KNOWN_BAD_REINTRODUCTION.bannedSubstringBase64,
    'base64',
  ).toString('utf8');
  assert.equal(host, `api.${PURGE_TOKEN}.org`);
  assert.equal(
    RETIRED_NPAT_PURGE_KNOWN_BAD_REINTRODUCTION.bannedInRelativePath,
    'scripts/sync-topic-positions.ts',
  );
});

test('criterion (A): no purge token outside allowed survivors (git grep exit 1, empty)', () => {
  const { exitCode, stdout } = gitGrepCiPurgeToken([':!docs/OBJECTIVE_SOURCES.md']);
  assert.equal(
    exitCode,
    1,
    `expected git grep exit 1 (no matches); got ${exitCode}\n${stdout}`,
  );
  assert.equal(stdout, '', `expected no grep output; got:\n${stdout}`);
});

test('criterion (B): OBJECTIVE_SOURCES.md has exactly one purge-token match', () => {
  const text = execFileSync(
    'git',
    ['grep', '-ci', PURGE_TOKEN, '--', RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT.path],
    { cwd: projectRoot, encoding: 'utf8' },
  ).trim();
  assert.equal(
    text,
    `${RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT.path}:${RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT.expectedCount}`,
  );
  const obj = readFileSync(
    path.join(projectRoot, RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT.path),
    'utf8',
  );
  assert.match(obj, new RegExp(RETIRED_NPAT_PURGE_KNOWN_GOOD_OBJECTIVE_COUNT.mustInclude));
});

test('known-BAD host must not appear in sync-topic-positions.ts', () => {
  const host = Buffer.from(
    RETIRED_NPAT_PURGE_KNOWN_BAD_REINTRODUCTION.bannedSubstringBase64,
    'base64',
  ).toString('utf8');
  const src = readFileSync(
    path.join(projectRoot, RETIRED_NPAT_PURGE_KNOWN_BAD_REINTRODUCTION.bannedInRelativePath),
    'utf8',
  );
  assert.doesNotMatch(src, new RegExp(host.replace(/\./g, '\\.'), 'i'));
});

test('sourceCatalog must not contain purge token', () => {
  const src = readFileSync(path.join(projectRoot, 'lib/data/sourceCatalog.ts'), 'utf8');
  assert.doesNotMatch(src, new RegExp(PURGE_TOKEN, 'i'));
});

test('topicPositions meta must not write purge-token fields', () => {
  const sync = readFileSync(path.join(projectRoot, 'scripts/sync-topic-positions.ts'), 'utf8');
  const accessor = readFileSync(path.join(projectRoot, 'lib/data/topicPositions.ts'), 'utf8');
  const json = readFileSync(
    path.join(projectRoot, 'lib/data/generated/topicPositions.json'),
    'utf8',
  );
  const re = new RegExp(PURGE_TOKEN, 'i');
  assert.doesNotMatch(sync, re);
  assert.doesNotMatch(accessor, re);
  assert.doesNotMatch(json, re);
});

test('buildSaidDidDiffs must not default outlet to retired NPAT label', () => {
  const src = readFileSync(path.join(projectRoot, 'lib/data/buildSaidDidDiffs.ts'), 'utf8');
  // Construct without a contiguous purge-token string in a ?? '…' default
  const bad = `?? '` + 'Vote' + 'Smart' + `'`;
  assert.ok(!src.includes(bad.replace(/``/g, "'")));
  assert.doesNotMatch(src, /\?\?\s*'VoteSmart'/);
  assert.doesNotMatch(src, /\?\?\s*"VoteSmart"/);
});
