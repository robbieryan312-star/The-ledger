import type { VoteRecord } from '../types';
import { saidDidSubjectsOverlap } from './sourceIntegrity';
import { RECORD_TOPIC_BUCKETS, recordKeywordMatches, voteCongressGovUrl } from './profileRecordByTopic';
import { resolveRecordedOutlet } from './resolveRecordedOutlet';
import type { SaidDidLinkEntry, TopicStatementEntry } from './topicPositions';

/** Max Said→Did links kept per profile after CREC↔vote pairing. */
export const MAX_SAID_DID_LINKS_PER_MEMBER = 15;
const MIN_SHARED_CREC_POLICY_KEYWORDS = 2;
const MAX_GENERIC_CREC_VOTE_GAP_DAYS = 366;

/**
 * Prefer substantive Senate/House vote context when billTitle is procedural
 * so subject-overlap pairing can work.
 */
export function enrichVoteBillTitle(vote: VoteRecord): string {
  const title = (vote.billTitle ?? '').trim();
  const desc = (vote.billDescription ?? vote.billSummary ?? '').trim();
  if (!desc) return title;
  const afterEm = desc.includes('—') ? desc.split('—').slice(1).join('—').trim() : '';
  const substance = afterEm.length > 20 ? afterEm : desc;
  if (substance.length <= title.length + 10) return title;
  const combined = title ? `${title} — ${substance}` : substance;
  return combined.length > 320 ? `${combined.slice(0, 317)}...` : combined;
}

export function voteSaidDidContext(vote: VoteRecord): string {
  return `${vote.billId}: ${enrichVoteBillTitle(vote)}`;
}

