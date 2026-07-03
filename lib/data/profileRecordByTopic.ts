/**
 * profileRecordByTopic.ts — group Tier-1 roll-call votes (and sponsored bills when
 * available) into neutral topic buckets for the "Where they stand — by the record"
 * profile overview. No inferred positions — counts and sourced examples only.
 */
import type { Bill, VoteChoice, VoteRecord } from '../types';
import { getCongressVotes } from './congressVotes';
import { getBills } from './legislation';
import { normalizeTopicId } from './topicAliases';

export interface TopicRecordExample {
  title: string;
  date: string;
  /** Present for roll-call votes; omitted for sponsorship-only rows. */
  vote?: VoteChoice;
  role: 'vote' | 'sponsor';
  congressGovUrl: string;
  billNumber?: string;
  /** Plain-language CRS summary from Congress.gov when synced. */
  billSummary?: string;
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

/** Raw sync / record buckets — aligned to the 10 finalized profile topics (+ legislation catch-all). */
export const RECORD_TOPIC_BUCKETS: TopicBucketDef[] = [
  {
    id: 'abortion',
    label: 'Abortion & Reproductive Rights',
    keywords: ['abortion', 'reproductive', 'pro-life', 'pro-choice', 'roe', 'contraception', 'ivf', 'dobbs', 'pregnancy'],
  },
  {
    id: 'technology',
    label: 'Technology, Privacy & AI',
    keywords: [
      'artificial intelligence', ' section 230', 'section 230', 'data privacy', 'algorithm', 'big tech',
      'content moderation', 'deepfake', 'social media platform', 'tech platform', 'online platform',
      'surveillance tech', 'facial recognition',
    ],
  },
  {
    id: 'public-safety',
    label: 'Public Safety',
    keywords: [
      'gun', 'firearm', 'second amendment', 'background check', 'assault weapon', 'weapon',
      'criminal justice', 'sentencing', 'incarceration', 'police reform', 'bail', 'death penalty',
      'prison', 'law enforcement', 'crime', 'fentanyl', 'illicit trade', 'trafficking',
    ],
  },
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
    id: 'climate',
    label: 'Climate & Energy',
    keywords: ['climate', 'environment', 'energy', 'pollution', 'emission', 'renewable', 'fossil', 'drilling', 'wildlife', 'conservation', 'pollinator', 'everglades', 'water quality', 'carbon'],
  },
  {
    id: 'defense-veterans',
    label: 'Defense & Veterans',
    keywords: [
      'defense', 'military', 'armed forces', 'war powers', 'nato', 'ukraine', 'israel', 'iran', 'china',
      'taiwan', 'foreign aid', 'pentagon', 'troops', 'hostilities', 'veteran',
      'veterans', 'gi bill', 'va benefits', 'tricare', 'military family', 'service member',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    keywords: [
      'education', 'student loan', 'public school', 'higher education', 'community college',
      'k-12', 'teacher', 'tuition', 'curriculum', 'child care', 'head start', 'title i',
      'pell grant', 'school district', 'school choice',
    ],
  },
  {
    id: 'civil-liberties',
    label: 'Civil Liberties & Regulation',
    keywords: [
      'civil rights', 'civil liberties', 'voting rights', 'discrimination', 'fisa', 'surveillance',
      'speech', 'censorship', 'lgbt', 'equality', 'judiciary', 'judicial', 'nomination', 'confirm',
      'justice', 'court', 'judge', 'attorney general', 'ambassador', 'constitutional',
    ],
  },
  {
    id: 'economy-taxes',
    label: 'Economy & Taxes',
    keywords: [
      'budget', 'appropriat', 'fiscal', 'debt', 'spending', 'inflation', 'jobs', 'wage', 'trade',
      'tariff', 'tax', 'revenue', 'deficit', 'commerce', 'housing', 'rent', 'mortgage', 'homeless',
      'affordable housing', 'zoning', 'eviction', 'hud', 'antitrust', 'monopoly', 'corporate power',
      'home price', 'home ownership', 'homeownership', 'home buyer', 'first-time home buyer',
      'file taxes', 'filing taxes', 'tax filing', 'tax day', 'file their taxes', 'pay their taxes',
      'irs', 'spending bill', 'omnibus',
    ],
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

/**
 * Route record text to a topic bucket. Uses word-boundary keyword matching (not substring)
 * so "price of" does not hit immigration `ice` and "senator" does not hit defense `nato`.
 * When multiple buckets match, the bucket with the highest keyword-weight score wins.
 */
export function recordKeywordMatches(hay: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return false;
  if (/\s/.test(k)) return hay.includes(k);
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(hay);
}

/**
 * A bucket only counts as a real match when it has either one multi-word phrase hit
 * (precise) or 2+ distinct single-word hits (reduces bare-word false positives, e.g.
 * "University of Kentucky" alone must not classify unrelated text as `education`).
 */
function scoreTopicBuckets(hay: string): Map<string, number> {
  const scores = new Map<string, number>();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    let score = 0;
    let phraseHits = 0;
    let singleWordHits = 0;
    for (const keyword of bucket.keywords) {
      if (recordKeywordMatches(hay, keyword)) {
        score += keyword.trim().length;
        if (/\s/.test(keyword.trim())) phraseHits += 1;
        else singleWordHits += 1;
      }
    }
    if (score > 0 && (phraseHits >= 1 || singleWordHits >= 2)) {
      scores.set(bucket.id, score);
    }
  }
  return scores;
}

export function classifyTextToRecordTopicId(text: string, category?: string): string {
  const hay = `${text} ${category ?? ''}`.toLowerCase();
  const cat = (category ?? '').toLowerCase();

  if (cat === 'procedural') return 'legislation';
  if (cat === 'budget') return 'economy-taxes';
  if (cat === 'judiciary') return 'civil-liberties';

  if (/\b(data privacy|artificial intelligence|\bai\b|algorithm|deepfake|content moderation|section 230|big tech)\b/.test(hay)) {
    return 'technology';
  }

  if (/\b(antitrust|monopoly)\b/.test(hay)) {
    if (/\b(big tech|tech platform|platform|google|meta|facebook|amazon|apple|microsoft|silicon valley)\b/.test(hay)) {
      return 'technology';
    }
    return 'economy-taxes';
  }

  const scores = scoreTopicBuckets(hay);
  if (scores.size > 0) {
    let bestId = 'legislation';
    let bestScore = 0;
    for (const [id, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    return bestId;
  }

  if (cat === 'legislation' || hay.includes('bill') || hay.includes('resolution')) {
    return 'legislation';
  }
  return 'legislation';
}

export function recordTopicLabel(id: string): string {
  const canonicalId = normalizeTopicId(id);
  return RECORD_TOPIC_BUCKETS.find((b) => b.id === canonicalId)?.label ?? 'Federal Legislation';
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
  return classifyTextToRecordTopicId(`${bill.title} ${bill.billNumber}`, bill.statusLabel);
}

export function voteTopicId(vote: VoteRecord): string {
  const text = [
    vote.billTitle,
    vote.billDescription,
    vote.billSummary ?? '',
    vote.billId,
    vote.voteAction ?? '',
  ].join(' ');
  return classifyTextToRecordTopicId(text, vote.category);
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
    { votes: VoteRecord[]; sponsored: Bill[]; split: TopicVoteSplit }
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
        billSummary: vote.billSummary,
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

  return {
    topics,
    totalVotes: votes.length,
    totalSponsored: sponsored.length,
    asOf,
  };
}
