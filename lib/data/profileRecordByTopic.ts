/**
 * profileRecordByTopic.ts — group Tier-1 roll-call votes (and sponsored bills when
 * available) into neutral topic buckets for the "Where they stand — by the record"
 * profile overview. No inferred positions — counts and sourced examples only.
 */
import type { Bill, VoteChoice, VoteRecord } from '../types';
import { getCongressVotes } from './congressVotes';
import { getBills } from './legislation';
import legislatorsSnapshot from './generated/currentLegislators.json';

export interface TopicRecordExample {
  title: string;
  date: string;
  /** Present for roll-call votes; omitted for sponsorship-only rows. */
  vote?: VoteChoice;
  role: 'vote' | 'sponsor';
  congressGovUrl: string;
  billNumber?: string;
}

export interface TopicVoteSplit {
  yea: number;
  nay: number;
  notVoting: number;
  present: number;
}

export interface TopicRecordGroup {
  topicId: string;
  topicName: string;
  voteCount: number;
  voteSplit: TopicVoteSplit;
  sponsoredCount: number;
  examples: TopicRecordExample[];
}

export interface ProfileRecordByTopic {
  topics: TopicRecordGroup[];
  totalVotes: number;
  totalSponsored: number;
  asOf: string;
}

interface TopicBucketDef {
  id: string;
  label: string;
  keywords: string[];
}

/** Fixed ~10 topic buckets for federal record grouping. */
export const RECORD_TOPIC_BUCKETS: TopicBucketDef[] = [
  {
    id: 'healthcare',
    label: 'Healthcare',
    keywords: ['health', 'medicaid', 'medicare', 'hospital', 'prescription', 'drug', 'insurance', 'aca', 'obamacare', 'mental health', 'opioid', 'nursing'],
  },
  {
    id: 'immigration',
    label: 'Immigration & Border',
    keywords: ['immigration', 'border', 'migrant', 'asylum', 'daca', 'dreamer', 'e-verify', 'sanctuary', 'visa', 'refugee', 'deportation', 'ice '],
  },
  {
    id: 'defense',
    label: 'Defense & Foreign Policy',
    keywords: ['defense', 'military', 'armed forces', 'war powers', 'nato', 'ukraine', 'israel', 'iran', 'china', 'taiwan', 'foreign aid', 'pentagon', 'troops', 'hostilities', 'national security'],
  },
  {
    id: 'economy',
    label: 'Economy & Budget',
    keywords: ['budget', 'appropriat', 'fiscal', 'debt', 'spending', 'inflation', 'jobs', 'wage', 'trade', 'tariff', 'tax', 'revenue', 'deficit', 'commerce'],
  },
  {
    id: 'environment',
    label: 'Environment & Energy',
    keywords: ['climate', 'environment', 'energy', 'pollution', 'emission', 'renewable', 'fossil', 'drilling', 'wildlife', 'conservation', 'pollinator', 'everglades', 'water quality'],
  },
  {
    id: 'education',
    label: 'Education',
    keywords: ['education', 'school', 'student', 'teacher', 'university', 'college', 'tuition', 'loan', 'curriculum', 'child care', 'head start'],
  },
  {
    id: 'crime',
    label: 'Crime & Public Safety',
    keywords: ['crime', 'police', 'law enforcement', 'gun', 'firearm', 'weapon', 'sentencing', 'prison', 'fentanyl', 'illicit trade', 'trafficking'],
  },
  {
    id: 'civil',
    label: 'Civil Rights & Liberties',
    keywords: ['civil rights', 'voting rights', 'discrimination', 'privacy', 'surveillance', 'fisa', 'speech', 'abortion', 'reproductive', 'lgbt', 'equality'],
  },
  {
    id: 'judiciary',
    label: 'Judiciary & Nominations',
    keywords: ['judiciary', 'judicial', 'nomination', 'confirm', 'justice', 'court', 'judge', 'attorney general', 'ambassador'],
  },
  {
    id: 'legislation',
    label: 'Federal Legislation',
    keywords: [],
  },
];

const DEFAULT_CONGRESS = 119;

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

/** Map bill display id to a Congress.gov bill URL when possible. */
export function billIdToCongressGovUrl(billId: string, congress = DEFAULT_CONGRESS): string | null {
  const ord = ordinalCongress(congress);
  const compact = billId.replace(/\s+/g, ' ').trim();

  const patterns: Array<{ re: RegExp; slug: string }> = [
    { re: /^H\.?\s*R\.?\s*(\d+)/i, slug: 'house-bill' },
    { re: /^H\.?\s*Con\.?\s*Res\.?\s*(\d+)/i, slug: 'house-concurrent-resolution' },
    { re: /^H\.?\s*J\.?\s*Res\.?\s*(\d+)/i, slug: 'house-joint-resolution' },
    { re: /^H\.?\s*Res\.?\s*(\d+)/i, slug: 'house-resolution' },
    { re: /^S\.?\s*(\d+)/i, slug: 'senate-bill' },
    { re: /^S\.?\s*Con\.?\s*Res\.?\s*(\d+)/i, slug: 'senate-concurrent-resolution' },
    { re: /^S\.?\s*J\.?\s*Res\.?\s*(\d+)/i, slug: 'senate-joint-resolution' },
    { re: /^S\.?\s*Res\.?\s*(\d+)/i, slug: 'senate-resolution' },
  ];

  for (const { re, slug } of patterns) {
    const m = compact.match(re);
    if (m) {
      return `https://www.congress.gov/bill/${ord}-congress/${slug}/${m[1]}`;
    }
  }
  return null;
}

