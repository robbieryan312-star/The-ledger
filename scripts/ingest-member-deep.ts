/**
 * ingest-member-deep.ts — deep Congress.gov profile per member via Congress.gov API v3.
 * Output: lib/data/generated/members/{bioguideId}.json
 *
 * Run: npm run ingest:member
 *      npm run ingest:member -- --bioguide S000033
 *      npm run ingest:member -- --all
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source, SourceTier } from '../lib/types';
import { RECORD_TOPIC_BUCKETS } from '../lib/data/profileRecordByTopic';
import { loadEnvLocal, sleep } from './lib/ingest-utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated', 'members');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const CHECKPOINT_FILE = '/tmp/ingest-member-deep-checkpoint.json';
const MANIFEST_FILE = path.join(OUT_DIR, 'manifest.json');
const API_BASE = 'https://api.congress.gov/v3';
const PAGE_LIMIT = 250;
const REQUEST_DELAY_MS = 400;
const MAX_COSPONSORED_PER_TOPIC = 50;

const CONGRESS_SOURCE: Source = {
  name: 'Congress.gov',
  url: 'https://www.congress.gov',
  tier: 'official',
};

interface Pagination {
  count?: number;
  next?: string;
}

interface CongressMember {
  bioguideId?: string;
  depiction?: { imageUrl?: string };
  officialWebsiteUrl?: string;
  addressInformation?: { officeAddress?: string; phoneNumber?: string };
  currentMember?: boolean;
}

interface CongressBillRaw {
  title?: string | null;
  number?: string;
  amendmentNumber?: string;
  type?: string;
  congress?: number;
  introducedDate?: string;
  latestAction?: { text?: string };
  url?: string;
  policyArea?: { name?: string };
}

interface LegislationPage {
  sponsoredLegislation?: CongressBillRaw[] | { bills?: CongressBillRaw[] };
  cosponsoredLegislation?: CongressBillRaw[] | { bills?: CongressBillRaw[] };
  pagination?: Pagination;
}

export interface MemberDeepBill {
  topicId: string;
  title: string;
  billNumber: string;
  type?: string;
  congress?: number;
  introducedDate: string;
  latestAction: string | null;
  url: string;
  policyArea: string | null;
  tier: SourceTier;
  role?: 'cosponsor';
}

export interface MemberDeepProfileBlock {
  bioguideId: string;
  officialPhotoUrl: string | null;
  officialWebsite: string | null;
  officeAddress: string | null;
  phone: string | null;
  currentMember: boolean;
  source: Source;
}

export interface MemberDeepTopicBlock {
  sponsored: MemberDeepBill[];
  cosponsored: MemberDeepBill[];
}

export interface MemberDeepProfile {
  meta: {
    bioguideId: string;
    asOf: string;
    source: string;
    totalSponsored: number;
    totalCosponsored: number;
    topicCoverage: Record<string, number>;
  };
  profile: MemberDeepProfileBlock;
  byTopic: Record<string, MemberDeepTopicBlock>;
}

interface LegislatorRow {
  bioguideId: string;
  chamber: string;
}

function parseArgs(): { all: boolean; bioguideId: string } {
  const args = process.argv.slice(2);
  let all = false;
  let bioguideId = 'S000033';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') all = true;
    if (args[i] === '--bioguide' && args[i + 1]) {
      bioguideId = args[i + 1];
      i += 1;
    }
  }
  return { all, bioguideId };
}

function getCongressApiKey(): string {
  const key = process.env.CONGRESS_API_KEY?.trim();
  if (!key) {
    throw new Error('CONGRESS_API_KEY is not configured in .env.local');
  }
  return key;
}

async function congressGet<T>(url: string, key: string): Promise<T> {
  await sleep(REQUEST_DELAY_MS);
  const resolved = new URL(url);
  if (!resolved.searchParams.has('api_key')) {
    resolved.searchParams.set('api_key', key);
  }
  if (!resolved.searchParams.has('format')) {
    resolved.searchParams.set('format', 'json');
  }
  const res = await fetch(resolved.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Congress.gov request failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function buildUrl(bioguideId: string, pathSuffix: string, key: string): string {
  const url = new URL(`${API_BASE}${pathSuffix}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(PAGE_LIMIT));
  return url.toString();
}

function extractLegislationList(
  data: LegislationPage,
  field: 'sponsoredLegislation' | 'cosponsoredLegislation',
): CongressBillRaw[] {
  const raw = data[field];
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.bills)) return raw.bills;
  return [];
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

function congressBillPublicUrl(bill: CongressBillRaw, bioguideId: string): string {
  if (bill.url?.includes('www.congress.gov')) return bill.url;
  const slug = billTypeSlug(bill.type);
  const congress = bill.congress ?? 119;
  const number = bill.number ?? bill.amendmentNumber;
  if (slug && number) {
    return `https://www.congress.gov/bill/${ordinalCongress(congress)}-congress/${slug}/${number}`;
  }
  return `https://www.congress.gov/members/${bioguideId}`;
}

function classifyTopicId(title: string): string {
  const hay = title.toLowerCase();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (bucket.keywords.some((k) => hay.includes(k))) return bucket.id;
  }
  return 'legislation';
}

function mapBill(bill: CongressBillRaw, bioguideId: string, role?: 'cosponsor'): MemberDeepBill | null {
  const title = bill.title?.trim();
  if (!title) return null;

  const billNumber = (bill.number ?? bill.amendmentNumber ?? '').trim();
  return {
    topicId: classifyTopicId(title),
    title,
    billNumber,
    type: bill.type,
    congress: bill.congress,
    introducedDate: bill.introducedDate?.slice(0, 10) ?? '',
    latestAction: bill.latestAction?.text?.trim() ?? null,
    url: congressBillPublicUrl(bill, bioguideId),
    policyArea: bill.policyArea?.name?.trim() ?? null,
    tier: 'official',
    ...(role ? { role } : {}),
  };
}

async function fetchAllLegislation(
  bioguideId: string,
  kind: 'sponsored' | 'cosponsored',
  key: string,
): Promise<MemberDeepBill[]> {
  const pathSuffix =
    kind === 'sponsored'
      ? `/member/${bioguideId}/sponsored-legislation`
      : `/member/${bioguideId}/cosponsored-legislation`;

  let nextUrl: string | undefined = buildUrl(bioguideId, pathSuffix, key);
  const field = kind === 'sponsored' ? 'sponsoredLegislation' : 'cosponsoredLegislation';
  const mapped: MemberDeepBill[] = [];
  let page = 0;

  while (nextUrl) {
    page += 1;
    console.log(`  ${kind} page ${page}…`);
    const pageData: LegislationPage = await congressGet<LegislationPage>(nextUrl, key);
    for (const raw of extractLegislationList(pageData, field)) {
      const bill = mapBill(raw, bioguideId, kind === 'cosponsored' ? 'cosponsor' : undefined);
      if (bill) mapped.push(bill);
    }
    nextUrl = pageData.pagination?.next;
  }

  return mapped;
}

function emptyByTopic(): Record<string, MemberDeepTopicBlock> {
  const out: Record<string, MemberDeepTopicBlock> = {};
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    out[bucket.id] = { sponsored: [], cosponsored: [] };
  }
  return out;
}

function sortByDateDesc(bills: MemberDeepBill[]): MemberDeepBill[] {
  return [...bills].sort(
    (a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime(),
  );
}

function limitCosponsoredPerTopic(byTopic: Record<string, MemberDeepTopicBlock>): void {
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    byTopic[bucket.id].cosponsored = sortByDateDesc(byTopic[bucket.id].cosponsored).slice(
      0,
      MAX_COSPONSORED_PER_TOPIC,
    );
  }
}

function buildTopicCoverage(byTopic: Record<string, MemberDeepTopicBlock>): Record<string, number> {
  const coverage: Record<string, number> = {};
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    const block = byTopic[bucket.id];
    coverage[bucket.id] = block.sponsored.length + block.cosponsored.length;
  }
  return coverage;
}

async function fetchMemberProfile(bioguideId: string, key: string): Promise<MemberDeepProfileBlock> {
  const url = buildUrl(bioguideId, `/member/${bioguideId}`, key).replace(
    `limit=${PAGE_LIMIT}`,
    'limit=1',
  );
  const data = await congressGet<{ member?: CongressMember }>(url, key);
  const member = data.member ?? {};

  return {
    bioguideId,
    officialPhotoUrl: member.depiction?.imageUrl?.trim() ?? null,
    officialWebsite: member.officialWebsiteUrl?.trim() ?? null,
    officeAddress: member.addressInformation?.officeAddress?.trim() ?? null,
    phone: member.addressInformation?.phoneNumber?.trim() ?? null,
    currentMember: member.currentMember === true,
    source: CONGRESS_SOURCE,
  };
}

async function ingestOneMember(bioguideId: string, key: string, asOf: string): Promise<MemberDeepProfile> {
  console.log(`\nDeep ingest for ${bioguideId} via Congress.gov API v3`);

  console.log('Step A — member profile');
  const profile = await fetchMemberProfile(bioguideId, key);

  console.log('Step B — sponsored legislation');
  const sponsored = await fetchAllLegislation(bioguideId, 'sponsored', key);
  console.log(`  ${sponsored.length} sponsored bills mapped`);

  console.log('Step C — cosponsored legislation');
  const cosponsored = await fetchAllLegislation(bioguideId, 'cosponsored', key);
  console.log(`  ${cosponsored.length} cosponsored bills mapped`);

  const byTopic = emptyByTopic();
  for (const bill of sponsored) {
    byTopic[bill.topicId]?.sponsored.push(bill);
  }
  for (const bill of cosponsored) {
    byTopic[bill.topicId]?.cosponsored.push(bill);
  }

  for (const bucket of RECORD_TOPIC_BUCKETS) {
    byTopic[bucket.id].sponsored = sortByDateDesc(byTopic[bucket.id].sponsored);
  }
  limitCosponsoredPerTopic(byTopic);

  const snapshot: MemberDeepProfile = {
    meta: {
      bioguideId,
      asOf,
      source: 'Congress.gov API v3',
      totalSponsored: sponsored.length,
      totalCosponsored: cosponsored.length,
      topicCoverage: buildTopicCoverage(byTopic),
    },
    profile,
    byTopic,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${bioguideId}.json`);
  await writeFile(outFile, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${outFile}`);
  console.log(
    `Coverage: ${sponsored.length} sponsored · ${cosponsored.length} cosponsored · ${Object.values(snapshot.meta.topicCoverage).filter((n) => n > 0).length} topics with bills`,
  );

  return snapshot;
}

async function loadCongressMembers(): Promise<LegislatorRow[]> {
  const raw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as { legislators: LegislatorRow[] };
  return raw.legislators.filter((l) => l.chamber === 'senate' || l.chamber === 'house');
}

async function writeManifest(asOf: string): Promise<void> {
  const files = await readdir(OUT_DIR);
  const bioguideIds = files
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  await writeFile(
    MANIFEST_FILE,
    JSON.stringify({ asOf, count: bioguideIds.length, bioguideIds }, null, 2) + '\n',
    'utf8',
  );
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const { all, bioguideId } = parseArgs();
  const key = getCongressApiKey();
  const asOf = new Date().toISOString().slice(0, 10);

  if (!all) {
    await ingestOneMember(bioguideId, key, asOf);
    await writeManifest(asOf);
    return;
  }

  const members = await loadCongressMembers();
  let checkpoint: Record<string, boolean> = {};
  try {
    checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    /* fresh run */
  }

  console.log(
    `Deep ingest --all: ${members.length} members (${Object.keys(checkpoint).length} checkpointed)`,
  );

  let completed = 0;
  for (let i = 0; i < members.length; i += 1) {
    const leg = members[i];
    if (checkpoint[leg.bioguideId]) continue;

    try {
      await ingestOneMember(leg.bioguideId, key, asOf);
      checkpoint[leg.bioguideId] = true;
      completed += 1;
      await writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint) + '\n', 'utf8');
      if (completed % 5 === 0) {
        await writeManifest(asOf);
      }
    } catch (err) {
      console.error(
        `FAILED ${leg.bioguideId}:`,
        err instanceof Error ? err.message : err,
      );
    }

    if ((i + 1) % 10 === 0 || i === members.length - 1) {
      console.log(`  progress: ${i + 1}/${members.length} processed · ${Object.keys(checkpoint).length} checkpointed`);
    }
  }

  await writeManifest(asOf);
  console.log('');
  console.log('── ingest:member --all complete ──');
  console.log(`Checkpointed: ${Object.keys(checkpoint).length}/${members.length}`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
