import type { VoteRecord } from '../types';
import { saidDidSubjectsOverlap } from './sourceIntegrity';
import { voteCongressGovUrl } from './profileRecordByTopic';
import type { SaidDidLinkEntry, TopicStatementEntry } from './topicPositions';

/** Max Said→Did links kept per profile after CREC↔vote pairing. */
export const MAX_SAID_DID_LINKS_PER_MEMBER = 15;

/**
 * Prefer substantive Senate/House vote context when billTitle is procedural
 * ("Motion to Proceed to S.J.Res. 185") so subject-overlap pairing can work.
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
 * - Official CREC only (member floor speech URLs)
 * - Dedup Saids by URL stem
 * - One Did per Said (newest matching vote); one use of each bill:date Did globally
 * - Cap 15; remainder is honest-gap (do not force)
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
    const match = orderedVotes.find((vote) => {
      const didKey = `${vote.billId}:${vote.date}`;
      if (usedDidKeys.has(didKey)) return false;
      return saidDidSubjectsOverlap(statement.title, voteSaidDidContext(vote));
    });
    if (!match) continue;

    const didKey = `${match.billId}:${match.date}`;
    usedDidKeys.add(didKey);
    out[topicId] = out[topicId] ?? [];
    out[topicId].push({
      topicId,
      statedPositionDate: statement.date ?? null,
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
