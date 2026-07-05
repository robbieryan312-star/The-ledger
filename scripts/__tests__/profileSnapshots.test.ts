import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { extractProfileSnapshot, type ProfileSnapshot } from '../../lib/data/profileSnapshot';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_DIR = path.join(projectRoot, 'lib', 'data', '__fixtures__', 'profileSnapshots');

const GOLDEN_MEMBERS = ['S000033', 'M000355'] as const;

function loadFixture(bioguideId: string): ProfileSnapshot {
  const file = path.join(FIXTURE_DIR, `${bioguideId}.snapshot.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as ProfileSnapshot;
}

for (const memberId of GOLDEN_MEMBERS) {
  test(`golden snapshot matches rendered content for ${memberId}`, () => {
    const expected = loadFixture(memberId);
    const actual = extractProfileSnapshot(memberId);
    assert.deepEqual(actual, expected);
  });
}
