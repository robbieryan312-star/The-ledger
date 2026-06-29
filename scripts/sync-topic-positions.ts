/**
 * sync-topic-positions.ts — Ballotpedia platform positions, VoteSmart NPAT stated
 * positions, and Said→Did vote correlation per topic bucket.
 *
 * Output: lib/data/generated/topicPositions.json
 * Run: npm run sync:topic-positions
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceTier, VoteChoice, VoteRecord } from '../lib/types';
import { RECORD_TOPIC_BUCKETS, voteCongressGovUrl, voteTopicId } from '../lib/data/profileRecordByTopic';
import { fetchJson, loadEnvLocal, sleep } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'topicPositions.json');
const LEGISLATORS_FILE = path.join(OUT_DIR, 'currentLegislators.json');
const NATIONAL_VOTES_FILE = path.join(projectRoot, 'data', 'votes', 'national', 'congress-votes.json');
const CHECKPOINT_FILE = '/tmp/sync-topic-positions-checkpoint.json';

const VOTESMART_BASE = 'https://api.votesmart.org';
const BALLOTPEDIA_BASE = 'https://ballotpedia.org';
const BALLOTPEDIA_DELAY_MS = 1500;
const VOTESMART_DELAY_MS = 300;
const MAX_PLATFORM_PER_TOPIC = 3;
const MAX_SAID_DID_LINKS = 3;

const BALLOTPEDIA_UA =
  'TheLedger-DataSync/1.0 (civic research; contact: data@theledger.app)';

interface LegislatorRow {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  chamber: string;
}

interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: SourceTier;
  asOf: string;
}

interface StatedPositionSourceEntry {
  tier: SourceTier;
  source: string;
  url: string;
}

interface SaidDidLinkEntry {
  statedPositionDate: string | null;
  voteDate: string;
  billTitle: string;
  billNumber: string;
  congressGovUrl: string;
  voteChoice: VoteChoice;
  tier: 'official';
}

interface TopicPositionData {
  platformPositions?: PlatformPositionEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
  statements: [];
  saidDidLinks: SaidDidLinkEntry[];
}

interface TopicPositionsSnapshot {
  meta: {
    asOf: string;
    source: string;
    totalMembers: number;
    membersWithData: number;
    membersWithPlatformPositions: number;
    membersWithStatedPosition: number;
    membersWithSaidDidLinks: number;
    perTopicCoverage: Record<string, number>;
    votesmartConfigured: boolean;
    note?: string;
  };
  byBioguideId: Record<string, Record<string, TopicPositionData>>;
}

interface VoteSmartCandidate {
  candidateId?: number | string;
  firstName?: string;
  lastName?: string;
  office?: string;
  officeStateId?: string;
}

interface NpatRow {
  rowText?: string;
  answerText?: string;
  optionText?: string;
}

interface NpatSection {
  name?: string;
  row?: NpatRow | NpatRow[];
}

interface NationalVoteMember {
  bioguideId: string;
  votes: VoteRecord[];
}

const NPAT_SECTION_TO_TOPIC: Array<{ patterns: string[]; topicId: string }> = [
  { patterns: ['health care', 'healthcare', 'medicare', 'medicaid'], topicId: 'healthcare' },
  { patterns: ['immigration', 'border'], topicId: 'immigration' },
  { patterns: ['national security', 'defense', 'military', 'foreign'], topicId: 'defense' },
  { patterns: ['economy', 'budget', 'taxes', 'fiscal', 'trade'], topicId: 'economy' },
  { patterns: ['environment', 'energy', 'climate'], topicId: 'environment' },
  { patterns: ['education'], topicId: 'education' },
  { patterns: ['criminal justice', 'crime', 'police'], topicId: 'crime' },
  { patterns: ['civil rights', 'civil liberties', 'social', 'abortion', 'reproductive'], topicId: 'civil' },
  { patterns: ['judiciary', 'constitutional', 'court'], topicId: 'judiciary' },
];

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textMatchesKeyword(text: string, keywords: string[]): boolean {
  const hay = text.toLowerCase();
  return keywords.some((k) => hay.includes(k.trim().toLowerCase()));
}

function mapNpatSectionToTopic(sectionName: string): string | null {
  const hay = sectionName.toLowerCase();
  for (const row of NPAT_SECTION_TO_TOPIC) {
    if (row.patterns.some((p) => hay.includes(p))) return row.topicId;
  }
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (bucket.keywords.some((k) => hay.includes(k.trim()))) return bucket.id;
  }
  return null;
}

function stripWikitext(text: string): string {
  return text
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/'''+/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPositionSectionTextsFromWikitext(wikitext: string): string[] {
  const texts: string[] = [];
  const headingPatterns = [
    'Political positions',
    'Issues',
    'Campaign themes',
    'Political positions and issues',
  ];

  for (const heading of headingPatterns) {
    const sectionRe = new RegExp(
      `==\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*==([\\s\\S]*?)(?=\\n==[^=]|$)`,
      'i',
    );
    const match = sectionRe.exec(wikitext);
    if (!match) continue;

    const body = match[1];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const bullet = trimmed.match(/^\*+\s*(.+)/);
      if (bullet) {
        const t = stripWikitext(bullet[1]);
        if (t.length >= 20) texts.push(t);
        continue;
      }
      if (/^[|{<#]/.test(trimmed)) continue;
      if (/^=+/.test(trimmed)) continue;
      const t = stripWikitext(trimmed);
      if (t.length >= 30) texts.push(t);
    }
  }

  return texts;
}

async function fetchBallotpediaWikitext(slug: string): Promise<string | null> {
  const title = slug.replace(/ /g, '_');
  const url = `${BALLOTPEDIA_BASE}/wiki/index.php?action=raw&title=${encodeURIComponent(title)}`;
  await sleep(BALLOTPEDIA_DELAY_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BALLOTPEDIA_UA, Accept: 'text/plain' },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return text;
  } catch {
    return null;
  }
}

function ballotpediaSlugCandidates(leg: LegislatorRow): string[] {
  const candidates = new Set<string>();
  const add = (s: string) => {
    const slug = s.trim().replace(/\s+/g, '_');
    if (slug) candidates.add(slug);
  };
  add(leg.name);
  add(`${leg.firstName}_${leg.lastName}`);
  add(`${leg.lastName}_${leg.firstName}`);
  // Common Ballotpedia pattern drops middle initials/parentheticals from display name.
  const firstToken = leg.firstName.split(/\s+/)[0] ?? leg.firstName;
  add(`${firstToken}_${leg.lastName}`);
  return [...candidates];
}

async function fetchBallotpediaPositions(
  leg: LegislatorRow,
  asOf: string,
): Promise<Map<string, PlatformPositionEntry[]>> {
  let wikitext: string | null = null;
  let pageUrl = `${BALLOTPEDIA_BASE}/`;

  for (const slug of ballotpediaSlugCandidates(leg)) {
    const candidate = await fetchBallotpediaWikitext(slug);
    if (candidate) {
      wikitext = candidate;
      pageUrl = `${BALLOTPEDIA_BASE}/${encodeURIComponent(slug.replace(/ /g, '_'))}`;
      break;
    }
  }

  if (!wikitext) {
    console.warn(`  WARN Ballotpedia: no page found for ${leg.name}`);
    return new Map();
  }

  const positionTexts = extractPositionSectionTextsFromWikitext(wikitext);
  if (positionTexts.length === 0) return new Map();

  const byTopic = new Map<string, PlatformPositionEntry[]>();
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');

  for (const bucket of topicBuckets) {
    const matched = positionTexts.filter((t) => textMatchesKeyword(t, bucket.keywords));
    if (matched.length === 0) continue;
    byTopic.set(
      bucket.id,
      matched.slice(0, MAX_PLATFORM_PER_TOPIC).map((text) => ({
        text,
        source: 'Ballotpedia',
        url: pageUrl,
        tier: 'nonpartisan' as const,
        asOf,
      })),
    );
  }
  return byTopic;
}

async function votesmartFetch(
  method: string,
  params: Record<string, string | number>,
  key: string,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ key, o: 'JSON' });
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  await sleep(VOTESMART_DELAY_MS);
  return fetchJson<Record<string, unknown>>(`${VOTESMART_BASE}/${method}?${qs.toString()}`);
}

async function findVoteSmartCandidateId(leg: LegislatorRow, key: string): Promise<number | null> {
  const officeId = leg.chamber === 'senate' ? 6 : 5;
  try {
    const data = await votesmartFetch('Candidates.getByOfficeState', {
      officeId,
      stateId: leg.stateCode,
    }, key);
    const candidates = normalizeArray(
      (data.candidateList as { candidate?: VoteSmartCandidate | VoteSmartCandidate[] } | undefined)?.candidate,
    );

    const firstLower = leg.firstName.toLowerCase();
    const lastLower = leg.lastName.toLowerCase();

    const exact = candidates.find(
      (c) =>
        (c.firstName ?? '').toLowerCase() === firstLower &&
        (c.lastName ?? '').toLowerCase() === lastLower,
    );
    if (exact?.candidateId != null) return Number(exact.candidateId);

    const partial = candidates.find(
      (c) =>
        (c.lastName ?? '').toLowerCase() === lastLower &&
        (c.firstName ?? '').toLowerCase().startsWith(firstLower.slice(0, 3)),
    );
    if (partial?.candidateId != null) return Number(partial.candidateId);
  } catch (err) {
    console.warn(
      `  WARN VoteSmart candidate lookup failed for ${leg.name}: ${err instanceof Error ? err.message : err}`,
    );
  }
  return null;
}

function extractNpatByTopic(
  npatRoot: Record<string, unknown>,
  candidateId: number,
): Map<string, { position: string; date: string | null }> {
  const out = new Map<string, { position: string; date: string | null }>();
  const npat = (npatRoot.npat ?? npatRoot) as {
    section?: NpatSection | NpatSection[];
    electionDate?: string;
  };
  const positionDate = (npat.electionDate ?? '').slice(0, 10) || null;
  const profileUrl = `https://votesmart.org/candidate/${candidateId}/political-courage-test`;

  for (const section of normalizeArray(npat.section)) {
    const topicId = mapNpatSectionToTopic(section.name ?? '');
    if (!topicId) continue;

    const lines: string[] = [];
    for (const row of normalizeArray(section.row)) {
      const answer = (row.answerText ?? row.optionText ?? '').trim();
      if (!answer || /^n\/?a$/i.test(answer) || /^no opinion$/i.test(answer)) continue;
      lines.push(answer);
    }
    if (lines.length === 0) continue;
    out.set(topicId, { position: lines.join('; '), date: positionDate });
  }

  void profileUrl;
  return out;
}

async function fetchVoteSmartNpatByTopic(
  candidateId: number,
  key: string,
): Promise<Map<string, { position: string; date: string | null }>> {
  try {
    const npatData = await votesmartFetch('Npat.getNpat', { candidateId }, key);
    return extractNpatByTopic(npatData, candidateId);
  } catch {
    return new Map();
  }
}

async function loadNationalVotesAsync(): Promise<Map<string, VoteRecord[]>> {
  try {
    const raw = JSON.parse(await readFile(NATIONAL_VOTES_FILE, 'utf8')) as {
      byBioguideId?: Record<string, NationalVoteMember>;
    };
    const map = new Map<string, VoteRecord[]>();
    for (const [id, entry] of Object.entries(raw.byBioguideId ?? {})) {
      map.set(id, entry.votes ?? []);
    }
    return map;
  } catch {
    console.warn('WARN: could not load national votes — Said→Did links will be empty.');
    return new Map();
  }
}

function buildSaidDidLinks(
  topicId: string,
  statedPositionDate: string | null,
  votes: VoteRecord[],
): SaidDidLinkEntry[] {
  const filtered = votes
    .filter((vote) => voteTopicId(vote) === topicId)
    .filter((vote) => {
      if (!statedPositionDate) return true;
      return vote.date >= statedPositionDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_SAID_DID_LINKS);

  return filtered.map((vote) => ({
    statedPositionDate,
    voteDate: vote.date,
    billTitle: vote.billTitle,
    billNumber: vote.billId,
    congressGovUrl: voteCongressGovUrl(vote),
    voteChoice: vote.vote,
    tier: 'official' as const,
  }));
}

function buildSnapshotMeta(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, TopicPositionData>>,
  asOf: string,
  votesmartConfigured: boolean,
): TopicPositionsSnapshot['meta'] {
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');
  const perTopicCoverage: Record<string, number> = {};
  for (const bucket of topicBuckets) perTopicCoverage[bucket.id] = 0;

  let membersWithPlatformPositions = 0;
  let membersWithStatedPosition = 0;
  let membersWithSaidDidLinks = 0;

  for (const memberTopics of Object.values(byBioguideId)) {
    let hasPlatform = false;
    let hasStated = false;
    let hasLinks = false;
    for (const [topicId, data] of Object.entries(memberTopics)) {
      if (data.platformPositions?.length) hasPlatform = true;
      if (data.statedPosition) hasStated = true;
      if (data.saidDidLinks.length) hasLinks = true;
      if (
        data.platformPositions?.length ||
        data.statedPosition ||
        data.saidDidLinks.length
      ) {
        perTopicCoverage[topicId] = (perTopicCoverage[topicId] ?? 0) + 1;
      }
    }
    if (hasPlatform) membersWithPlatformPositions += 1;
    if (hasStated) membersWithStatedPosition += 1;
    if (hasLinks) membersWithSaidDidLinks += 1;
  }

  const membersWithData = Object.values(byBioguideId).filter((m) => Object.keys(m).length > 0).length;

  return {
    asOf,
    source: 'Ballotpedia + VoteSmart NPAT + Congress roll-call votes (Said→Did)',
    totalMembers: members.length,
    membersWithData,
    membersWithPlatformPositions,
    membersWithStatedPosition,
    membersWithSaidDidLinks,
    perTopicCoverage,
    votesmartConfigured,
    note: votesmartConfigured
      ? 'Platform positions from Ballotpedia; NPAT from VoteSmart; vote links from national roll-call snapshot.'
      : 'VoteSmart skipped (no key). Platform positions from Ballotpedia where available.',
  };
}

async function writeSnapshot(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, TopicPositionData>>,
  asOf: string,
  votesmartConfigured: boolean,
): Promise<void> {
  const snapshot: TopicPositionsSnapshot = {
    meta: buildSnapshotMeta(members, byBioguideId, asOf, votesmartConfigured),
    byBioguideId,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  await loadEnvLocal();

  const votesmartKey = (process.env.VOTESMART_API_KEY ?? '').trim();
  console.log('DEBUG: VOTESMART_API_KEY length:', votesmartKey.length);
  if (!votesmartKey) {
    console.warn('WARN: VOTESMART_API_KEY missing — NPAT stated positions will be skipped.');
  }

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const members = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );

  const asOf = new Date().toISOString().slice(0, 10);
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');
  const nationalVotes = await loadNationalVotesAsync();

  let checkpoint: Record<string, boolean> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    /* fresh */
  }

  let byBioguideId: Record<string, Record<string, TopicPositionData>> = {};
  try {
    const prev = JSON.parse(await readFile(OUT_FILE, 'utf8')) as TopicPositionsSnapshot;
    byBioguideId = prev.byBioguideId ?? {};
  } catch {
    /* fresh */
  }

  console.log(
    `Syncing topic positions for ${members.length} members (${Object.keys(checkpoint).length} checkpointed). VoteSmart: ${votesmartKey ? 'yes' : 'SKIP'}`,
  );

  for (let i = 0; i < members.length; i += 1) {
    const leg = members[i];
    if (checkpoint[leg.bioguideId]) continue;

    const memberTopics: Record<string, TopicPositionData> = {};
    const ballotByTopic = await fetchBallotpediaPositions(leg, asOf);

    let npatByTopic = new Map<string, { position: string; date: string | null }>();
    let voteSmartCandidateId: number | null = null;
    if (votesmartKey) {
      voteSmartCandidateId = await findVoteSmartCandidateId(leg, votesmartKey);
      if (voteSmartCandidateId != null) {
        try {
          await votesmartFetch('CandidateBio.getBio', { candidateId: voteSmartCandidateId }, votesmartKey);
        } catch {
          /* optional validation call */
        }
        npatByTopic = await fetchVoteSmartNpatByTopic(voteSmartCandidateId, votesmartKey);
      }
    }

    const memberVotes = nationalVotes.get(leg.bioguideId) ?? [];

    for (const bucket of topicBuckets) {
      const platformPositions = ballotByTopic.get(bucket.id);
      const npat = npatByTopic.get(bucket.id);

      const hasPlatform = platformPositions && platformPositions.length > 0;
      const hasNpat = Boolean(npat?.position);

      if (!hasPlatform && !hasNpat) continue;

      const statedPositionDate = npat?.date ?? platformPositions?.[0]?.asOf ?? null;

      const topicData: TopicPositionData = {
        statements: [],
        saidDidLinks: buildSaidDidLinks(bucket.id, statedPositionDate, memberVotes),
      };

      if (hasPlatform) topicData.platformPositions = platformPositions;
      if (hasNpat && npat) {
        topicData.statedPosition = npat.position;
        topicData.statedPositionSource = {
          tier: 'nonpartisan',
          source: 'VoteSmart',
          url:
            voteSmartCandidateId != null
              ? `https://votesmart.org/candidate/${voteSmartCandidateId}/political-courage-test`
              : 'https://votesmart.org',
        };
      }

      memberTopics[bucket.id] = topicData;
    }

    if (Object.keys(memberTopics).length > 0) {
      byBioguideId[leg.bioguideId] = memberTopics;
    }

    checkpoint[leg.bioguideId] = true;
    await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint) + '\n', 'utf8');

    if ((i + 1) % 10 === 0 || i === members.length - 1) {
      await writeSnapshot(members, byBioguideId, asOf, !!votesmartKey);
      const withData = Object.keys(byBioguideId).length;
      console.log(`  progress: ${i + 1}/${members.length} — ${withData} members with topic position data`);
    }
  }

  await writeSnapshot(members, byBioguideId, asOf, !!votesmartKey);

  const meta = buildSnapshotMeta(members, byBioguideId, asOf, !!votesmartKey);
  console.log('');
  console.log('── sync:topic-positions complete ──');
  console.log(`Members with data: ${meta.membersWithData}/${members.length}`);
  console.log(`Platform positions: ${meta.membersWithPlatformPositions}`);
  console.log(`VoteSmart NPAT positions: ${meta.membersWithStatedPosition}`);
  console.log(`Said→Did links: ${meta.membersWithSaidDidLinks} members`);
  console.log(`Output: ${OUT_FILE}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
