/**
 * Shared profile migration — writes per-destination files under
 * lib/data/generated/profiles/{bioguideId}/ and removes member from topicPositions bundle.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECORD_TOPIC_BUCKETS, classifyTextToRecordTopicId } from '../../lib/data/profileRecordByTopic';
import type { PlatformPositionEntry, SaidDidLinkEntry, TopicPositionData, TopicStatementEntry } from '../../lib/data/topicPositions';
import congressSnapshot from '../../lib/data/generated/congressVotes.json';
import fecSnapshot from '../../lib/data/generated/fecFinance.json';
import { getNationalCongressVotesByBioguide } from '../../lib/data/nationalCongressVotes';
import { getNationalFecFinanceByBioguide } from '../../lib/data/nationalFecFinance';
import { getScheduleAForBioguide } from '../../lib/data/fecScheduleA';
import { buildOrgVoteTopicLinks } from '../../lib/data/buildOrgVoteTopicLinks';
import { getPoliticianByBioguide } from '../../lib/data/allPoliticians';
import { pruneSaidDidLinksByTopic } from '../../lib/data/buildSaidDidDiffs';
import { stripCrecFloorOpener } from '../../lib/data/crecDisplayText';
import { isDisqualifiedPlatformPosition } from '../../lib/data/sourceIntegrity';
import { buildCrecSaidDidLinks } from '../../lib/data/saidDidVoteContext';
import {
  hasSanitizedEndorsements,
  sanitizeProfileControversies,
  sanitizeProfileEndorsements,
  sanitizeProfileNews,
} from '../../lib/data/sanitizeProfileUiData';
import { isProceduralCrecText } from './crecProceduralFilter';
import { syncProfileManifestFromDisk } from './profileManifestSync';
import type { VoteRecord } from '../../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const topicPositionsPath = path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json');

const CITATION_RE = /\[\d+\]/;
const GENERIC_BIO_BOILERPLATE_RE =
  /^(?:[A-Z][a-z]+(?: [A-Z]\.)? [A-Z][a-z]+(?:-[A-Z][a-z]+)? )?\([a-z]+\) is a member|was born in \d{4}|member of the U\.S\. (Senate|House)|This section provides the transcript/i;

function isGarbagePosition(text: string, topicId: string): boolean {
  const t = text.trim();
  if (!t || t.length < 40) return true;
  if (CITATION_RE.test(t)) return true;
  if (GENERIC_BIO_BOILERPLATE_RE.test(t)) return true;
  if (isDisqualifiedPlatformPosition(t)) return true;
  const classified = classifyTextToRecordTopicId(t);
  if (classified !== 'legislation' && classified !== topicId) {
    const topicKeywords = RECORD_TOPIC_BUCKETS.find((b) => b.id === topicId)?.keywords ?? [];
    const hay = t.toLowerCase();
    const anyMatch = topicKeywords.some((k) => hay.includes(k.toLowerCase()));
    if (!anyMatch && /Voted (Yea|Nay) on:/i.test(t)) {
      return classified !== topicId;
    }
  }
  return false;
}

function cleanPlatformPositions(
  positions: PlatformPositionEntry[] | undefined,
  topicId: string,
): PlatformPositionEntry[] {
  return (positions ?? []).filter((p) => !isGarbagePosition(p.text, topicId));
}

function cleanStatements(statements: TopicStatementEntry[]): TopicStatementEntry[] {
  return statements
    .filter((s) => {
      if (s.tier === 'official' && /\/CREC-/i.test(s.url)) {
        return !isProceduralCrecText(s.title);
      }
      return true;
    })
    .map((s) => {
      if (s.tier === 'official' && /\/CREC-/i.test(s.url) && !s.displayText) {
        return { ...s, displayText: stripCrecFloorOpener(s.title), verbatim: s.verbatim ?? true };
      }
      return s;
    });
}

type StatementsFileShape = {
  byTopic?: Record<string, { statements?: TopicStatementEntry[] }>;
};

type SaidDidFileShape = {
  byTopic?: Record<string, SaidDidLinkEntry[]>;
};

export function countStatementsInFile(file: StatementsFileShape | null | undefined): number {
  if (!file?.byTopic) return 0;
  return Object.values(file.byTopic).reduce((n, t) => n + (t.statements?.length ?? 0), 0);
}

export function countSaidDidLinksInFile(file: SaidDidFileShape | null | undefined): number {
  if (!file?.byTopic) return 0;
  return Object.values(file.byTopic).flat().length;
}

/** §6: never overwrite committed statements with empty when a positions-only migrate re-runs. */
export function preserveExistingStatementsIfFreshEmpty(
  byTopicClean: Record<string, { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }>,
  freshStatementCount: number,
  existing: StatementsFileShape | null | undefined,
): number {
  if (freshStatementCount > 0 || !existing) {
    return freshStatementCount;
  }
  if (countStatementsInFile(existing) === 0) return 0;

  for (const [topicId, topicData] of Object.entries(existing.byTopic ?? {})) {
    const statements = cleanStatements(structuredClone(topicData.statements ?? []));
    if (statements.length === 0) continue;
    byTopicClean[topicId] = {
      statements,
      platformPositions: byTopicClean[topicId]?.platformPositions ?? [],
    };
  }
  return Object.values(byTopicClean).reduce((n, t) => n + t.statements.length, 0);
}

