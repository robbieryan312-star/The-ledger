/**
 * One-time migration: S000033 out of topicPositions mega-bundle into per-category profile files.
 * Run: npx tsx scripts/migrate-s000033-profile.ts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECORD_TOPIC_BUCKETS, classifyTextToRecordTopicId, voteCongressGovUrl, voteTopicId } from '../lib/data/profileRecordByTopic';
import type { PlatformPositionEntry, SaidDidLinkEntry, TopicStatementEntry } from '../lib/data/topicPositions';
import congressSnapshot from '../lib/data/generated/congressVotes.json';
import fecSnapshot from '../lib/data/generated/fecFinance.json';
import topicSnapshot from '../lib/data/generated/topicPositions.json';
import memberDeep from '../lib/data/generated/members/S000033.json';
import { getScheduleAForBioguide } from '../lib/data/fecScheduleA';
import { buildOrgVoteTopicLinks } from '../lib/data/buildOrgVoteTopicLinks';
import { getPoliticianById } from '../lib/data/allPoliticians';
import type { VoteRecord } from '../lib/types';

const BIOGUIDE = 'S000033';
const POLITICIAN_ID = 'bernie-sanders';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles', BIOGUIDE);

const CITATION_RE = /\[\d+\]/;
const BIO_BOILERPLATE_RE =
  /^(Bernie Sanders \(independent\) is a member|Bernie Sanders was born|Though Sanders has held elected office|Former Vice President Joe Biden|This section provides the transcript)/i;

function isGarbagePosition(text: string, topicId: string): boolean {
  const t = text.trim();
  if (!t || t.length < 40) return true;
  if (CITATION_RE.test(t)) return true;
  if (BIO_BOILERPLATE_RE.test(t)) return true;
  if (topicId === 'abortion' && /Iran nuclear deal|Hire More Heroes|filibuster the measure to disapprove/i.test(t)) return true;
  if (topicId === 'public-safety' && /National Defense Authorization Act|S\. 1356|Fiscal Year 2016/i.test(t)) return true;
  if (topicId === 'immigration' && /Joe Biden|democratic socialist|member of the U\.S\. Senate from Vermont/i.test(t)) return true;
  if (topicId === 'economy-taxes' && /member of the U\.S\. Senate from Vermont/i.test(t)) return true;
  if (topicId === 'civil-liberties' && /democratic socialist|Democratic National Convention speech/i.test(t)) return true;
  if (topicId === 'education' && /was born in 1941|University of Chicago/i.test(t)) return true;
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

function congressVotes(): VoteRecord[] {
  const entry =
    (congressSnapshot as { byPoliticianId: Record<string, { votes: VoteRecord[] }> }).byPoliticianId[
      POLITICIAN_ID
    ] ??
    (congressSnapshot as { byPoliticianId: Record<string, { votes: VoteRecord[] }> }).byPoliticianId[BIOGUIDE];
  return entry?.votes ?? [];
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

/** Build saidDidLinks only where a matching official/nonpartisan Said exists in the topic bucket. */
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

