/**
 * Fixture test for profile source URL integrity — rejects fabricated placeholders.
 * Run: npm run test:source-integrity
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEWS_KNOWN_BAD_BARE_HOMEPAGE_URL,
  NEWS_KNOWN_BAD_UNAPPROVED_OUTLET,
  SAID_DID_KNOWN_BAD_SUBJECT_MISMATCH,
  SAID_DID_KNOWN_BAD_TAUTOLOGY,
  SOURCE_INTEGRITY_KNOWN_BAD_URLS,
  SOURCE_INTEGRITY_KNOWN_GOOD_URLS,
  STATEMENT_KNOWN_BAD_NON_VERBATIM_ALLEGED,
} from '../../lib/data/__fixtures__/sourceIntegrity.fixture';
import {
  headlineSimilarity,
  isApprovedNewsOutlet,
  isArticleTypeIntegrityUrl,
  isBareHomepageUrl,
  isFetchVerifiableUrl,
  isGenuineSaidDidDiff,
  isPlaceholderUrl,
  isVoteRestatementSaid,
  normalizeUrlForDedupe,
  saidDidSubjectsOverlap,
  validateNewsFile,
  validatePlatformPositionsFile,
  validateProfileSources,
  validateSaidDidDiffs,
  validateStatementsFile,
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

test('known-bad subject-mismatched Said→Did is rejected', () => {
  assert.equal(saidDidSubjectsOverlap(SAID_DID_KNOWN_BAD_SUBJECT_MISMATCH.said.quote, SAID_DID_KNOWN_BAD_SUBJECT_MISMATCH.did.action), false);
  assert.equal(isGenuineSaidDidDiff(SAID_DID_KNOWN_BAD_SUBJECT_MISMATCH), false);
  const violations = validateSaidDidDiffs([SAID_DID_KNOWN_BAD_SUBJECT_MISMATCH], 'fixture');
  assert.ok(
    violations.some((v) => v.message.includes('no meaningful overlap')),
    'expected subject-mismatch fixture to fail overlap guard',
  );
});

test('known-bad non-verbatim alleged statement fails statements integrity', () => {
  const violations = validateStatementsFile(
    {
      byTopic: {
        climate: { statements: [STATEMENT_KNOWN_BAD_NON_VERBATIM_ALLEGED.statement] },
      },
    },
    'fixture',
  );
  assert.ok(violations.length > 0, 'expected non-verbatim alleged fixture to produce violations');
});

test('known-bad unapproved-outlet news item fails outlet guard', () => {
  assert.equal(isApprovedNewsOutlet(NEWS_KNOWN_BAD_UNAPPROVED_OUTLET.item.url), false);
  const violations = validateNewsFile({ items: [NEWS_KNOWN_BAD_UNAPPROVED_OUTLET.item] }, 'fixture');
  assert.ok(
    violations.some((v) => v.message.includes('unapproved news outlet')),
    'expected unapproved-outlet fixture to fail news outlet guard',
  );
});

test('known-bad bare-homepage-url news item fails article url guard', () => {
  assert.equal(isBareHomepageUrl(NEWS_KNOWN_BAD_BARE_HOMEPAGE_URL.item.url), true);
  const violations = validateNewsFile({ items: [NEWS_KNOWN_BAD_BARE_HOMEPAGE_URL.item] }, 'fixture');
  assert.ok(
    violations.some((v) => v.message.includes('bare homepage url')),
    'expected bare-homepage fixture to fail news article-url guard',
  );
});

test('approved news outlets pass the outlet guard, known-good article URLs pass', () => {
  for (const url of [
    'https://apnews.com/article/example-slug-00203974',
    'https://www.nytimes.com/2025/01/01/us/politics/example.html',
    'https://www.reuters.com/world/us/example-2025-01-01/',
    'https://www.wusf.org/politics/2025-01-01/example',
  ]) {
    assert.equal(isApprovedNewsOutlet(url), true, `expected ${url} to be an approved outlet`);
  }
  assert.equal(isApprovedNewsOutlet('https://www.breitbart.com/example'), false);
});

test('news url dedupe normalization collapses tracking params and trailing slash', () => {
  assert.equal(
    normalizeUrlForDedupe('https://www.apnews.com/article/example?utm_source=twitter'),
    normalizeUrlForDedupe('https://apnews.com/article/example/'),
  );
});

test('news headline fuzzy-match flags near-identical wire vs republish headlines', () => {
  const a = 'Sanders reintroduces Medicare for All Act with record cosponsors';
  const b = 'Sanders Reintroduces Medicare For All Act With Record Cosponsors';
  assert.ok(headlineSimilarity(a, b) > 0.9, 'expected near-identical headlines to score above 0.9');
  const c = 'Massie votes no on Ukraine aid package';
  assert.ok(headlineSimilarity(a, c) < 0.9, 'expected unrelated headlines to score below 0.9');
});

test('duplicate normalized urls within a single news.json file fail the dedupe guard', () => {
  const dupeItem = {
    id: 'dupe-1',
    url: 'https://apnews.com/article/example-2025',
    source: { name: 'AP News', url: 'https://apnews.com/article/example-2025', tier: 'nonpartisan' as const, date: '2025-01-01' },
    isOpinion: false,
  };
  const dupeItem2 = {
    ...dupeItem,
    id: 'dupe-2',
    url: 'https://www.apnews.com/article/example-2025/',
  };
  const violations = validateNewsFile({ items: [dupeItem, dupeItem2] }, 'fixture');
  assert.ok(
    violations.some((v) => v.message.includes('duplicate normalized url')),
    'expected duplicate normalized url to be rejected',
  );
});

test('every migrated profile directory is present under profiles/', () => {
  const onDisk = readdirSync(PROFILES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    assert.ok(onDisk.includes(bioguideId), `missing profiles/${bioguideId}/ directory`);
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

  test(`${bioguideId} platform positions pass source integrity`, () => {
    const violations = validatePlatformPositionsFile(
      loadProfileJson(bioguideId, 'positions.json') as Parameters<typeof validatePlatformPositionsFile>[0],
      `${bioguideId}.positions.json`,
    );
    assert.equal(
      violations.length,
      0,
      `${bioguideId} positions.json integrity violations:\n${violations.map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
    );
  });

  test(`${bioguideId} statements pass verbatim integrity`, () => {
    const violations = validateStatementsFile(
      loadProfileJson(bioguideId, 'statements.json') as Parameters<typeof validateStatementsFile>[0],
      `${bioguideId}.statements.json`,
    );
    assert.equal(
      violations.length,
      0,
      `${bioguideId} statement verbatim violations:\n${violations.map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
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