/** §6: never overwrite committed Said→Did with empty when a positions-only migrate re-runs. */
export function preserveExistingSaidDidIfFreshEmpty(
  saidDidByTopic: Record<string, SaidDidLinkEntry[]>,
  freshLinkCount: number,
  existing: SaidDidFileShape | null | undefined,
): number {
  if (freshLinkCount > 0 || !existing) {
    return freshLinkCount;
  }
  if (countSaidDidLinksInFile(existing) === 0) return 0;

  for (const [topicId, links] of Object.entries(existing.byTopic ?? {})) {
    if (links.length === 0) continue;
    saidDidByTopic[topicId] = links.map((link) => ({
      ...structuredClone(link),
      topicId: link.topicId ?? topicId,
    }));
  }
  return Object.values(saidDidByTopic).flat().length;
}

function resolvePoliticianId(bioguideId: string): string {
  return getPoliticianByBioguide(bioguideId)?.id ?? bioguideId;
}

function congressVotes(politicianId: string, bioguideId: string): VoteRecord[] {
  const national = getNationalCongressVotesByBioguide(bioguideId, politicianId);
  if (national?.votes.length) return national.votes;
  const byPolitician = (congressSnapshot as { byPoliticianId: Record<string, { votes: VoteRecord[] }> })
    .byPoliticianId;
  const entry = byPolitician[politicianId] ?? byPolitician[bioguideId];
  return entry?.votes ?? [];
}

function fecEntry(politicianId: string, bioguideId: string): unknown {
  const national = getNationalFecFinanceByBioguide(bioguideId);
  if (national) return national;
  const byPolitician = (fecSnapshot as { byPoliticianId: Record<string, unknown> }).byPoliticianId;
  return byPolitician[politicianId] ?? byPolitician[bioguideId] ?? null;
}

function buildPairableLinks(
  byTopic: Record<string, { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }>,
  votes: VoteRecord[],
): Record<string, SaidDidLinkEntry[]> {
  // M4 contract: Said→Did from verified CREC floor speech only (not media/alleged/platform).
  return buildCrecSaidDidLinks(byTopic, votes);
}

export interface MigrationResult {
  bioguideId: string;
  displayName: string;
  stmtCount: number;
  posCount: number;
  linkCount: number;
  newsCount: number;
  controversiesCount: number;
  endorsementsFilled: boolean;
  honestGaps: string[];
  manifest: Record<string, string>;
}

