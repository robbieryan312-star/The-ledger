/**
 * Fixture test for profile source URL integrity — rejects fabricated placeholders.
 * Run: npm run test:source-integrity
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SAID_DID_KNOWN_BAD_TAUTOLOGY,
  SOURCE_INTEGRITY_KNOWN_BAD_URLS,
  SOURCE_INTEGRITY_KNOWN_GOOD_URLS,
} from '../../lib/data/__fixtures__/sourceIntegrity.fixture';
import {
  isArticleTypeIntegrityUrl,
  isBareHomepageUrl,
  isFetchVerifiableUrl,
  isGenuineSaidDidDiff,
  isPlaceholderUrl,
  isVoteRestatementSaid,
  validateS000033ProfileSources,
  validateSaidDidDiffs,
} from '../../lib/data/sourceIntegrity';
import { buildSaidDidDiffsFromTopicPositions } from '../../lib/data/buildSaidDidDiffs';

const PROFILE_DIR = path.join(process.cwd(), 'lib/data/generated/profiles/S000033');

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(PROFILE_DIR, name), 'utf8'));
}

test('known-bad placeholder URLs are rejected', () => {
  for (const { label, url } of SOURCE_INTEGRITY_KNOWN_BAD_URLS) {
    assert.equal(isPlaceholderUrl(url), true, `expected BAD "${label}" to match placeholder pattern`);
    assert.equal(isArticleTypeIntegrityUrl(url), false, `expected BAD "${label}" to fail article integrity`);
  }
});

test('known-good article URLs pass integrity checks', () => {
  for (const { label, url } of SOURCE_INTEGRITY_KNOWN_GOOD_URLS) {
    assert.equal(isPlaceholderUrl(url), false, `expected GOOD "${label}" not to match placeholder pattern`);
    assert.equal(isBareHomepageUrl(url), false, `expected GOOD "${label}" not to be a bare homepage`);
    assert.equal(isArticleTypeIntegrityUrl(url), true, `expected GOOD "${label}" to pass article integrity`);
    assert.equal(isFetchVerifiableUrl(url), true, `expected GOOD "${label}" to be fetch-verifiable`);
  }
});

test('bare .gov homepages fail article-type integrity', () => {
  for (const url of ['https://www.congress.gov', 'https://www.fec.gov/', 'https://www.c-span.org']) {
    assert.equal(isBareHomepageUrl(url), true, `expected homepage ${url}`);
    assert.equal(isArticleTypeIntegrityUrl(url), false, `expected article reject ${url}`);
  }
});

test('known-bad vote-as-Said tautology is rejected', () => {
  assert.equal(isVoteRestatementSaid(SAID_DID_KNOWN_BAD_TAUTOLOGY.said.quote), true);
  assert.equal(isGenuineSaidDidDiff(SAID_DID_KNOWN_BAD_TAUTOLOGY), false);
  const violations = validateSaidDidDiffs([SAID_DID_KNOWN_BAD_TAUTOLOGY], 'fixture');
  assert.ok(violations.length > 0, 'expected tautology fixture to produce violations');
});

test('S000033 profile endorsements/controversies/news pass source integrity', () => {
  const violations = validateS000033ProfileSources({
    endorsements: loadJson('endorsements.json'),
    controversies: loadJson('controversies.json'),
    news: loadJson('news.json'),
  });
  assert.equal(
    violations.length,
    0,
    `source integrity violations:\n${violations.map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
  );
});

test('S000033 saidDid diffs are genuine stated-position vs vote pairs', () => {
  const diffs = buildSaidDidDiffsFromTopicPositions('S000033', 'Bernie Sanders');
  assert.ok(diffs.length > 0, 'expected at least one genuine Said→Did diff');

  const violations = validateSaidDidDiffs(diffs, 'S000033.saidDid');
  assert.equal(
    violations.length,
    0,
    `saidDid integrity violations:\n${violations.map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
  );

  for (const diff of diffs) {
    assert.equal(isVoteRestatementSaid(diff.said.quote), false, `vote-as-Said shipped: ${diff.said.quote.slice(0, 60)}…`);
    assert.notEqual(diff.said.verbatim, false, 'verbatim:false stated position shipped');
    assert.ok(diff.said.quote.trim().length > 0, 'empty said quote');
    assert.ok(diff.did.action.trim().length > 0, 'empty did action');
    assert.ok(diff.said.url.trim().length > 0, 'said side missing url');
    assert.ok(diff.did.url.trim().length > 0, 'did side missing url');
  }
});