function parseDateMs(date: string | null | undefined): number | null {
  if (!date?.trim()) return null;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function daysBetween(startDate: string | null | undefined, endDate: string | null | undefined): number | null {
  const start = parseDateMs(startDate);
  const end = parseDateMs(endDate);
  if (start === null || end === null) return null;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function compactBillId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function quoteMentionsBill(quote: string, billNumber: string): boolean {
  const compactBill = compactBillId(billNumber);
  if (compactBill.length < 4) return false;
  return compactBillId(quote).includes(compactBill);
}

function sharedPolicyKeywordCount(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  const shared = new Set<string>();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    for (const keyword of bucket.keywords) {
      if (recordKeywordMatches(left, keyword) && recordKeywordMatches(right, keyword)) {
        shared.add(keyword.trim().toLowerCase());
      }
    }
  }
  return shared.size;
}

export interface CrecSaidDidCandidateQuality {
  exactBillReference: boolean;
  sharedPolicyKeywords: number;
  gapDays: number;
}

export function crecSaidDidCandidateQuality(candidate: {
  saidQuote: string;
  saidDate: string | null | undefined;
  voteDate: string;
  billNumber: string;
  voteContext: string;
}): CrecSaidDidCandidateQuality | null {
  const gapDays = daysBetween(candidate.saidDate, candidate.voteDate);
  if (gapDays === null || gapDays < 0) return null;
  if (!saidDidSubjectsOverlap(candidate.saidQuote, candidate.voteContext)) return null;

  const exactBillReference = quoteMentionsBill(candidate.saidQuote, candidate.billNumber);
  const sharedPolicyKeywords = sharedPolicyKeywordCount(candidate.saidQuote, candidate.voteContext);
  if (!exactBillReference && sharedPolicyKeywords < MIN_SHARED_CREC_POLICY_KEYWORDS) return null;
  if (!exactBillReference && gapDays > MAX_GENERIC_CREC_VOTE_GAP_DAYS) return null;

  return { exactBillReference, sharedPolicyKeywords, gapDays };
}

function isOfficialCrecFloorStatement(s: TopicStatementEntry): boolean {
  return s.tier === 'official' && /\/CREC-/i.test(s.url ?? '');
}

/** Strip query/hash so the same CREC granule is not paired twice. */
export function crecUrlStem(url: string | undefined | null): string {
  if (!url?.trim()) return '';
  return url.trim().replace(/[?#].*$/, '');
}

/**
 * Pair each verified CREC floor Said with one subject-overlapping roll-call Did.
 * Each link embeds the verbatim Said quote + GovInfo/CREC URL (tier official).
 * Dedup Saids by URL stem; one Did per Said; one use of each bill:date Did; cap 15.
 */
export function buildCrecSaidDidLinks(
  byTopic: Record<string, { statements: TopicStatementEntry[] }>,
  votes: VoteRecord[],
): Record<string, SaidDidLinkEntry[]> {
  const seenStems = new Set<string>();
  const crecStatements: TopicStatementEntry[] = [];
  for (const [topicId, bucket] of Object.entries(byTopic)) {
    for (const s of bucket.statements ?? []) {
      if (!isOfficialCrecFloorStatement(s)) continue;
      const stem = crecUrlStem(s.url);
      if (!stem || seenStems.has(stem)) continue;
      // Said-vs-procedural: require spoken floor opener (Mr./Madam President), not bare lists.
      const title = (s.title ?? '').trim();
      if (!/^(Mr\.|Madam)\s+[A-Z][A-Za-z.'-]+/i.test(title)) continue;
      if (/\bI move to discharge\b/i.test(title) || /\bI move to proceed to\b/i.test(title)) continue;
      seenStems.add(stem);
      crecStatements.push({ ...s, topicId: s.topicId || topicId });
    }
  }

  crecStatements.sort(
    (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
  );

  const out: Record<string, SaidDidLinkEntry[]> = {};
  const usedDidKeys = new Set<string>();
  let total = 0;

  const orderedVotes = [...votes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const statement of crecStatements) {
    if (total >= MAX_SAID_DID_LINKS_PER_MEMBER) break;
    const topicId = statement.topicId;
    const saidUrl = (statement.url ?? '').trim();
    const saidQuote = (statement.title ?? '').trim();
    if (!saidUrl || !saidQuote) continue;
    const saidOutlet = resolveRecordedOutlet(statement.outlet, saidUrl);
    // No recorded outlet and no URL-derived host → omit (never invent a label).
    if (!saidOutlet) continue;

    const match = orderedVotes
      .map((vote) => {
        const didKey = `${vote.billId}:${vote.date}`;
        if (usedDidKeys.has(didKey)) return null;
        const quality = crecSaidDidCandidateQuality({
          saidQuote,
          saidDate: statement.date,
          voteDate: vote.date,
          billNumber: vote.billId,
          voteContext: voteSaidDidContext(vote),
        });
        return quality ? { vote, quality } : null;
      })
      .filter((candidate): candidate is { vote: VoteRecord; quality: CrecSaidDidCandidateQuality } => Boolean(candidate))
      .sort((a, b) => {
        if (a.quality.exactBillReference !== b.quality.exactBillReference) {
          return a.quality.exactBillReference ? -1 : 1;
        }
        if (a.quality.sharedPolicyKeywords !== b.quality.sharedPolicyKeywords) {
          return b.quality.sharedPolicyKeywords - a.quality.sharedPolicyKeywords;
        }
        if (a.quality.gapDays !== b.quality.gapDays) {
          return a.quality.gapDays - b.quality.gapDays;
        }
        return new Date(b.vote.date).getTime() - new Date(a.vote.date).getTime();
      })[0]?.vote;
    if (!match) continue;

    const didKey = `${match.billId}:${match.date}`;
    usedDidKeys.add(didKey);
    out[topicId] = out[topicId] ?? [];
    out[topicId].push({
      topicId,
      statedPositionDate: statement.date ?? null,
      saidQuote,
      saidUrl,
      saidOutlet,
      voteDate: match.date,
      billTitle: enrichVoteBillTitle(match),
      billNumber: match.billId,
      congressGovUrl: voteCongressGovUrl(match),
      voteChoice: match.vote,
      tier: 'official',
    });
    total += 1;
  }

  return out;
}