export async function migrateOne(
  bioguideId: string,
  displayName: string,
  topicSnapshot: {
    byBioguideId: Record<
      string,
      Record<
        string,
        {
          platformPositions?: PlatformPositionEntry[];
          statements?: TopicStatementEntry[];
          saidDidLinks?: SaidDidLinkEntry[];
        }
      >
    >;
  },
): Promise<MigrationResult> {
  const member = topicSnapshot.byBioguideId[bioguideId];
  if (!member) throw new Error(`${bioguideId} missing from topicPositions.json`);

  const politicianId = resolvePoliticianId(bioguideId);
  const politician = getPoliticianByBioguide(bioguideId);
  const votes = congressVotes(politicianId, bioguideId);
  const fec = fecEntry(politicianId, bioguideId);

  const memberDeep = JSON.parse(
    await readFile(path.join(projectRoot, 'lib', 'data', 'generated', 'members', `${bioguideId}.json`), 'utf8'),
  );

  const byTopicClean: Record<string, { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }> =
    {};

  for (const [topicId, data] of Object.entries(member)) {
    const statements = cleanStatements(structuredClone(data.statements ?? []));
    const platformPositions = cleanPlatformPositions(data.platformPositions, topicId);
    if (statements.length === 0 && platformPositions.length === 0) continue;
    byTopicClean[topicId] = { statements, platformPositions };
  }

  // §6: union committed profile CREC so a re-sync search pool cannot drop older floor speeches.
  let existingStatements: StatementsFileShape | null = null;
  let existingSaidDid: SaidDidFileShape | null = null;
  try {
    existingStatements = JSON.parse(
      await readFile(path.join(profilesRoot, bioguideId, 'statements.json'), 'utf8'),
    ) as StatementsFileShape;
  } catch {
    /* no prior */
  }
  try {
    existingSaidDid = JSON.parse(
      await readFile(path.join(profilesRoot, bioguideId, 'saidDid.json'), 'utf8'),
    ) as SaidDidFileShape;
  } catch {
    /* no prior */
  }
  if (existingStatements?.byTopic) {
    for (const [topicId, data] of Object.entries(existingStatements.byTopic)) {
      const priors = cleanStatements(structuredClone(data.statements ?? []));
      if (priors.length === 0) continue;
      const bucket = byTopicClean[topicId] ?? { statements: [], platformPositions: [] };
      for (const prior of priors) {
        if (prior.tier === 'official' && !/\/CREC-/i.test(prior.url ?? '')) continue;
        if (bucket.statements.some((s) => s.url === prior.url || s.title.trim() === prior.title.trim())) {
          continue;
        }
        bucket.statements.push(prior);
      }
      byTopicClean[topicId] = bucket;
    }
  }

  // CREC-only Said→Did (M4). Skip merging sync mega-bundle saidDidLinks (thin titles / wrong topics).
  let saidDidByTopic = buildPairableLinks(byTopicClean, votes);

  const topicDataForPrune: Record<string, TopicPositionData> = {};
  for (const topicId of new Set([...Object.keys(byTopicClean), ...Object.keys(saidDidByTopic)])) {
    topicDataForPrune[topicId] = {
      statements: byTopicClean[topicId]?.statements ?? [],
      platformPositions: byTopicClean[topicId]?.platformPositions,
      saidDidLinks: saidDidByTopic[topicId] ?? [],
    };
  }
  saidDidByTopic = pruneSaidDidLinksByTopic(topicDataForPrune);

  const scheduleRow = getScheduleAForBioguide(bioguideId);
  const orgLinks = scheduleRow && votes.length > 0 ? buildOrgVoteTopicLinks(scheduleRow, votes) : [];

  const OUT_DIR = path.join(profilesRoot, bioguideId);
  await mkdir(OUT_DIR, { recursive: true });

  let stmtCount = Object.values(byTopicClean).reduce((n, t) => n + t.statements.length, 0);
  let linkCount = Object.values(saidDidByTopic).flat().length;
  stmtCount = preserveExistingStatementsIfFreshEmpty(byTopicClean, stmtCount, existingStatements);
  linkCount = preserveExistingSaidDidIfFreshEmpty(saidDidByTopic, linkCount, existingSaidDid);

  // Preserve RSS-collected news if sync:news-rss ran before apply.
  let news = sanitizeProfileNews(politician?.news);
  let newsStatus: 'filled' | 'honest-gap' | 'fetch-failed' | undefined;
  let newsNote: string | undefined;
  const existingNewsPath = path.join(OUT_DIR, 'news.json');
  try {
    const existingNews = JSON.parse(await readFile(existingNewsPath, 'utf8')) as {
      items?: Parameters<typeof sanitizeProfileNews>[0];
      status?: 'filled' | 'honest-gap' | 'fetch-failed';
      note?: string;
    };
    if (existingNews.items?.length) {
      news = sanitizeProfileNews(existingNews.items);
    }
    if (existingNews.status) {
      newsStatus = existingNews.status;
      newsNote = existingNews.note;
    }
  } catch {
    /* no prior news.json */
  }
  if (news.length > 0) {
    newsStatus = 'filled';
  } else if (newsStatus !== 'fetch-failed') {
    newsStatus = 'honest-gap';
    if (newsNote && /relevant article/.test(newsNote)) {
      newsNote = undefined;
    }
  }

  let controversies = sanitizeProfileControversies(politician?.controversies);
  let endorsements = sanitizeProfileEndorsements(politician?.endorsements);

  try {
    const existingControversies = JSON.parse(
      await readFile(path.join(OUT_DIR, 'controversies.json'), 'utf8'),
    ) as { items?: Parameters<typeof sanitizeProfileControversies>[0] };
    if ((existingControversies.items?.length ?? 0) > 0 && controversies.length === 0) {
      controversies = sanitizeProfileControversies(existingControversies.items);
    }
  } catch {
    /* no prior controversies.json */
  }

  try {
    const existingEndorsements = JSON.parse(
      await readFile(path.join(OUT_DIR, 'endorsements.json'), 'utf8'),
    ) as Parameters<typeof sanitizeProfileEndorsements>[0];
    if (
      existingEndorsements &&
      hasSanitizedEndorsements(existingEndorsements) &&
      !hasSanitizedEndorsements(endorsements)
    ) {
      endorsements = sanitizeProfileEndorsements(existingEndorsements);
    }
  } catch {
    /* no prior endorsements.json */
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const posCount = Object.values(byTopicClean).reduce((n, t) => n + t.platformPositions.length, 0);

  await writeFile(
    path.join(OUT_DIR, 'header.json'),
    JSON.stringify({ bioguideId, profile: memberDeep.profile, meta: memberDeep.meta }, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'votes.json'),
    JSON.stringify(
      {
        bioguideId,
        politicianId,
        votes,
        asOf: (fec as { asOf?: string } | null)?.asOf ?? asOf,
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(path.join(OUT_DIR, 'finance.json'), JSON.stringify({ bioguideId, entry: fec ?? null }, null, 2) + '\n');

  let statementsPayload: {
    bioguideId: string;
    byTopic: Record<string, { statements: TopicStatementEntry[] }>;
    status?: string;
    note?: string;
  } = {
    bioguideId,
    byTopic: Object.fromEntries(
      Object.entries(byTopicClean).map(([k, v]) => [k, { statements: v.statements }]),
    ),
  };
  try {
    const existingStatements = JSON.parse(
      await readFile(path.join(OUT_DIR, 'statements.json'), 'utf8'),
    ) as { status?: string; note?: string };
    if (existingStatements.status) statementsPayload.status = existingStatements.status;
    if (existingStatements.note) statementsPayload.note = existingStatements.note;
  } catch {
    /* no prior statements.json */
  }
  if (stmtCount > 0) {
    delete statementsPayload.status;
    delete statementsPayload.note;
  }
  await writeFile(
    path.join(OUT_DIR, 'statements.json'),
    JSON.stringify(statementsPayload, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'positions.json'),
    JSON.stringify(
      {
        bioguideId,
        byTopic: Object.fromEntries(
          Object.entries(byTopicClean).map(([k, v]) => [k, { platformPositions: v.platformPositions }]),
        ),
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'saidDid.json'),
    JSON.stringify({ bioguideId, byTopic: saidDidByTopic }, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'legislation.json'),
    JSON.stringify(
      {
        bioguideId,
        status: 'filled',
        sourcePath: `lib/data/generated/members/${bioguideId}.json`,
        meta: memberDeep.meta,
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'orgVoteLinks.json'),
    JSON.stringify({ bioguideId, links: orgLinks }, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'news.json'),
    JSON.stringify(
      {
        bioguideId,
        status: newsStatus,
        items: news,
        ...(newsNote ? { note: newsNote } : {}),
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'trades.json'),
    JSON.stringify(
      {
        bioguideId,
        status: 'honest-gap',
        note: 'No verified STOCK Act trades integrated for this profile',
        trades: [],
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'controversies.json'),
    JSON.stringify({ bioguideId, items: controversies }, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'endorsements.json'),
    JSON.stringify({ bioguideId, ...endorsements }, null, 2) + '\n',
  );

  await syncProfileManifestFromDisk(bioguideId);

  delete topicSnapshot.byBioguideId[bioguideId];

  const manifest = JSON.parse(
    await readFile(path.join(OUT_DIR, 'manifest.json'), 'utf8'),
  ) as { categories: Record<string, string> };

  const honestGaps = Object.entries(manifest.categories)
    .filter(([, v]) => v === 'honest-gap')
    .map(([k]) => k);

  return {
    bioguideId,
    displayName,
    stmtCount,
    posCount,
    linkCount,
    newsCount: news.length,
    controversiesCount: controversies.length,
    endorsementsFilled: hasSanitizedEndorsements(endorsements),
    honestGaps,
    manifest: manifest.categories,
  };
}

export async function migrateMembers(bioguides: string[]): Promise<MigrationResult[]> {
  type TopicSnapshot = {
    byBioguideId: Record<
      string,
      Record<
        string,
        {
          platformPositions?: PlatformPositionEntry[];
          statements?: TopicStatementEntry[];
          saidDidLinks?: SaidDidLinkEntry[];
        }
      >
    >;
  };
  const topicSnapshot = JSON.parse(await readFile(topicPositionsPath, 'utf8')) as TopicSnapshot;

  const legislatorsRaw = JSON.parse(
    await readFile(path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json'), 'utf8'),
  ) as { legislators: Array<{ bioguideId: string; name: string }> };

  const results: MigrationResult[] = [];
  for (const bioguideId of bioguides) {
    const leg = legislatorsRaw.legislators.find((l) => l.bioguideId === bioguideId);
    const displayName = leg?.name ?? bioguideId;
    results.push(await migrateOne(bioguideId, displayName, topicSnapshot));
  }

  await writeFile(topicPositionsPath, JSON.stringify(topicSnapshot, null, 2) + '\n');
  console.log(`Removed ${bioguides.length} member(s) from topicPositions.json mega-bundle`);
  return results;
}
