/**
 * Fixture test for profile source URL integrity — rejects fabricated placeholders.
 * Run: npm run test:source-integrity
 */
import { readFileSync, readdirSync } from 'node:fs';
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
  validateProfileSources,
  validateSaidDidDiffs,
} from '../../lib/data/sourceIntegrity';
import { buildSaidDidDiffsFromTopicPositions } from '../../lib/data/buildSaidDidDiffs';
import { MIGRATED_PROFILE_BIOGUIDES } from '../../lib/data/memberProfile';
import { allPoliticians } from '../../lib/data/allPoliticians';
import { PROFILE_VOTES_SUFFICIENCY_MUST_HAVE } from '../../lib/data/__fixtures__/profileVotesSufficiency.fixture';
import { validateProfileVotesSufficiency } from '../../lib/data/profileVotesSufficiency';
import { hasNationalCongressVotes } from '../../lib/data/nationalCongressVotes';

const PROFILES_ROOT = path.join(process.cwd(), 'lib/data/generated/profiles');

function loadProfileJson(bioguideId: string, name: string): unknown {
  return JSON.parse(readFileSync(path.join(PROFILES_ROOT, bioguideId, name), 'utf8'));
}

function politicianNameFor(bioguideId: string): string {
  return allPoliticians.find((p) => p.bioguideId === bioguideId)?.name ?? bioguideId;
}

test('known-bad URLs fail article-type integrity', () => {
  for (const { label, url } of SOURCE_INTEGRITY_KNOWN_BAD_URLS) {
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

test('every migrated profile directory is present under profiles/', () => {
  const onDisk = readdirSync(PROFILES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    assert.ok(onDisk.includes(bioguideId), `missing profiles/${bioguideId}/ directory`);
  }
});

test('migrated profiles render as integrated records, not lightweight placeholders', () => {
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    const profile = allPoliticians.find((p) => p.bioguideId === bioguideId);
    assert.ok(profile, `${bioguideId} missing from allPoliticians`);
    assert.notEqual(profile.recordType, 'lightweight', `${bioguideId} is still gated as lightweight`);
    assert.doesNotMatch(profile.bio, /not yet integrated/i, `${bioguideId} bio still says profile data is not integrated`);
  }
});

test('migrated current members must not have unmarked votes=0 (sufficiency guard)', () => {
  const violations: string[] = [];
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    const votesFile = loadProfileJson(bioguideId, 'votes.json') as Parameters<
      typeof validateProfileVotesSufficiency
    >[1];
    const headerFile = loadProfileJson(bioguideId, 'header.json') as Parameters<
      typeof validateProfileVotesSufficiency
    >[2];
    const v = validateProfileVotesSufficiency(bioguideId, votesFile, headerFile);
    if (v) violations.push(`${v.bioguideId}: ${v.message}`);
  }
  assert.equal(
    violations.length,
    0,
    `profile vote sufficiency violations:\n${violations.map((m) => `  ${m}`).join('\n')}`,
  );
});

test('W000817 and C001098 must resolve votes from national snapshot (fixture regression)', () => {
  for (const bioguideId of PROFILE_VOTES_SUFFICIENCY_MUST_HAVE) {
    assert.equal(hasNationalCongressVotes(bioguideId), true, `${bioguideId} missing from national votes`);
    const votesFile = loadProfileJson(bioguideId, 'votes.json') as { votes: unknown[] };
    assert.ok(votesFile.votes.length > 0, `${bioguideId} profile votes.json still empty after national wiring`);
  }
});

for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
  test(`${bioguideId} profile endorsements/controversies/news pass source integrity`, () => {
    const violations = validateProfileSources({
      endorsements: loadProfileJson(bioguideId, 'endorsements.json'),
      controversies: loadProfileJson(bioguideId, 'controversies.json'),
      news: loadProfileJson(bioguideId, 'news.json'),
    });
    assert.equal(
      violations.length,
      0,
      `${bioguideId} source integrity violations:\n${violations.map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
    );
  });

  test(`${bioguideId} saidDid diffs are genuine stated-position vs vote pairs`, () => {
    const name = politicianNameFor(bioguideId);
    const diffs = buildSaidDidDiffsFromTopicPositions(bioguideId, name);
    const manifest = loadProfileJson(bioguideId, 'manifest.json') as {
      categories: { saidDid: string };
    };

    if (manifest.categories.saidDid === 'honest-gap') {
      assert.equal(diffs.length, 0, `${bioguideId} manifest says honest-gap but diffs were built`);
      return;
    }

    assert.ok(diffs.length > 0, `${bioguideId}: expected at least one genuine Said→Did diff`);

    const violations = validateSaidDidDiffs(diffs, `${bioguideId}.saidDid`);
    assert.equal(
      violations.length,
      0,
      `${bioguideId} saidDid integrity violations:\n${violations.map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
    );

    for (const diff of diffs) {
      assert.equal(isVoteRestatementSaid(diff.said.quote), false, `vote-as-Said shipped: ${diff.said.quote.slice(0, 60)}…`);
      assert.notEqual(diff.said.verbatim, false, 'verbatim:false vote restatement shipped');
      assert.ok(diff.said.quote.trim().length > 0, 'empty said quote');
      assert.ok(diff.did.action.trim().length > 0, 'empty did action');
      assert.ok(diff.said.url.trim().length > 0, 'said side missing url');
      assert.ok(diff.did.url.trim().length > 0, 'did side missing url');
    }
  });
}
