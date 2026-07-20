/**
 * Batch #1 gold-profile migration — per-category files under lib/data/generated/profiles/{bioguideId}/.
 * Run: npx tsx scripts/migrate-gold-profiles-batch1.ts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECORD_TOPIC_BUCKETS, classifyTextToRecordTopicId, voteCongressGovUrl, voteTopicId } from '../../lib/data/profileRecordByTopic';
import type { PlatformPositionEntry, SaidDidLinkEntry, TopicPositionData, TopicStatementEntry } from '../../lib/data/topicPositions';
import congressSnapshot from '../../lib/data/generated/congressVotes.json';
import fecSnapshot from '../../lib/data/generated/fecFinance.json';
import { getNationalCongressVotesByBioguide } from '../../lib/data/nationalCongressVotes';
import { getNationalFecFinanceByBioguide } from '../../lib/data/nationalFecFinance';
import topicSnapshot from '../../lib/data/generated/topicPositions.json';
import { getScheduleAForBioguide } from '../../lib/data/fecScheduleA';
import { buildOrgVoteTopicLinks } from '../../lib/data/buildOrgVoteTopicLinks';
import { getPoliticianByBioguide } from '../../lib/data/allPoliticians';
import { pruneSaidDidLinksByTopic } from '../../lib/data/buildSaidDidDiffs';
import {
  hasSanitizedEndorsements,
  sanitizeProfileControversies,
  sanitizeProfileEndorsements,
  sanitizeProfileNews,
} from '../../lib/data/sanitizeProfileUiData';
import type { VoteRecord } from '../../lib/types';

const BATCH = [
  { bioguideId: 'O000172', name: 'Alexandria Ocasio-Cortez' },
  { bioguideId: 'M000355', name: 'Mitch McConnell' },
  { bioguideId: 'M001184', name: 'Thomas Massie' },
  { bioguideId: 'W000817', name: 'Elizabeth Warren' },
  { bioguideId: 'C001098', name: 'Ted Cruz' },
] as const;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');

const CITATION_RE = /\[\d+\]/;
const GENERIC_BIO_BOILERPLATE_RE =
  /^(?:[A-Z][a-z]+(?: [A-Z]\.)? [A-Z][a-z]+(?:-[A-Z][a-z]+)? )?\([a-z]+\) is a member|was born in \d{4}|member of the U\.S\. (Senate|House)|This section provides the transcript/i;

function isGarbagePosition(text: string, topicId: string): boolean {
  const t = text.trim();
  if (!t || t.length < 40) return true;
  if (CITATION_RE.test(t)) return true;
  if (GENERIC_BIO_BOILERPLATE_RE.test(t)) return true;
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

function linkFromVote(vote: VoteRecord, topicId: string): SaidDidLinkEntry {
  return {
    topicId,
    statedPositionDate: null,
    voteDate: vote.date,
    billTitle: vote.billTitle,
    billNumber: vote.billId,
    congressGovUrl: voteCongressGovUrl(vote),
    voteChoice: vote.vote,
    tier: 'official',
  };
}

function buildPairableLinks(
  byTopic: Record<string, { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }>,
  votes: VoteRecord[],
): Record<string, SaidDidLinkEntry[]> {
  const out: Record<string, SaidDidLinkEntry[]> = {};
  const seen = new Set<string>();

  for (const vote of votes) {
    const topicId = voteTopicId(vote);
    const bucket = byTopic[topicId];
    if (!bucket) continue;
    const hasSaid =
      bucket.statements.some((s) => s.tier === 'official' || s.tier === 'media' || s.tier === 'alleged') ||
      bucket.platformPositions.some((p) => {
        const text = p.text.toLowerCase();
        const bill = vote.billId.replace(/\s+/g, '').toLowerCase();
        return text.includes(bill.replace(/\./g, '')) || text.includes(vote.billTitle.toLowerCase().slice(0, 30));
      });
    if (!hasSaid) continue;
    const key = `${topicId}:${vote.billId}:${vote.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out[topicId] = out[topicId] ?? [];
    out[topicId].push(linkFromVote(vote, topicId));
  }

  return out;
}

async function migrateOne(bioguideId: string, displayName: string): Promise<void> {
  const raw = topicSnapshot as {
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

  const member = raw.byBioguideId[bioguideId];
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
    const statements = structuredClone(data.statements ?? []);
    const platformPositions = cleanPlatformPositions(data.platformPositions, topicId);
    if (statements.length === 0 && platformPositions.length === 0) continue;
    byTopicClean[topicId] = { statements, platformPositions };
  }

  let saidDidByTopic = buildPairableLinks(byTopicClean, votes);
  for (const [topicId, data] of Object.entries(member)) {
    for (const link of data.saidDidLinks ?? []) {
      saidDidByTopic[topicId] = saidDidByTopic[topicId] ?? [];
      const dup = saidDidByTopic[topicId].some(
        (l) => l.billNumber === link.billNumber && l.voteDate === link.voteDate,
      );
      if (!dup) saidDidByTopic[topicId].push({ ...structuredClone(link), topicId });
    }
  }

  const topicDataForPrune: Record<string, TopicPositionData> = {};
  for (const topicId of new Set([
    ...Object.keys(byTopicClean),
    ...Object.keys(saidDidByTopic),
  ])) {
    topicDataForPrune[topicId] = {
      statements: byTopicClean[topicId]?.statements ?? [],
      platformPositions: byTopicClean[topicId]?.platformPositions,
      saidDidLinks: saidDidByTopic[topicId] ?? [],
    };
  }
  saidDidByTopic = pruneSaidDidLinksByTopic(topicDataForPrune);

  const scheduleRow = getScheduleAForBioguide(bioguideId);
  const orgLinks = scheduleRow && votes.length > 0 ? buildOrgVoteTopicLinks(scheduleRow, votes) : [];

  const news = sanitizeProfileNews(politician?.news);
  const controversies = sanitizeProfileControversies(politician?.controversies);
  const endorsements = sanitizeProfileEndorsements(politician?.endorsements);

  const OUT_DIR = path.join(profilesRoot, bioguideId);
  await mkdir(OUT_DIR, { recursive: true });

  const asOf = new Date().toISOString().slice(0, 10);
  const linkCount = Object.values(saidDidByTopic).flat().length;
  const stmtCount = Object.values(byTopicClean).reduce((n, t) => n + t.statements.length, 0);
  const posCount = Object.values(byTopicClean).reduce((n, t) => n + t.platformPositions.length, 0);

  const manifest = {
    bioguideId,
    politicianId,
    asOf,
    categories: {
      header: 'filled',
      votes: votes.length > 0 ? 'filled' : 'honest-gap',
      finance: fec ? 'filled' : 'honest-gap',
      statements: stmtCount > 0 ? 'filled' : 'honest-gap',
      positions: posCount > 0 ? 'filled' : 'honest-gap',
      saidDid: linkCount > 0 ? 'filled' : 'honest-gap',
      legislation: 'filled',
      orgVoteLinks: orgLinks.length > 0 ? 'filled' : 'honest-gap',
      news: news.length > 0 ? 'filled' : 'honest-gap',
      trades: 'honest-gap',
      controversies: controversies.length > 0 ? 'filled' : 'honest-gap',
      endorsements: hasSanitizedEndorsements(endorsements) ? 'filled' : 'honest-gap',
    },
  };

  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
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
  await writeFile(
    path.join(OUT_DIR, 'finance.json'),
    JSON.stringify({ bioguideId, entry: fec ?? null }, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'statements.json'),
    JSON.stringify(
      {
        bioguideId,
        byTopic: Object.fromEntries(
          Object.entries(byTopicClean).map(([k, v]) => [k, { statements: v.statements }]),
        ),
      },
      null,
      2,
    ) + '\n',
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
    JSON.stringify({ bioguideId, items: news }, null, 2) + '\n',
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

  delete raw.byBioguideId[bioguideId];

  const gaps = Object.entries(manifest.categories)
    .filter(([, v]) => v === 'honest-gap')
    .map(([k]) => k);
  console.log(
    `${bioguideId} (${displayName}): statements=${stmtCount} positions=${posCount} saidDid=${linkCount} news=${news.length} controversies=${controversies.length} endorsements=${hasSanitizedEndorsements(endorsements) ? 'yes' : 'gap'} | honest-gap: ${gaps.join(', ') || 'none'}`,
  );
}

async function main(): Promise<void> {
  for (const { bioguideId, name } of BATCH) {
    await migrateOne(bioguideId, name);
  }

  await writeFile(
    path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json'),
    JSON.stringify(topicSnapshot, null, 2) + '\n',
  );
  console.log(`Removed ${BATCH.length} members from topicPositions.json mega-bundle`);
}

main();
