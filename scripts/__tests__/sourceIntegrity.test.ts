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
  SAID_DID_KNOWN_BAD_NOMINEE_MISMATCH,
  SAID_DID_KNOWN_BAD_TAUTOLOGY,
  PLATFORM_KNOWN_BAD_EVENT_NARRATION,
  PLATFORM_KNOWN_BAD_CRAPO_ARREST,
  PLATFORM_KNOWN_BAD_JAN6_CERTIFICATION,
  PLATFORM_KNOWN_BAD_ELECTION_RESULT_IN_FOR,
  PLATFORM_KNOWN_BAD_LETTER_EVENT,
  PLATFORM_KNOWN_BAD_INQUIRY_ANNOUNCEMENT,
  PLATFORM_KNOWN_BAD_BIO_BOILERPLATE,
  PLATFORM_KNOWN_BAD_SITE_FURNITURE,
  PLATFORM_KNOWN_GOOD_MEMBER_POSITION,
  PLATFORM_KNOWN_GOOD_DATED_FIRST_PERSON_STANCE,
  SOURCE_INTEGRITY_KNOWN_BAD_URLS,
  SOURCE_INTEGRITY_AP_ARTICLE_GOOD_URLS,
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
  isThirdPartyCharacterization,
  isBioBoilerplate,
  isSiteFurniture,
  isEventNarration,
  isVoteRestatementSaid,
  isDisqualifiedPlatformPosition,
  normalizeUrlForDedupe,
  saidDidSubjectsOverlap,
  validateNewsFile,
  validateFinanceFile,
  validateTradesFile,
  validateLegislationFile,
  validateOrgVoteLinksFile,
  validateSaidDidFile,
  validatePlatformPositionsFile,
  validateProfileSources,
  validateSaidDidDiffs,
  validateStatementsFile,
  validateTopicPositionsBundle,
} from '../../lib/data/sourceIntegrity';
import {
  buildSaidDidDiffsFromTopicPositions,
  pruneSaidDidLinksByTopic,
} from '../../lib/data/buildSaidDidDiffs';
import { MIGRATED_PROFILE_BIOGUIDES } from '../../lib/data/memberProfile';
import { allPoliticians } from '../../lib/data/allPoliticians';
import { PROFILE_VOTES_SUFFICIENCY_MUST_HAVE } from '../../lib/data/__fixtures__/profileVotesSufficiency.fixture';
import { validateProfileVotesSufficiency } from '../../lib/data/profileVotesSufficiency';
import { hasNationalCongressVotes } from '../../lib/data/nationalCongressVotes';

const PROFILES_ROOT = path.join(process.cwd(), 'lib/data/generated/profiles');
const GENERATED_DIR = path.join(process.cwd(), 'lib/data/generated');

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

