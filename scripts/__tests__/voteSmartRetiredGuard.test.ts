/**
 * Build-gated: VoteSmart is RETIRED/DEFUNCT — must not be re-wired as an active key/source.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { SOURCE_CATALOG } from '../../lib/data/sourceCatalog';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('sourceCatalog: votesmart status is retired (not deferred/integrated)', () => {
  const entry = SOURCE_CATALOG.find((e) => e.id === 'votesmart');
  assert.ok(entry, 'votesmart catalog entry must exist as retired record');
  assert.equal(entry.status, 'retired');
  assert.equal(entry.keyRequired, false);
});

test('KEYS.md marks VOTESMART_API_KEY Retired/DEFUNCT', () => {
  const keys = readFileSync(path.join(projectRoot, 'KEYS.md'), 'utf8');
  assert.match(keys, /VOTESMART_API_KEY[\s\S]{0,80}Retired|DEFUNCT/i);
  assert.doesNotMatch(
    keys,
    /\| `VOTESMART_API_KEY` \| \*\*Deferred\*\*/,
  );
});

test('verify-agent-keys does not require VOTESMART_API_KEY in AGENT_KEYS', () => {
  const src = readFileSync(path.join(projectRoot, 'scripts/verify-agent-keys.ts'), 'utf8');
  // Must appear only in RETIRED_KEYS, not in the active AGENT_KEYS array literal body
  assert.match(src, /RETIRED_KEYS/);
  const agentKeysBlock = src.match(/const AGENT_KEYS = \[([\s\S]*?)\] as const/);
  assert.ok(agentKeysBlock, 'AGENT_KEYS block');
  assert.doesNotMatch(agentKeysBlock[1]!, /VOTESMART_API_KEY/);
});

test('sync-topic-positions must not call api.votesmart.org', () => {
  const src = readFileSync(path.join(projectRoot, 'scripts/sync-topic-positions.ts'), 'utf8');
  assert.doesNotMatch(src, /https:\/\/api\.votesmart\.org/);
  assert.doesNotMatch(src, /async function votesmartFetch/);
  assert.match(src, /RETIRED\/DEFUNCT/);
});

test('buildSaidDidDiffs must not default outlet to VoteSmart', () => {
  const src = readFileSync(path.join(projectRoot, 'lib/data/buildSaidDidDiffs.ts'), 'utf8');
  assert.doesNotMatch(src, /\?\?\s*'VoteSmart'/);
  assert.doesNotMatch(src, /\?\?\s*"VoteSmart"/);
});