async function main(): Promise<void> {
  const raw = topicSnapshot as { byBioguideId: Record<string, Record<string, {
    platformPositions?: PlatformPositionEntry[];
    statements?: TopicStatementEntry[];
    saidDidLinks?: SaidDidLinkEntry[];
  }>> };
  const member = raw.byBioguideId[BIOGUIDE];
  if (!member) throw new Error('S000033 missing from topicPositions.json');

  const politician = getPoliticianById(POLITICIAN_ID);
  if (!politician) throw new Error('bernie-sanders missing from allPoliticians');

  const votes = congressVotes();
  const fecEntry =
    (fecSnapshot as { byPoliticianId: Record<string, unknown> }).byPoliticianId[POLITICIAN_ID] ??
    (fecSnapshot as { byPoliticianId: Record<string, unknown> }).byPoliticianId[BIOGUIDE];

  const byTopicClean: Record<string, {
    statements: TopicStatementEntry[];
    platformPositions: PlatformPositionEntry[];
  }> = {};

  for (const [topicId, data] of Object.entries(member)) {
    const statements = structuredClone(data.statements ?? []);
    const platformPositions = cleanPlatformPositions(data.platformPositions, topicId);
    if (statements.length === 0 && platformPositions.length === 0) continue;
    byTopicClean[topicId] = { statements, platformPositions };
  }

  const saidDidByTopic = buildPairableLinks(byTopicClean, votes);
  // Preserve verified-good links from the bundle byte-for-byte.
  for (const [topicId, data] of Object.entries(member)) {
    for (const link of data.saidDidLinks ?? []) {
      saidDidByTopic[topicId] = saidDidByTopic[topicId] ?? [];
      const dup = saidDidByTopic[topicId].some(
        (l) => l.billNumber === link.billNumber && l.voteDate === link.voteDate,
      );
      if (!dup) saidDidByTopic[topicId].push(structuredClone(link));
    }
  }
  const scheduleRow = getScheduleAForBioguide(BIOGUIDE);
  const orgLinks = scheduleRow ? buildOrgVoteTopicLinks(scheduleRow, votes) : [];

  await mkdir(OUT_DIR, { recursive: true });

  const manifest = {
    bioguideId: BIOGUIDE,
    politicianId: POLITICIAN_ID,
    asOf: new Date().toISOString().slice(0, 10),
    categories: {
      header: 'filled',
      votes: votes.length > 0 ? 'filled' : 'honest-gap',
      finance: fecEntry ? 'filled' : 'honest-gap',
      statements: Object.values(byTopicClean).some((t) => t.statements.length > 0) ? 'filled' : 'honest-gap',
      positions: Object.values(byTopicClean).some((t) => t.platformPositions.length > 0) ? 'filled' : 'honest-gap',
      saidDid: Object.values(saidDidByTopic).flat().length > 0 ? 'filled' : 'honest-gap',
      legislation: 'filled',
      orgVoteLinks: orgLinks.length > 0 ? 'filled' : 'honest-gap',
      news: politician.news?.length ? 'filled' : 'honest-gap',
      trades: 'honest-gap',
      controversies: politician.controversies?.length ? 'filled' : 'honest-gap',
      endorsements: politician.endorsements ? 'filled' : 'honest-gap',
    },
  };

  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    path.join(OUT_DIR, 'header.json'),
    JSON.stringify({ bioguideId: BIOGUIDE, profile: memberDeep.profile, meta: memberDeep.meta }, null, 2) + '\n',
  );
  await writeFile(
    path.join(OUT_DIR, 'votes.json'),
    JSON.stringify({ bioguideId: BIOGUIDE, politicianId: POLITICIAN_ID, votes, asOf: (fecEntry as { asOf?: string })?.asOf ?? manifest.asOf }, null, 2) + '\n',
  );
  await writeFile(path.join(OUT_DIR, 'finance.json'), JSON.stringify({ bioguideId: BIOGUIDE, entry: fecEntry ?? null }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'statements.json'), JSON.stringify({ bioguideId: BIOGUIDE, byTopic: Object.fromEntries(
    Object.entries(byTopicClean).map(([k, v]) => [k, { statements: v.statements }]),
  ) }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'positions.json'), JSON.stringify({ bioguideId: BIOGUIDE, byTopic: Object.fromEntries(
    Object.entries(byTopicClean).map(([k, v]) => [k, { platformPositions: v.platformPositions }]),
  ) }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'saidDid.json'), JSON.stringify({ bioguideId: BIOGUIDE, byTopic: saidDidByTopic }, null, 2) + '\n');
  await writeFile(
    path.join(OUT_DIR, 'legislation.json'),
    JSON.stringify(
      {
        bioguideId: BIOGUIDE,
        status: 'filled',
        sourcePath: 'lib/data/generated/members/S000033.json',
        meta: memberDeep.meta,
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(path.join(OUT_DIR, 'orgVoteLinks.json'), JSON.stringify({ bioguideId: BIOGUIDE, links: orgLinks }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'news.json'), JSON.stringify({ bioguideId: BIOGUIDE, items: politician.news ?? [] }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'trades.json'), JSON.stringify({ bioguideId: BIOGUIDE, status: 'honest-gap', note: 'Senate eFD maintenance — no verified STOCK Act trades on record', trades: [] }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'controversies.json'), JSON.stringify({ bioguideId: BIOGUIDE, items: politician.controversies ?? [] }, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'endorsements.json'), JSON.stringify({ bioguideId: BIOGUIDE, ...politician.endorsements }, null, 2) + '\n');

  // Remove S000033 from mega-bundle
  delete raw.byBioguideId[BIOGUIDE];
  await writeFile(
    path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json'),
    JSON.stringify(raw, null, 2) + '\n',
  );

  const stmtCount = Object.values(byTopicClean).reduce((n, t) => n + t.statements.length, 0);
  const posCount = Object.values(byTopicClean).reduce((n, t) => n + t.platformPositions.length, 0);
  const linkCount = Object.values(saidDidByTopic).flat().length;
  console.log(`Wrote profiles/${BIOGUIDE}/ — statements=${stmtCount} positions=${posCount} saidDidLinks=${linkCount}`);
  console.log('Removed S000033 from topicPositions.json mega-bundle');
}

main();
