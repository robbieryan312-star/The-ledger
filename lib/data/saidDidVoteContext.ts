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

/**
 * Pair each verified CREC floor statement with subject-overlapping roll-call votes.
 * Links are filed under the Said statement's topic (not the vote's often-generic topic)
 * so prune/pickSaid can match. Dedupes by topic:bill:date. Caps at 15 total.
 */
export function buildCrecSaidDidLinks(
  byTopic: Record<string, { statements: TopicStatementEntry[] }>,
  votes: VoteRecord[],
): Record<string, SaidDidLinkEntry[]> {
  const crecStatements: TopicStatementEntry[] = [];
  for (const [topicId, bucket] of Object.entries(byTopic)) {
    for (const s of bucket.statements ?? []) {
      if (!isOfficialCrecFloorStatement(s)) continue;
      crecStatements.push({ ...s, topicId: s.topicId || topicId });
    }
  }

  const out: Record<string, SaidDidLinkEntry[]> = {};
  const seen = new Set<string>();
  let total = 0;

  // Prefer newer votes first so the 15-cap keeps recent Dids.
  const orderedVotes = [...votes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const statement of crecStatements) {
    if (total >= MAX_SAID_DID_LINKS_PER_MEMBER) break;
    const topicId = statement.topicId;
    for (const vote of orderedVotes) {
      if (total >= MAX_SAID_DID_LINKS_PER_MEMBER) break;
      if (!saidDidSubjectsOverlap(statement.title, voteSaidDidContext(vote))) continue;
      const key = `${topicId}:${vote.billId}:${vote.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out[topicId] = out[topicId] ?? [];
      out[topicId].push({
        topicId,
        statedPositionDate: statement.date ?? null,
        voteDate: vote.date,
        billTitle: enrichVoteBillTitle(vote),
        billNumber: vote.billId,
        congressGovUrl: voteCongressGovUrl(vote),
        voteChoice: vote.vote,
        tier: 'official',
      });
      total += 1;
    }
  }

  return out;
}
