/**
 * §6 guards — migrateOne must preserve committed statements/Said→Did on empty re-run.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  PROFILE_MIGRATE_KNOWN_BAD_EMPTY_OVERWRITE,
  PROFILE_MIGRATE_PRESERVE_MINIMUMS,
  PROFILE_MIGRATE_PROFILE_ONLY_SIDECAR,
} from '../../lib/data/__fixtures__/profileMigratePreserve.fixture';
import type { PlatformPositionEntry, SaidDidLinkEntry, TopicStatementEntry } from '../../lib/data/topicPositions';
import {
  countSaidDidLinksInFile,
  countStatementsInFile,
  loadMemberTopicSnapshot,
  preserveExistingSaidDidIfFreshEmpty,
  preserveExistingStatementsIfFreshEmpty,
} from '../lib/profileMigrate';
import {
  type ProfileTopicPositionsByTopic,
  profileTopicPositionsCachePath,
  profileTopicPositionsTmpPath,
  writeProfileTopicPositionsSidecar,
} from '../lib/profileTopicPositionsSidecar';

const PROFILES_ROOT = path.join(process.cwd(), 'lib/data/generated/profiles');

function loadProfileJson(bioguideId: string, name: string): unknown {
  return JSON.parse(readFileSync(path.join(PROFILES_ROOT, bioguideId, name), 'utf8'));
}

function countProfileStatements(bioguideId: string): number {
  return countStatementsInFile(loadProfileJson(bioguideId, 'statements.json') as Parameters<
    typeof countStatementsInFile
  >[0]);
}

function countProfileSaidDid(bioguideId: string): number {
  return countSaidDidLinksInFile(loadProfileJson(bioguideId, 'saidDid.json') as Parameters<
    typeof countSaidDidLinksInFile
  >[0]);
}

function mutableProfileOnlyFixture(): ProfileTopicPositionsByTopic {
  return JSON.parse(JSON.stringify(PROFILE_MIGRATE_PROFILE_ONLY_SIDECAR.byTopic)) as ProfileTopicPositionsByTopic;
}

test('preserveExistingStatementsIfFreshEmpty keeps prior CREC when fresh migrate yields zero', () => {
  const existing = {
    byTopic: {
      healthcare: {
        statements: [
          {
            title: 'Mr. PELOSI. Mr. Speaker, example floor remark on healthcare policy.',
            date: '2026-01-15',
            url: 'https://www.govinfo.gov/app/details/CREC-2026-01-15-pt1-PgH123-4',
            tier: 'official' as const,
            topicId: 'healthcare',
            verbatim: true,
          },
        ],
      },
    },
  };
  const byTopicClean: Record<
    string,
    { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }
  > = {};
  const preserved = preserveExistingStatementsIfFreshEmpty(byTopicClean, 0, existing);
  assert.equal(preserved, 1);
  assert.equal(byTopicClean.healthcare?.statements.length, 1);
});

test('preserveExistingStatementsIfFreshEmpty does not replace fresh non-empty output', () => {
  const fresh: TopicStatementEntry[] = [
    {
      title: 'Fresh collected statement.',
      date: '2026-02-01',
      url: 'https://www.govinfo.gov/app/details/CREC-2026-02-01-pt1-PgH1-1',
      tier: 'official',
      topicId: 'economy-taxes',
      verbatim: true,
    },
  ];
  const byTopicClean = {
    'economy-taxes': { statements: fresh, platformPositions: [] as PlatformPositionEntry[] },
  };
  const existing = {
    byTopic: { healthcare: { statements: [{ title: 'Old', date: '2020-01-01', url: 'https://example.com/a', tier: 'media' as const, topicId: 'healthcare' }] } },
  };
  const preserved = preserveExistingStatementsIfFreshEmpty(byTopicClean, 1, existing);
  assert.equal(preserved, 1);
  assert.equal(byTopicClean['economy-taxes'].statements[0].title, 'Fresh collected statement.');
  assert.equal('healthcare' in byTopicClean, false);
});

test('preserveExistingSaidDidIfFreshEmpty keeps prior pair when fresh migrate yields zero', () => {
  const existing = {
    byTopic: {
      healthcare: [
        {
          topicId: 'healthcare',
          statedPositionDate: '2019-04-10',
          voteDate: '2017-07-25',
          billTitle: 'American Health Care Act of 2017',
          billNumber: 'HR 1628',
          congressGovUrl: 'https://www.congress.gov/bill/115th-congress/house-bill/1628',
          voteChoice: 'Nay' as const,
          tier: 'official' as const,
        },
      ],
    },
  };
  const saidDidByTopic: Record<string, SaidDidLinkEntry[]> = {};
  const preserved = preserveExistingSaidDidIfFreshEmpty(saidDidByTopic, 0, existing);
  assert.equal(preserved, 1);
  assert.equal(saidDidByTopic.healthcare?.[0].billNumber, 'HR 1628');
});

test('known-bad empty overwrite fails P000197 minimum statement/Said→Did counts', () => {
  const bad = PROFILE_MIGRATE_KNOWN_BAD_EMPTY_OVERWRITE;
  assert.equal(countStatementsInFile(bad.statements), 0);
  assert.equal(countSaidDidLinksInFile(bad.saidDid), 0);
  const rule = PROFILE_MIGRATE_PRESERVE_MINIMUMS.find((r) => r.bioguideId === bad.bioguideId)!;
  assert.ok(countStatementsInFile(bad.statements) < rule.minStatements);
  assert.ok(countSaidDidLinksInFile(bad.saidDid) < rule.minSaidDidLinks);
});

test('P000197 on disk meets frozen minimum statements=8 and saidDid=1', () => {
  const rule = PROFILE_MIGRATE_PRESERVE_MINIMUMS.find((r) => r.bioguideId === 'P000197')!;
  const stmtCount = countProfileStatements('P000197');
  const saidDidCount = countProfileSaidDid('P000197');
  assert.ok(
    stmtCount >= rule.minStatements,
    `P000197 statements=${stmtCount} expected >= ${rule.minStatements}`,
  );
  assert.ok(
    saidDidCount >= rule.minSaidDidLinks,
    `P000197 saidDid=${saidDidCount} expected >= ${rule.minSaidDidLinks}`,
  );
});

test('P000197 positions remain honest-gap (empty byTopic)', () => {
  const positions = loadProfileJson('P000197', 'positions.json') as { byTopic?: Record<string, unknown> };
  assert.equal(Object.keys(positions.byTopic ?? {}).length, 0);
});

test('loadMemberTopicSnapshot reads profile-only cache sidecar when member is frozen out of mega-bundle', async () => {
  const fixture = PROFILE_MIGRATE_PROFILE_ONLY_SIDECAR;
  const byTopic = mutableProfileOnlyFixture();
  const cachePath = profileTopicPositionsCachePath(fixture.bioguideId);
  const tmpPath = profileTopicPositionsTmpPath(fixture.bioguideId);
  await rm(cachePath, { force: true });
  await rm(tmpPath, { force: true });

  try {
    const written = await writeProfileTopicPositionsSidecar(fixture.bioguideId, byTopic);
    const loaded = await loadMemberTopicSnapshot(fixture.bioguideId, { byBioguideId: {} });

    assert.equal(written, cachePath);
    assert.equal(existsSync(cachePath), true);
    assert.equal(existsSync(tmpPath), true);
    assert.equal(loaded.healthcare?.statements?.[0]?.title, fixture.byTopic.healthcare.statements[0].title);
  } finally {
    await rm(cachePath, { force: true });
    await rm(tmpPath, { force: true });
  }
});

test('loadMemberTopicSnapshot still reads legacy tmp sidecar for old same-run sync output', async () => {
  const fixture = PROFILE_MIGRATE_PROFILE_ONLY_SIDECAR;
  const byTopic = mutableProfileOnlyFixture();
  const cachePath = profileTopicPositionsCachePath(fixture.bioguideId);
  const tmpPath = profileTopicPositionsTmpPath(fixture.bioguideId);
  await rm(cachePath, { force: true });
  await mkdir(path.dirname(tmpPath), { recursive: true });
  await writeFile(tmpPath, `${JSON.stringify({ byTopic }, null, 2)}\n`, 'utf8');

  try {
    const loaded = await loadMemberTopicSnapshot(fixture.bioguideId, { byBioguideId: {} });
    assert.equal(loaded.healthcare?.statements?.length, 1);
  } finally {
    await rm(tmpPath, { force: true });
  }
});
