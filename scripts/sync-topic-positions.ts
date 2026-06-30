/**
 * sync-topic-positions.ts — Ballotpedia platform positions, VoteSmart NPAT stated
 * positions, and Said→Did vote correlation per topic bucket.
 *
 * Output: lib/data/generated/topicPositions.json
 * Run: npm run sync:topic-positions
 */
import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceTier, VoteChoice, VoteRecord } from '../lib/types';
import { RECORD_TOPIC_BUCKETS, voteCongressGovUrl, voteTopicId, classifyTextToRecordTopicId } from '../lib/data/profileRecordByTopic';
import { fetchJson, sleep } from './lib/ingest-utils';
import { fetchApprovedMediaStatementsForMember } from './lib/approvedMediaQuotes';

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
const GOVINFO_DELAY_MS = 400;
const MAX_PLATFORM_PER_TOPIC = 3;
const MAX_SAID_DID_LINKS = 3;
const MAX_CREC_STATEMENTS_PER_MEMBER = 12;

const BALLOTPEDIA_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BOILERPLATE_RE =
  /did not complete|click here to|see also:|ballotpedia's candidate connection|surveycta|javascript:/i;

const POSITION_SECTION_IDS = [
  'Political_positions',
  'Issues',
  'Campaign_themes',
  'Political_positions_and_issues',
];

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
  topicId: string;
  statedPositionDate: string | null;
  voteDate: string;
  billTitle: string;
  billNumber: string;
  congressGovUrl: string;
  voteChoice: VoteChoice;
  tier: 'official';
}

interface TopicStatementEntry {
  title: string;
  date: string;
  url: string;
  tier: SourceTier;
  topicId: string;
}

interface TopicPositionData {
  platformPositions?: PlatformPositionEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
  statements: TopicStatementEntry[];
  saidDidLinks: SaidDidLinkEntry[];
}

function parseMemberFlag(): string | null {
  const idx = process.argv.indexOf('--member');
  if (idx === -1) return null;
  const value = process.argv[idx + 1]?.trim();
  return value || null;
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
  { patterns: ['abortion', 'reproductive', 'pro-life', 'pro-choice'], topicId: 'abortion' },
  { patterns: ['artificial intelligence', 'section 230', 'data privacy', 'technology', 'big tech'], topicId: 'technology' },
  { patterns: ['gun', 'firearm', 'second amendment', 'background check'], topicId: 'public-safety' },
  { patterns: ['health care', 'healthcare', 'medicare', 'medicaid'], topicId: 'healthcare' },
  { patterns: ['immigration', 'border'], topicId: 'immigration' },
  { patterns: ['veteran', 'veterans', 'gi bill', 'va benefits'], topicId: 'defense-veterans' },
  { patterns: ['national security', 'defense', 'military', 'foreign'], topicId: 'defense-veterans' },
  { patterns: ['economy', 'budget', 'taxes', 'fiscal', 'trade', 'housing'], topicId: 'economy-taxes' },
  { patterns: ['environment', 'energy', 'climate'], topicId: 'climate' },
  { patterns: ['education'], topicId: 'education' },
  { patterns: ['criminal justice', 'crime', 'police'], topicId: 'public-safety' },
  { patterns: ['civil rights', 'civil liberties', 'social'], topicId: 'civil-liberties' },
  { patterns: ['judiciary', 'constitutional', 'court'], topicId: 'civil-liberties' },
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** Reject Ballotpedia scrape text attributed to another politician (e.g. Biden endorsement copy on Sanders page). */
function isMisattributedPlatformText(text: string, leg: LegislatorRow): boolean {
  const t = text.trim();
  const lower = t.toLowerCase();
  const last = leg.lastName.toLowerCase();
  const first = leg.firstName.split(/\s+/)[0]?.toLowerCase() ?? '';

  if (/^(Joe|Biden|Donald|Trump|Barack|Obama|Hillary|Clinton|Kamala|Harris)\s+/i.test(t)) {
    return true;
  }
  if (/\bJoe will\b/i.test(t) && !/\bbernie\b/i.test(lower)) return true;
  if (/\b(Biden|Trump|Harris|Obama)\s+will\b/i.test(t) && !lower.includes(last)) return true;
  if (/\bTo help reform our broken criminal justice system Joe will\b/i.test(t)) return true;

  const isVoteSummary = /voted (yea|nay)/i.test(t);
  const mentionsMember =
    lower.includes(last) ||
    lower.includes(first) ||
    lower.includes('sanders') ||
    lower.includes('bernie');
  if (!isVoteSummary && !mentionsMember && t.length > 55) return true;

  return false;
}

function extractKeyVoteTopicTexts(html: string): string[] {
  const texts: string[] = [];
  const headingRe = /<h[234][^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/h[234]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null) {
    const id = (match[1] ?? '').replace(/_/g, ' ').toLowerCase();
    if (!id) continue;
    const isTopicHeading =
      /immigration|economy|health|education|climate|environment|public.safety|crime|judiciary|civil|defense|foreign|budget|tax|energy|abortion|reproductive|gun|firearm|veteran|technology|artificial|privacy|section.230/.test(id);
    if (!isTopicHeading) continue;
    const start = match.index + match[0].length;
    const rest = html.slice(start);
    const nextHeading = rest.search(/<h[234][^>]*>/i);
    const sectionHtml = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
    for (const li of sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1] ?? '');
      if (t.length >= 20) texts.push(t);
    }
    for (const p of sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 25) texts.push(t);
    }
  }
  return texts;
}