function congressFromVoteId(voteId: string): number {
  const m = voteId.match(/-(\d{3})-/);
  if (m) return Number.parseInt(m[1], 10);
  return DEFAULT_CONGRESS;
}

export function voteCongressGovUrl(vote: VoteRecord): string {
  const sourceUrl = vote.source.url ?? '';
  if (sourceUrl.includes('congress.gov')) return sourceUrl;
  const fromBill = billIdToCongressGovUrl(vote.billId, congressFromVoteId(vote.id));
  if (fromBill) return fromBill;
  return sourceUrl || 'https://www.congress.gov';
}

function classifyRecordText(text: string, category?: string): string {
  const hay = `${text} ${category ?? ''}`.toLowerCase();
  const cat = (category ?? '').toLowerCase();

  if (cat === 'procedural') return 'legislation';
  if (cat === 'budget') return 'economy';
  if (cat === 'judiciary') return 'judiciary';

  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (bucket.keywords.some((k) => hay.includes(k))) return bucket.id;
  }

  if (cat === 'legislation' || hay.includes('bill') || hay.includes('resolution')) {
    return 'legislation';
  }
  return 'legislation';
}

function bucketLabel(id: string): string {
  return RECORD_TOPIC_BUCKETS.find((b) => b.id === id)?.label ?? 'Federal Legislation';
}

function emptySplit(): TopicVoteSplit {
  return { yea: 0, nay: 0, notVoting: 0, present: 0 };
}

function addVoteToSplit(split: TopicVoteSplit, vote: VoteChoice): void {
  if (vote === 'Yea') split.yea += 1;
  else if (vote === 'Nay') split.nay += 1;
  else if (vote === 'Not Voting') split.notVoting += 1;
  else split.present += 1;
}

function sponsoredBillsForBioguide(bioguideId: string): Bill[] {
  return getBills().filter((b) => b.sponsor?.bioguideId === bioguideId);
}

function billTopicId(bill: Bill): string {
  return classifyRecordText(`${bill.title} ${bill.billNumber}`, bill.statusLabel);
}

function voteTopicId(vote: VoteRecord): string {
  const text = [
    vote.billTitle,
    vote.billDescription,
    vote.billSummary ?? '',
    vote.billId,
    vote.voteAction ?? '',
  ].join(' ');
  return classifyRecordText(text, vote.category);
}

function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Build topic-grouped record overview for a Congress member.
 * Returns null when there are no integrated votes or sponsored bills.
 */
export function getProfileRecordByTopic(
  politicianId: string,
  bioguideId?: string,
): ProfileRecordByTopic | null {
  const congressEntry = getCongressVotes(politicianId, bioguideId);
  const votes = congressEntry?.votes ?? [];
  const sponsored = bioguideId ? sponsoredBillsForBioguide(bioguideId) : [];
  const asOf = congressEntry?.asOf ?? sponsored[0]?.asOf ?? new Date().toISOString().slice(0, 10);

  if (votes.length === 0 && sponsored.length === 0) return null;

  const groups = new Map<
    string,
    {
      votes: VoteRecord[];
      sponsored: Bill[];
      split: TopicVoteSplit;
    }
  >();

  for (const bucket of RECORD_TOPIC_BUCKETS) {
    groups.set(bucket.id, { votes: [], sponsored: [], split: emptySplit() });
  }

  for (const vote of votes) {
    const topicId = voteTopicId(vote);
    const g = groups.get(topicId) ?? groups.get('legislation')!;
    g.votes.push(vote);
    addVoteToSplit(g.split, vote.vote);
  }

  for (const bill of sponsored) {
    const topicId = billTopicId(bill);
    const g = groups.get(topicId) ?? groups.get('legislation')!;
    g.sponsored.push(bill);
  }

  const topics: TopicRecordGroup[] = [];

  for (const bucket of RECORD_TOPIC_BUCKETS) {
    const g = groups.get(bucket.id)!;
    const voteCount = g.votes.length;
    const sponsoredCount = g.sponsored.length;
    if (voteCount === 0 && sponsoredCount === 0) continue;

    const examples: TopicRecordExample[] = [];

    for (const vote of sortByDateDesc(g.votes).slice(0, 3)) {
      examples.push({
        title: vote.billTitle,
        date: vote.date,
        vote: vote.vote,
        role: 'vote',
        congressGovUrl: voteCongressGovUrl(vote),
        billNumber: vote.billId !== 'Roll Call Vote' ? vote.billId : undefined,
      });
    }

    if (examples.length < 3) {
      for (const bill of sortByDateDesc(
        g.sponsored.map((b) => ({ ...b, date: b.introducedDate })),
      ).slice(0, 3 - examples.length)) {
        examples.push({
          title: bill.title,
          date: bill.introducedDate,
          role: 'sponsor',
          congressGovUrl: bill.congressGovUrl,
          billNumber: bill.billNumber,
        });
      }
    }

    topics.push({
      topicId: bucket.id,
      topicName: bucket.label,
      voteCount,
      voteSplit: g.split,
      sponsoredCount,
      examples,
    });
  }

  if (topics.length === 0) return null;

  return {
    topics,
    totalVotes: votes.length,
    totalSponsored: sponsored.length,
    asOf,
  };
}

/** Build-time diagnostic only — do not call from page render or API routes. */
export function countProfilesWithTopicRecord(): number {
  const legislators = (legislatorsSnapshot as { legislators: Array<{ bioguideId: string; chamber: string }> }).legislators;
  let count = 0;
  for (const leg of legislators) {
    if (leg.chamber !== 'senate' && leg.chamber !== 'house') continue;
    const record = getProfileRecordByTopic(leg.bioguideId, leg.bioguideId);
    if (record && record.topics.length > 0) count += 1;
  }
  return count;
}