test('real AP News 32-hex article URLs are not placeholder false positives', () => {
  for (const { label, url } of SOURCE_INTEGRITY_AP_ARTICLE_GOOD_URLS) {
    assert.equal(isPlaceholderUrl(url), false, `expected AP GOOD "${label}" not to match placeholder pattern`);
    assert.equal(isArticleTypeIntegrityUrl(url), true, `expected AP GOOD "${label}" to pass article integrity`);
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

test('broadened vote-narration patterns are caught by isVoteRestatementSaid', () => {
  assert.equal(isVoteRestatementSaid('Did not vote on:  "Department of Defense..." (HR 6157)'), true);
  assert.equal(isVoteRestatementSaid('On October 20, 2015, the Senate voted against proceeding to a vote on S 2146'), true);
  assert.equal(isVoteRestatementSaid('On January 16, 2014, the Democratic-controlled Senate approved H.R. 3547'), true);
  assert.equal(isVoteRestatementSaid('On November 10, 2015, the Senate passed S 1356 - the National Defense Authorization Act'), true);
  assert.equal(isVoteRestatementSaid('The Senate voted 72-26 for the 1,582 page bill'), true);
  assert.equal(isVoteRestatementSaid('Introduced measure to provide necessary funding for Israel'), false);
});

test('third-party characterizations are detected', () => {
  assert.equal(isThirdPartyCharacterization('"Cruz has arguably been Israel\u2019s most avid defender in the Senate."'), true);
  assert.equal(isThirdPartyCharacterization('\u201cTed Cruz is one of our nation\u2019s leading defenders...\u201d \u2013 NRA executive Vice President Wayne LaPierre'), true);
  assert.equal(isThirdPartyCharacterization('Successfully defended the constitutionality of the Texas Ten Commandments monument'), false);
  assert.equal(isThirdPartyCharacterization('Introduced measure to provide necessary funding for Israel\u2019s missile defense'), false);
});

test('event narration is rejected as member stated position (C001098 Holder/Paul fixture)', () => {
  assert.equal(isEventNarration(PLATFORM_KNOWN_BAD_EVENT_NARRATION), true);
  assert.equal(isEventNarration(PLATFORM_KNOWN_BAD_LETTER_EVENT), true);
  assert.equal(isEventNarration(PLATFORM_KNOWN_BAD_INQUIRY_ANNOUNCEMENT), true);
  assert.equal(isEventNarration(PLATFORM_KNOWN_GOOD_MEMBER_POSITION), false);
  assert.equal(isEventNarration('Successfully defended the constitutionality of the Texas Ten Commandments monument'), false);
});

test('P000197 Phase E Ballotpedia election-result rows are vote restatements', () => {
  assert.equal(isVoteRestatementSaid(PLATFORM_KNOWN_BAD_ELECTION_RESULT_IN_FOR), true);
});

test('bio boilerplate and site furniture are rejected (A000055 bundle fixtures)', () => {
  assert.equal(isBioBoilerplate(PLATFORM_KNOWN_BAD_BIO_BOILERPLATE), true);
  assert.equal(isSiteFurniture(PLATFORM_KNOWN_BAD_SITE_FURNITURE), true);
  assert.equal(isBioBoilerplate(PLATFORM_KNOWN_GOOD_MEMBER_POSITION), false);
  assert.equal(isSiteFurniture(PLATFORM_KNOWN_GOOD_MEMBER_POSITION), false);
});

test('isDisqualifiedPlatformPosition rejects narration fixtures and accepts genuine stances', () => {
  assert.equal(isDisqualifiedPlatformPosition(PLATFORM_KNOWN_BAD_CRAPO_ARREST), true);
  assert.equal(isDisqualifiedPlatformPosition(PLATFORM_KNOWN_BAD_JAN6_CERTIFICATION), true);
  assert.equal(
    isDisqualifiedPlatformPosition('On October 20, 2015, the Senate voted against proceeding to a vote on S 2146'),
    true,
  );
  assert.equal(isDisqualifiedPlatformPosition(PLATFORM_KNOWN_GOOD_DATED_FIRST_PERSON_STANCE), false);
  assert.equal(isDisqualifiedPlatformPosition(PLATFORM_KNOWN_GOOD_MEMBER_POSITION), false);
});

test('topicPositions.json bundle has no disqualified platform positions', () => {
  const bundle = JSON.parse(
    readFileSync(path.join(GENERATED_DIR, 'topicPositions.json'), 'utf8'),
  ) as Parameters<typeof validateTopicPositionsBundle>[0];
  const violations = validateTopicPositionsBundle(bundle);
  assert.equal(
    violations.length,
    0,
    `topicPositions bundle violations (first 10):\n${violations.slice(0, 10).map((v) => `  ${v.path}: ${v.message}`).join('\n')}`,
  );
});

test('destination file validators reject missing required fields (A4)', () => {
  assert.ok(validateFinanceFile({ entry: { source: { name: 'FEC', tier: 'official' } } }, 'finance.json').length > 0);
  assert.ok(validateTradesFile({ trades: [{ source: { name: 'PTR', tier: 'official' } }] }, 'trades.json').length > 0);
  assert.ok(validateLegislationFile({ bioguideId: 'X', meta: {} }, 'legislation.json').length > 0);
  assert.ok(validateOrgVoteLinksFile({ links: [{ voteUrl: 'https://congress.gov' }] }, 'orgVoteLinks.json').length > 0);
  assert.ok(validateSaidDidFile({ byTopic: { climate: [{ billNumber: 'HR 1' }] } }, 'saidDid.json').length > 0);
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

test('known-bad nominee-mismatched Said→Did is rejected (Marvit≠Westercamp)', () => {
  assert.equal(
    saidDidSubjectsOverlap(
      SAID_DID_KNOWN_BAD_NOMINEE_MISMATCH.said.quote,
      SAID_DID_KNOWN_BAD_NOMINEE_MISMATCH.did.action,
    ),
    false,
  );
  assert.equal(isGenuineSaidDidDiff(SAID_DID_KNOWN_BAD_NOMINEE_MISMATCH), false);
  const violations = validateSaidDidDiffs([SAID_DID_KNOWN_BAD_NOMINEE_MISMATCH], 'fixture');
  assert.ok(
    violations.some((v) => v.message.includes('no meaningful overlap')),
    'expected nominee-mismatch fixture to fail overlap guard',
  );
});

test('Said→Did pruning skips unresolved-provenance candidates and keeps later valid statements', () => {
  const pruned = pruneSaidDidLinksByTopic({
    climate: {
      platformPositions: [],
      statements: [
        {
          title: 'Mr. TEST. Mr. President, climate change requires clean energy action.',
          date: '2024-01-01',
          url: 'https://unknown.example.test/record',
          tier: 'official',
          topicId: 'climate',
          verbatim: true,
        },
        {
          title: 'Mr. TEST. Mr. President, climate change requires clean energy action.',
          date: '2024-01-02',
          url: 'https://www.govinfo.gov/content/pkg/CREC-2024-01-02/html/CREC-2024-01-02.htm',
          tier: 'official',
          topicId: 'climate',
          verbatim: true,
        },
      ],
      saidDidLinks: [
        {
          statedPositionDate: '2024-01-02',
          voteDate: '2024-02-01',
          billTitle: 'Climate Change and Clean Energy Act',
          billNumber: 'S. 1',
          congressGovUrl: 'https://www.congress.gov/bill/118th-congress/senate-bill/1',
          voteChoice: 'Yea',
          tier: 'official',
        },
      ],
    },
  });

  assert.equal(pruned.climate?.length, 1);
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

test('migrated members must NOT appear in demo congressVotes.json (single source of truth)', () => {
  const demoSnapshot = JSON.parse(
    readFileSync(path.join(PROFILES_ROOT, '..', 'congressVotes.json'), 'utf8'),
  ) as { byPoliticianId: Record<string, unknown> };
  const demoIds = new Set(Object.keys(demoSnapshot.byPoliticianId));
  const migratedSlugs = ['bernie-sanders', 'mitch-mcconnell', 'alexandria-ocasio-cortez', 'rep-massie'];
  for (const slug of migratedSlugs) {
    assert.equal(demoIds.has(slug), false, `migrated member ${slug} still in demo congressVotes.json`);
  }
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    assert.equal(demoIds.has(bioguideId), false, `migrated member ${bioguideId} still in demo congressVotes.json`);
  }
});

for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
  test(`${bioguideId} profile destination files pass source integrity`, () => {
    const violations = validateProfileSources({
      endorsements: loadProfileJson(bioguideId, 'endorsements.json'),
      controversies: loadProfileJson(bioguideId, 'controversies.json'),
      news: loadProfileJson(bioguideId, 'news.json'),
      finance: loadProfileJson(bioguideId, 'finance.json'),
      trades: loadProfileJson(bioguideId, 'trades.json'),
      legislation: loadProfileJson(bioguideId, 'legislation.json'),
      orgVoteLinks: loadProfileJson(bioguideId, 'orgVoteLinks.json'),
      saidDid: loadProfileJson(bioguideId, 'saidDid.json'),
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

// ── Generated JSON: no mock keys, state-count integrity ──────────────

test('no key matching /mock/i in any generated JSON file', () => {
  const violations: string[] = [];
  function checkObj(obj: unknown, filePath: string, keyPath: string): void {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        if (/mock/i.test(key)) {
          violations.push(`${filePath} → ${keyPath}.${key}`);
        }
        checkObj(val, filePath, `${keyPath}.${key}`);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => checkObj(item, filePath, `${keyPath}[${i}]`));
    }
  }
  const files = readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const data = JSON.parse(readFileSync(path.join(GENERATED_DIR, file), 'utf8'));
    checkObj(data, file, '$');
  }
  assert.equal(violations.length, 0, `Generated JSON files contain mock keys:\n${violations.join('\n')}`);
});

test('roster.json state counts sum equals currentLegislators.json total', () => {
  const roster = JSON.parse(readFileSync(path.join(GENERATED_DIR, 'roster.json'), 'utf8')) as {
    states: Array<{ code: string; activePoliticians: number }>;
  };
  const legislators = JSON.parse(readFileSync(path.join(GENERATED_DIR, 'currentLegislators.json'), 'utf8')) as {
    meta: { count: number };
    legislators: unknown[];
  };
  const stateSum = roster.states.reduce((s, st) => s + st.activePoliticians, 0);
  assert.equal(
    stateSum,
    legislators.legislators.length,
    `roster state counts sum (${stateSum}) ≠ currentLegislators count (${legislators.legislators.length})`,
  );
});

// ── DNU quarantine guard ─────────────────────────────────────────────
const DNU_PATTERNS = [
  /from\s+['"].*\/DNU\//,
  /from\s+['"].*mockPoliticians['"]/,
  /from\s+['"].*additionalPoliticians['"]/,
  /from\s+['"].*mockStockTrades['"]/,
  /from\s+['"].*mockLobbyingGroups['"]/,
  /from\s+['"].*mockElections['"]/,
  /from\s+['"].*mockCounties['"]/,
];

function checkDirForDnuImports(dir: string, violations: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'DNU' || entry.name === '.next') continue;
      checkDirForDnuImports(full, violations);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const content = readFileSync(full, 'utf8');
      for (const pat of DNU_PATTERNS) {
        const match = content.match(pat);
        if (match) {
          violations.push(`${path.relative(process.cwd(), full)}: ${match[0]}`);
        }
      }
    }
  }
}

test('no app code imports from DNU quarantine', () => {
  const appDirs = ['app', 'components', 'lib'].map((d) => path.join(process.cwd(), d));
  const violations: string[] = [];
  for (const dir of appDirs) {
    checkDirForDnuImports(dir, violations);
  }
  assert.equal(violations.length, 0, `DNU imports found:\n${violations.join('\n')}`);
});