function extractPositionSectionTextsFromHtml(html: string): string[] {
  const texts: string[] = [];

  for (const sectionId of POSITION_SECTION_IDS) {
    const headingRe = new RegExp(
      `<h[23][^>]*>\\s*<span[^>]*id="${sectionId}"[^>]*>[\\s\\S]*?</h[23]>`,
      'i',
    );
    const match = headingRe.exec(html);
    if (!match) continue;

    const start = match.index + match[0].length;
    const rest = html.slice(start);
    const nextHeading = rest.search(/<h[23][^>]*>/i);
    const sectionHtml = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

    for (const li of sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1] ?? '');
      if (t.length >= 20 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
    for (const p of sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 30 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  texts.push(...extractKeyVoteTopicTexts(html));

  for (const p of html.matchAll(/<p class="survey-response"[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = stripHtml(p[1] ?? '');
    if (t.length >= 20 && !BOILERPLATE_RE.test(t)) texts.push(t);
  }
  for (const ul of html.matchAll(/<ul class="key-messages"[^>]*>([\s\S]*?)<\/ul>/gi)) {
    for (const li of (ul[1] ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = stripHtml(li[1] ?? '');
      if (t.length >= 15 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  const bioRe = /<h2[^>]*id="Biography"[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/i;
  const bioMatch = bioRe.exec(html);
  if (bioMatch) {
    for (const p of (bioMatch[1] ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 45 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  if (texts.length < 2) {
    for (const p of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripHtml(p[1] ?? '');
      if (t.length >= 40 && !BOILERPLATE_RE.test(t)) texts.push(t);
    }
  }

  return [...new Set(texts)];
}

async function fetchBallotpediaHtml(slug: string): Promise<string | null> {
  const pageUrl = `${BALLOTPEDIA_BASE}/${encodeURIComponent(slug.replace(/ /g, '_'))}`;
  await sleep(BALLOTPEDIA_DELAY_MS);
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': BALLOTPEDIA_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok && res.status !== 202) return null;
    const text = await res.text();
    if (text.length < 2000 || !text.includes('Ballotpedia')) return null;
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
  const firstToken = leg.firstName.split(/\s+/)[0] ?? leg.firstName;
  add(`${firstToken}_${leg.lastName}`);
  add(leg.name);
  add(`${leg.firstName}_${leg.lastName}`);
  return [...candidates];
}

async function fetchBallotpediaPositions(
  leg: LegislatorRow,
  asOf: string,
): Promise<Map<string, PlatformPositionEntry[]>> {
  let html: string | null = null;
  let pageUrl = `${BALLOTPEDIA_BASE}/`;

  for (const slug of ballotpediaSlugCandidates(leg)) {
    const candidate = await fetchBallotpediaHtml(slug);
    if (candidate) {
      html = candidate;
      pageUrl = `${BALLOTPEDIA_BASE}/${encodeURIComponent(slug.replace(/ /g, '_'))}`;
      break;
    }
  }

  if (!html) {
    console.warn(`  WARN Ballotpedia: no page found for ${leg.name}`);
    return new Map();
  }

  const positionTexts = extractPositionSectionTextsFromHtml(html);
  if (positionTexts.length === 0) return new Map();

  const byTopic = new Map<string, PlatformPositionEntry[]>();
  const topicBuckets = RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation');

  for (const bucket of topicBuckets) {
    const matched = positionTexts
      .filter((t) => textMatchesKeyword(t, bucket.keywords))
      .filter((t) => !isMisattributedPlatformText(t, leg));
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
  let filtered = votes.filter((vote) => voteTopicId(vote) === topicId);
  if (statedPositionDate) {
    const afterStatement = filtered.filter((vote) => vote.date >= statedPositionDate);
    if (afterStatement.length > 0) {
      filtered = afterStatement;
    }
  }

  const selected = filtered
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_SAID_DID_LINKS);

  return filtered.map((vote) => ({
    topicId,
    statedPositionDate,
    voteDate: vote.date,
    billTitle: vote.billTitle,
    billNumber: vote.billId,
    congressGovUrl: voteCongressGovUrl(vote),
    voteChoice: vote.vote,
    tier: 'official' as const,
  }));
}

interface GovInfoSearchResult {
  title?: string;
  packageId?: string;
  granuleId?: string;
  dateIssued?: string;
}

function crecSpeakerPrefix(leg: LegislatorRow): string {
  if (leg.chamber === 'senate') {
    return `Mr. ${leg.lastName.toUpperCase()}`;
  }
  return `${leg.lastName.toUpperCase()}`;
}

function mapCrecTextToTopic(text: string): string | null {
  const topicId = classifyTextToRecordTopicId(text);
  return topicId === 'legislation' ? null : topicId;
}

function extractCrecSpeechExcerpt(plainText: string, speakerPrefix: string): string | null {
  const idx = plainText.search(new RegExp(speakerPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  if (idx === -1) return null;

  let excerpt = plainText.slice(idx);
  if (/submitted the following resolution|were referred to the Committee|A bill to amend/i.test(excerpt.slice(0, 120))) {
    return null;
  }

  const nextSpeaker = excerpt.slice(speakerPrefix.length + 5).search(/\bMr\.|Ms\.|Mrs\.|The PRESID|The SPEAK/i);
  if (nextSpeaker > 80) {
    excerpt = excerpt.slice(0, speakerPrefix.length + 5 + nextSpeaker);
  }

  excerpt = excerpt.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (!excerpt.toUpperCase().startsWith(speakerPrefix.replace(/\./g, '').slice(0, 10))) {
    const normalizedStart = excerpt.slice(0, 20).toUpperCase();
    if (!normalizedStart.includes('SANDERS') && !normalizedStart.includes(speakerPrefix.split('.')[1]?.trim() ?? '')) {
      return null;
    }
  }
  if (excerpt.length < 80) return null;
  return excerpt.slice(0, 600);
}

function earliestStatementDate(statements: TopicStatementEntry[]): string | null {
  const dates = statements
    .map((s) => s.date)
    .filter(Boolean)
    .sort();
  return dates[0] ?? null;
}

async function fetchGovInfoCrecByTopic(
  leg: LegislatorRow,
  apiKey: string,
): Promise<Map<string, TopicStatementEntry[]>> {
  const byTopic = new Map<string, TopicStatementEntry[]>();
  const speaker = crecSpeakerPrefix(leg);
  const congress = 119;

  await sleep(GOVINFO_DELAY_MS);
  try {
    const searchRes = await fetch(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `collection:CREC AND congress:${congress} AND "${speaker}"`,
        pageSize: MAX_CREC_STATEMENTS_PER_MEMBER,
        offsetMark: '*',
        sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
      }),
    });
    if (!searchRes.ok) return byTopic;

    const searchData = (await searchRes.json()) as { results?: GovInfoSearchResult[] };
    const results = (searchData.results ?? []).filter((r) => r.granuleId && r.packageId);

    for (const result of results) {
      await sleep(GOVINFO_DELAY_MS);
      try {
        const textRes = await fetch(
          `https://api.govinfo.gov/packages/${result.packageId}/granules/${result.granuleId}/htm?api_key=${encodeURIComponent(apiKey)}`,
        );
        if (!textRes.ok) continue;
        const html = await textRes.text();
        const plain = stripHtml(html);
        const speakerHay = plain.toLowerCase().replace(/\./g, '');
        if (!speakerHay.includes(speaker.toLowerCase().replace(/\./g, ''))) continue;

        const excerpt = extractCrecSpeechExcerpt(plain, speaker);
        if (!excerpt) continue;
        if (/Mr\.\s+Sanders,\s+Mr\./i.test(excerpt.slice(0, 80))) continue;

        const topicId = mapCrecTextToTopic(`${result.title ?? ''} ${excerpt}`);
        if (!topicId) continue;

        const date = (result.dateIssued ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
        const url = `https://www.govinfo.gov/app/details/${result.granuleId}`;

        const entry: TopicStatementEntry = {
          title: excerpt,
          date,
          url,
          tier: 'official',
          topicId,
        };

        const existing = byTopic.get(topicId) ?? [];
        if (existing.length >= 2) continue;
        if (existing.some((e) => e.url === url)) continue;
        existing.push(entry);
        byTopic.set(topicId, existing);
      } catch {
        /* skip granule */
      }
    }
  } catch (err) {
    console.warn(
      `  WARN GovInfo CREC failed for ${leg.name}: ${err instanceof Error ? err.message : err}`,
    );
  }

  return byTopic;
}

function buildSnapshotMeta(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, TopicPositionData>>,
  asOf: string,
  votesmartConfigured: boolean,
  govinfoConfigured: boolean,
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
    source: votesmartConfigured
      ? 'Ballotpedia + VoteSmart NPAT + GovInfo CREC + Congress roll-call votes (Said→Did)'
      : govinfoConfigured
        ? 'Ballotpedia + GovInfo CREC + Congress roll-call votes (Said→Did)'
        : 'Ballotpedia + Congress roll-call votes (Said→Did)',
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
  govinfoConfigured: boolean,
): Promise<void> {
  const snapshot: TopicPositionsSnapshot = {
    meta: buildSnapshotMeta(members, byBioguideId, asOf, votesmartConfigured, govinfoConfigured),
    byBioguideId,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  const votesmartKey = (process.env.VOTESMART_API_KEY ?? '').trim();
  const govinfoKey = (process.env.GOVINFO_API_KEY ?? process.env.DATA_GOV_API_KEY ?? '').trim();
  console.log('VoteSmart key length:', votesmartKey.length);
  console.log('GovInfo key length:', govinfoKey.length);
  if (!votesmartKey) {
    console.warn('WARN: VOTESMART_API_KEY missing — NPAT stated positions will be skipped.');
  }

  const memberFilter = parseMemberFlag();

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  let members = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );
  if (memberFilter) {
    members = members.filter((l) => l.bioguideId === memberFilter);
    if (members.length === 0) {
      console.error(`No current legislator found for --member ${memberFilter}`);
      process.exit(1);
    }
  }

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

  if (memberFilter) {
    delete checkpoint[memberFilter];
  }

  console.log(
    `Syncing topic positions for ${members.length} member${members.length === 1 ? '' : 's'} (${Object.keys(checkpoint).length} checkpointed). VoteSmart: ${votesmartKey ? 'yes' : 'SKIP'}`,
  );

  for (let i = 0; i < members.length; i += 1) {
    const leg = members[i];
    if (!memberFilter && checkpoint[leg.bioguideId]) continue;

    const memberTopics: Record<string, TopicPositionData> = {};
    const ballotByTopic = await fetchBallotpediaPositions(leg, asOf);
    const crecByTopic = govinfoKey ? await fetchGovInfoCrecByTopic(leg, govinfoKey) : new Map();
    const mediaStatements = await fetchApprovedMediaStatementsForMember(leg.bioguideId);
    const mediaByTopic = new Map<string, TopicStatementEntry[]>();
    for (const st of mediaStatements) {
      const list = mediaByTopic.get(st.topicId) ?? [];
      if (list.length < 2) list.push(st);
      mediaByTopic.set(st.topicId, list);
    }

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
      const crecStatements = crecByTopic.get(bucket.id) ?? [];
      const mediaForTopic = mediaByTopic.get(bucket.id) ?? [];

      const hasPlatform = platformPositions && platformPositions.length > 0;
      const hasNpat = Boolean(npat?.position);
      const hasCrec = crecStatements.length > 0;
      const hasMedia = mediaForTopic.length > 0;

      if (!hasPlatform && !hasNpat && !hasCrec && !hasMedia) continue;

      const statedPositionDate =
        npat?.date ?? earliestStatementDate([...crecStatements, ...mediaForTopic]) ?? null;
      const npatUrl =
        voteSmartCandidateId != null
          ? `https://votesmart.org/candidate/${voteSmartCandidateId}/political-courage-test`
          : 'https://votesmart.org';

      const topicData: TopicPositionData = {
        statements: [...mediaForTopic, ...crecStatements],
        saidDidLinks: buildSaidDidLinks(bucket.id, statedPositionDate, memberVotes),
      };

      if (hasPlatform) topicData.platformPositions = platformPositions;
      if (hasNpat && npat) {
        topicData.statedPosition = npat.position;
        topicData.statedPositionSource = {
          tier: 'nonpartisan',
          source: 'VoteSmart',
          url: npatUrl,
        };
        topicData.statements = [
          ...mediaForTopic,
          ...crecStatements,
          {
            title: npat.position,
            date: npat.date ?? asOf,
            url: npatUrl,
            tier: 'nonpartisan',
            topicId: bucket.id,
          },
        ];
      }

      memberTopics[bucket.id] = topicData;
    }

    if (Object.keys(memberTopics).length > 0) {
      byBioguideId[leg.bioguideId] = memberTopics;
    }

    checkpoint[leg.bioguideId] = true;
    await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint) + '\n', 'utf8');

    if ((i + 1) % 10 === 0 || i === members.length - 1) {
      await writeSnapshot(members, byBioguideId, asOf, !!votesmartKey, !!govinfoKey);
      const withData = Object.keys(byBioguideId).length;
      console.log(`  progress: ${i + 1}/${members.length} — ${withData} members with topic position data`);
    }
  }

  await writeSnapshot(members, byBioguideId, asOf, !!votesmartKey, !!govinfoKey);

  const meta = buildSnapshotMeta(members, byBioguideId, asOf, !!votesmartKey, !!govinfoKey);
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
