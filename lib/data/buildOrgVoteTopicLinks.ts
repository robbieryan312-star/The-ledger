import type { VoteRecord } from '../types';
import { RECORD_TOPIC_BUCKETS, voteCongressGovUrl, voteTopicId } from './profileRecordByTopic';
import type { AggregatedCommitteeReceipt, AggregatedEmployerReceipt, ScheduleAMemberRow } from './fecScheduleA';

export interface OrgVoteTopicLink {
  orgName: string;
  totalAmount: number;
  receiptCount: number;
  orgTopicId: string;
  voteDate: string;
  voteChoice: string;
  billTitle: string;
  billNumber: string;
  voteUrl: string;
}

function classifyOrgText(text: string): string | null {
  const hay = text.toLowerCase();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (
      bucket.keywords.some((k) => {
        const keyword = k.trim().toLowerCase();
        if (!keyword) return false;
        if (/\s/.test(keyword)) return hay.includes(keyword);
        return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hay);
      })
    ) {
      return bucket.id;
    }
  }
  return null;
}

function orgTopicId(name: string, employer?: string, occupation?: string): string | null {
  return classifyOrgText([name, employer, occupation].filter(Boolean).join(' '));
}

function latestVoteForTopic(votes: VoteRecord[], topicId: string): VoteRecord | null {
  return votes
    .filter((v) => voteTopicId(v) === topicId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
}

export function buildOrgVoteTopicLinks(
  scheduleA: ScheduleAMemberRow,
  votes: VoteRecord[],
): OrgVoteTopicLink[] {
  const links: OrgVoteTopicLink[] = [];
  const seen = new Set<string>();

  const orgRows: Array<{
    name: string;
    totalAmount: number;
    receiptCount: number;
    employer?: string;
    occupation?: string;
  }> = [];

  for (const c of scheduleA.aggregatedByCommittee ?? []) {
    orgRows.push({
      name: c.committeeName ?? c.committeeId,
      totalAmount: c.totalAmount,
      receiptCount: c.receiptCount,
    });
  }

  for (const e of scheduleA.aggregatedByEmployer ?? []) {
    orgRows.push({
      name: e.employer,
      totalAmount: e.totalAmount,
      receiptCount: e.receiptCount,
      employer: e.employer,
      occupation: e.occupation,
    });
  }

  for (const c of scheduleA.contributors ?? []) {
    orgRows.push({
      name: c.name,
      totalAmount: c.amount,
      receiptCount: 1,
      employer: c.employer,
      occupation: c.occupation,
    });
  }

  for (const org of orgRows) {
    const topicId = orgTopicId(org.name, org.employer, org.occupation);
    if (!topicId) continue;

    const vote = latestVoteForTopic(votes, topicId);
    if (!vote) continue;

    const key = `${topicId}:${org.name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    links.push({
      orgName: org.name,
      totalAmount: org.totalAmount,
      receiptCount: org.receiptCount,
      orgTopicId: topicId,
      voteDate: vote.date,
      voteChoice: vote.vote,
      billTitle: vote.billTitle,
      billNumber: vote.billId,
      voteUrl: voteCongressGovUrl(vote),
    });
  }

  return links.sort((a, b) => b.totalAmount - a.totalAmount);
}

export function orgVoteLinksForTopic(
  links: OrgVoteTopicLink[],
  topicId: string,
): OrgVoteTopicLink[] {
  return links.filter((l) => l.orgTopicId === topicId);
}
