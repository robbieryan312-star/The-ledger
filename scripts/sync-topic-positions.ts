/**
 * sync-topic-positions.ts — per-member, per-topic targeted queries for
 * ProfileRecordByTopicPanel "On The Record" data.
 *
 * Sources: Congress.gov sponsored legislation, GovInfo CREC, VoteSmart bio.
 * Output: lib/data/generated/topicPositions.json
 * Run: npm run sync:topic-positions
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceTier } from '../lib/types';
import { RECORD_TOPIC_BUCKETS } from '../lib/data/profileRecordByTopic';
import { fetchJson, loadEnvLocal, sleep } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'topicPositions.json');
const LEGISLATORS_FILE = path.join(OUT_DIR, 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/sync-topic-positions-checkpoint.json';

const CONGRESS_BASE = 'https://api.congress.gov/v3';
const GOVINFO_SEARCH = 'https://api.govinfo.gov/search';
const VOTESMART_BASE = 'https://api.votesmart.org';

const CONGRESS_DELAY_MS = 500;
const GOVINFO_DELAY_MS = 500;
const VOTESMART_DELAY_MS = 300;

const MAX_BILLS_PER_TOPIC = 2;
const GOVINFO_PAGE_SIZE = 3;

interface LegislatorRow {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  chamber: string;
}

interface TopicBillEntry {
  title: string;
  billNumber: string;
  date: string;
  url: string;
  role: 'sponsored';
  tier: SourceTier;
  topicId: string;
}

interface TopicStatementEntry {
  title: string;
  date: string;
  url: string;
  tier: SourceTier;
  topicId: string;
}

interface StatedPositionSourceEntry {
  tier: SourceTier;
  source: string;
  url: string;
}

interface MemberTopicData {
  bills?: TopicBillEntry[];
  statements?: TopicStatementEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
}

interface TopicPositionsSnapshot {
  meta: {
    asOf: string;
    source: string;
    totalMembers: number;
    membersWithData: number;
    perTopicCoverage: Record<string, number>;
    validationKept: number;
    validationDiscarded: number;
    validationPassRatePct: number;
  };
  byBioguideId: Record<string, Record<string, MemberTopicData>>;
}

interface CongressBill {
  title?: string;
  number?: string;
  type?: string;
  congress?: number;
  introducedDate?: string;
  url?: string;
}

interface CongressSponsoredResponse {
  sponsoredLegislation?: {
    bills?: CongressBill[];
  } | CongressBill[];
}

interface GovInfoResult {
  title?: string;
  packageId?: string;
  granuleId?: string;
  dateIssued?: string;
  packageLink?: string;
  granuleText?: string;
}

interface GovInfoSearchResponse {
  results?: GovInfoResult[];
}

interface VoteSmartCandidate {
  candidateId?: number | string;
  firstName?: string;
  lastName?: string;
  office?: string;
  officeStateId?: string;
}

let validationKept = 0;
let validationDiscarded = 0;

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function ordinalCongress(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function billTypeSlug(type?: string): string | null {
  const t = (type ?? '').toUpperCase();
  switch (t) {
    case 'HR': return 'house-bill';
    case 'S': return 'senate-bill';
    case 'HRES': return 'house-resolution';
    case 'SRES': return 'senate-resolution';
    case 'HJRES': return 'house-joint-resolution';
    case 'SJRES': return 'senate-joint-resolution';
    case 'HCONRES': return 'house-concurrent-resolution';
    case 'SCONRES': return 'senate-concurrent-resolution';
    default: return null;
  }
}

function formatBillNumber(type?: string, number?: string): string {
  if (!number) return '';
  const t = (type ?? '').toUpperCase();
  if (t === 'HR') return `H.R. ${number}`;
  if (t === 'S') return `S. ${number}`;
  if (t === 'HRES') return `H.Res. ${number}`;
  if (t === 'SRES') return `S.Res. ${number}`;
  if (t === 'HJRES') return `H.J.Res. ${number}`;
  if (t === 'SJRES') return `S.J.Res. ${number}`;
  if (t === 'HCONRES') return `H.Con.Res. ${number}`;
  if (t === 'SCONRES') return `S.Con.Res. ${number}`;
  return `${t} ${number}`.trim();
}

function congressBillPublicUrl(bill: CongressBill, bioguideId: string): string {
  if (bill.url?.includes('www.congress.gov')) return bill.url;
  const slug = billTypeSlug(bill.type);
  const congress = bill.congress ?? 119;
  if (slug && bill.number) {
    return `https://www.congress.gov/bill/${ordinalCongress(congress)}-congress/${slug}/${bill.number}`;
  }
  return `https://www.congress.gov/members/${bioguideId}`;
}

function govinfoPackageUrl(result: GovInfoResult): string | null {
  if (result.packageLink?.startsWith('http')) return result.packageLink;
  if (result.packageId && result.granuleId) {
    return `https://www.govinfo.gov/app/details/${result.packageId}/granule/${result.granuleId}`;
  }
  if (result.packageId) {
    return `https://www.govinfo.gov/app/details/${result.packageId}`;
  }
  return null;
}

function textMatchesKeyword(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const hay = text.toLowerCase();
  return keywords.some((k) => hay.includes(k.trim().toLowerCase()));
}

function passesValidationGate(
  entry: {
    title?: string;
    position?: string;
    date?: string;
    url?: string;
    tier?: SourceTier;
    topicId?: string;
  },
  keywords: string[],
): boolean {
  const text = `${entry.title ?? ''} ${entry.position ?? ''}`;
  const hasDateOrPosition = Boolean(entry.date?.trim() || entry.position?.trim());
  const hasUrl = Boolean(entry.url?.trim()?.startsWith('http'));
  const hasTier = Boolean(entry.tier);
  const hasTopicId = Boolean(entry.topicId);
  const hasKeyword = textMatchesKeyword(text, keywords);

  if (!hasDateOrPosition || !hasUrl || !hasTier || !hasTopicId || !hasKeyword) {
    validationDiscarded += 1;
    return false;
  }
  validationKept += 1;
  return true;
}

function extractSponsoredBills(data: CongressSponsoredResponse): CongressBill[] {
  const raw = data.sponsoredLegislation;
  if (Array.isArray(raw)) return raw;
  return raw?.bills ?? [];
}

async function fetchSponsoredLegislation(
  bioguideId: string,
  congressKey: string,
): Promise<CongressBill[]> {
  const params = new URLSearchParams({
    api_key: congressKey,
    limit: '20',
    format: 'json',
  });
  const url = `${CONGRESS_BASE}/member/${bioguideId}/sponsored-legislation?${params.toString()}`;
  await sleep(CONGRESS_DELAY_MS);
  try {
    const data = await fetchJson<CongressSponsoredResponse>(url);
    return extractSponsoredBills(data);
  } catch (err) {
    console.warn(`  Congress.gov sponsored bills failed for ${bioguideId}: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function billsForTopic(
  bills: CongressBill[],
  topicId: string,
  keywords: string[],
  bioguideId: string,
): TopicBillEntry[] {
  const matched = bills
    .filter((b) => textMatchesKeyword(b.title ?? '', keywords))
    .sort((a, b) => new Date(b.introducedDate ?? 0).getTime() - new Date(a.introducedDate ?? 0).getTime())
    .slice(0, MAX_BILLS_PER_TOPIC);

  const out: TopicBillEntry[] = [];
  for (const bill of matched) {
    const entry: TopicBillEntry = {
      title: (bill.title ?? '').trim(),
      billNumber: formatBillNumber(bill.type, bill.number),
      date: (bill.introducedDate ?? '').slice(0, 10),
      url: congressBillPublicUrl(bill, bioguideId),
      role: 'sponsored',
      tier: 'official',
      topicId,
    };
    if (passesValidationGate(entry, keywords)) out.push(entry);
  }
  return out;
}

async function fetchGovInfoStatements(
  leg: LegislatorRow,
  topicId: string,
  keywords: string[],
  govinfoKey: string,
): Promise<TopicStatementEntry[]> {
  if (keywords.length === 0) return [];
  const firstKeyword = keywords[0];
  const query = `"${leg.firstName} ${leg.lastName}" ${firstKeyword} AND collection:CREC`;

  await sleep(GOVINFO_DELAY_MS);
  try {
    const data = await fetchJson<GovInfoSearchResponse>(
      `${GOVINFO_SEARCH}?api_key=${encodeURIComponent(govinfoKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          pageSize: GOVINFO_PAGE_SIZE,
          offsetMark: '*',
          sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
        }),
      },
    );

    const out: TopicStatementEntry[] = [];
    const lastNameLower = leg.lastName.toLowerCase();

    for (const result of data.results ?? []) {
      const title = (result.title ?? '').trim();
      const granuleText = (result.granuleText ?? '').trim();
      const dateIssued = (result.dateIssued ?? '').slice(0, 10);
      const url = govinfoPackageUrl(result);

      if (!title.toLowerCase().includes(lastNameLower)) {
        validationDiscarded += 1;
        continue;
      }
      if (!textMatchesKeyword(`${title} ${granuleText}`, keywords)) {
        validationDiscarded += 1;
        continue;
      }
      if (!dateIssued || !url) {
        validationDiscarded += 1;
        continue;
      }

      const entry: TopicStatementEntry = {
        title,
        date: dateIssued,
        url,
        tier: 'official',
        topicId,
      };
      if (passesValidationGate(entry, keywords)) out.push(entry);
    }
    return out;
  } catch (err) {
    console.warn(`  GovInfo failed for ${leg.name} (${topicId}): ${err instanceof Error ? err.message : err}`);
    return [];
  }
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
  try {
    const data = await votesmartFetch('Candidates.getByName', { lastName: leg.lastName }, key);
    const candidates = normalizeArray(
      (data.candidate as VoteSmartCandidate | VoteSmartCandidate[] | undefined) ??
        (data.candidates as { candidate?: VoteSmartCandidate | VoteSmartCandidate[] } | undefined)?.candidate,
    );

    const chamberMatch = (office?: string) => {
      const o = (office ?? '').toLowerCase();
      if (leg.chamber === 'senate') return o.includes('senator') || o.includes('senate');
      return o.includes('representative') || o.includes('house');
    };

    const exact = candidates.find(
      (c) =>
        (c.firstName ?? '').toLowerCase() === leg.firstName.toLowerCase() &&
        c.officeStateId === leg.stateCode &&
        chamberMatch(c.office),
    );
    if (exact?.candidateId != null) return Number(exact.candidateId);

    const byName = candidates.find(
      (c) => (c.firstName ?? '').toLowerCase() === leg.firstName.toLowerCase() && c.officeStateId === leg.stateCode,
    );
    if (byName?.candidateId != null) return Number(byName.candidateId);
  } catch {
    // skip
  }
  return null;
}

function collectBioPositionTexts(bioRoot: Record<string, unknown>): string[] {
  const texts: string[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      const t = node.trim();
      if (t.length > 20) texts.push(t);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (/position|issue|bio|statement|answer|text|summary|description/i.test(key)) {
          walk(value);
        }
      }
    }
  };
  walk(bioRoot);
  return texts;
}

async function fetchVoteSmartPositionsByTopic(
  candidateId: number,
  key: string,
): Promise<Map<string, { position: string; url: string }>> {
  const out = new Map<string, { position: string; url: string }>();
  try {
    const bioData = await votesmartFetch('CandidateBio.getBio', { candidateId }, key);
    const positionTexts = collectBioPositionTexts(bioData);
    const profileUrl = `https://votesmart.org/candidate/${candidateId}`;

    for (const bucket of RECORD_TOPIC_BUCKETS) {
      if (bucket.keywords.length === 0) continue;
      const matches = positionTexts.filter((t) => textMatchesKeyword(t, bucket.keywords));
      if (matches.length === 0) continue;
      const position = matches.slice(0, 2).join('; ');
      const entry = { position, url: profileUrl, tier: 'nonpartisan' as const, topicId: bucket.id };
      if (passesValidationGate({ position, url: profileUrl, tier: 'nonpartisan', topicId: bucket.id }, bucket.keywords)) {
        out.set(bucket.id, { position, url: profileUrl });
      }
    }
  } catch {
    // no bio on file
  }
  return out;
}

function buildSnapshotMeta(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, MemberTopicData>>,
  asOf: string,
  topicBuckets: typeof RECORD_TOPIC_BUCKETS,
): TopicPositionsSnapshot['meta'] {
  const membersWithData = Object.values(byBioguideId).filter((m) => Object.keys(m).length > 0).length;
  const perTopicCoverage: Record<string, number> = {};
  for (const bucket of topicBuckets) perTopicCoverage[bucket.id] = 0;
  for (const member of Object.values(byBioguideId)) {
    for (const topicId of Object.keys(member)) {
      perTopicCoverage[topicId] = (perTopicCoverage[topicId] ?? 0) + 1;
    }
  }
  const totalValidation = validationKept + validationDiscarded;
  const validationPassRatePct =
    totalValidation > 0 ? Math.round((validationKept / totalValidation) * 1000) / 10 : 0;

  return {
    asOf,
    source: 'Congress.gov API v3 + GovInfo CREC + VoteSmart',
    totalMembers: members.length,
    membersWithData,
    perTopicCoverage,
    validationKept,
    validationDiscarded,
    validationPassRatePct,
  };
}

async function writePartialSnapshot(
  members: LegislatorRow[],
  byBioguideId: Record<string, Record<string, MemberTopicData>>,
  asOf: string,
  topicBuckets: typeof RECORD_TOPIC_BUCKETS,
): Promise<void> {
  const snapshot: TopicPositionsSnapshot = {
    meta: buildSnapshotMeta(members, byBioguideId, asOf, topicBuckets),
    byBioguideId,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  await loadEnvLocal();

  const congressKey = (process.env.CONGRESS_API_KEY ?? '').trim();
  const govinfoKey = (
    process.env.GOVINFO_API_KEY ??
    process.env.DATA_GOV_API_KEY ??
    ''
  ).trim();
  const votesmartKey = (process.env.VOTESMART_API_KEY ?? '').trim();

  if (!govinfoKey) {
    console.error('Missing GOVINFO_API_KEY — cannot query Congressional Record.');
    process.exit(1);
  }

  const legislatorsRaw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators: LegislatorRow[];
  };
  const members = legislatorsRaw.legislators.filter(
    (l) => l.chamber === 'senate' || l.chamber === 'house',
  );

  const asOf = new Date().toISOString().slice(0, 10);
  const topicBuckets = RECORD_TOPIC_BUCKETS;

  let checkpoint: Record<string, boolean> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    /* fresh run */
  }

  let byBioguideId: Record<string, Record<string, MemberTopicData>> = {};
  try {
    const prev = JSON.parse(await readFile(OUT_FILE, 'utf8')) as TopicPositionsSnapshot;
    byBioguideId = prev.byBioguideId ?? {};
  } catch {
    /* fresh run */
  }

  const checkpointed = Object.keys(checkpoint).length;
  const savedMembers = Object.keys(byBioguideId).length;
  if (checkpointed > savedMembers) {
    console.warn(
      `Checkpoint has ${checkpointed} members but output file has ${savedMembers} — clearing stale checkpoint (prior run did not persist data).`,
    );
    checkpoint = {};
    await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint));
  }

  console.log(
    `Syncing topic positions for ${members.length} members (${checkpointed} checkpointed, ${savedMembers} saved). Congress: ${congressKey ? 'yes' : 'SKIP'}, GovInfo: yes, VoteSmart: ${votesmartKey ? 'yes' : 'SKIP'}`,
  );

  for (let i = 0; i < members.length; i += 1) {
    const leg = members[i];
    if (checkpoint[leg.bioguideId]) continue;

    const memberTopics: Record<string, MemberTopicData> = {};

    let sponsoredBills: CongressBill[] = [];
    if (congressKey) {
      sponsoredBills = await fetchSponsoredLegislation(leg.bioguideId, congressKey);
    }

    let votesmartByTopic = new Map<string, { position: string; url: string }>();
    if (votesmartKey) {
      const vsId = await findVoteSmartCandidateId(leg, votesmartKey);
      if (vsId != null) {
        votesmartByTopic = await fetchVoteSmartPositionsByTopic(vsId, votesmartKey);
      }
    }

    for (const bucket of topicBuckets) {
      const topicData: MemberTopicData = {};
      const keywords = bucket.keywords;

      if (congressKey && keywords.length > 0) {
        const bills = billsForTopic(sponsoredBills, bucket.id, keywords, leg.bioguideId);
        if (bills.length > 0) topicData.bills = bills;
      }

      const statements = await fetchGovInfoStatements(leg, bucket.id, keywords, govinfoKey);
      if (statements.length > 0) topicData.statements = statements;

      const vs = votesmartByTopic.get(bucket.id);
      if (vs) {
        topicData.statedPosition = vs.position;
        topicData.statedPositionSource = {
          tier: 'nonpartisan',
          source: 'VoteSmart',
          url: vs.url,
        };
      }

      if (topicData.bills?.length || topicData.statements?.length || topicData.statedPosition) {
        memberTopics[bucket.id] = topicData;
      }
    }

    byBioguideId[leg.bioguideId] = memberTopics;

    checkpoint[leg.bioguideId] = true;
    await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint));
    await writePartialSnapshot(members, byBioguideId, asOf, topicBuckets);

    if ((i + 1) % 10 === 0 || i === members.length - 1) {
      const withData = Object.values(byBioguideId).filter((m) => Object.keys(m).length > 0).length;
      console.log(`  progress: ${i + 1}/${members.length} — ${withData} members with topic data`);
    }
  }

  const snapshot: TopicPositionsSnapshot = {
    meta: buildSnapshotMeta(members, byBioguideId, asOf, topicBuckets),
    byBioguideId,
  };

  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  const { membersWithData, perTopicCoverage, validationKept: kept, validationDiscarded: discarded, validationPassRatePct } = snapshot.meta;

  console.log('');
  console.log('── sync:topic-positions complete ──');
  console.log(`Members with ≥1 validated result: ${membersWithData}/${members.length}`);
  console.log('Per-topic coverage:');
  for (const bucket of topicBuckets) {
    console.log(`  ${bucket.id}: ${perTopicCoverage[bucket.id] ?? 0}`);
  }
  console.log(
    `Validation: ${kept} kept / ${discarded} discarded (${validationPassRatePct}% pass rate)`,
  );
  console.log(`Output: ${OUT_FILE}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
