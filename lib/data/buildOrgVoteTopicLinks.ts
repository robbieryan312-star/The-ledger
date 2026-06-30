import type { VoteRecord } from '../types';
import { voteCongressGovUrl, voteTopicId } from './profileRecordByTopic';
import type { ScheduleAMemberRow } from './fecScheduleA';
import { aggregateScheduleAOrgs } from './fecOrgRegistry';

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
  sector?: string;
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
  const orgs = aggregateScheduleAOrgs(scheduleA.contributors ?? []);

  for (const org of orgs) {
    for (const topicId of org.topicIds) {
      const vote = latestVoteForTopic(votes, topicId);
      if (!vote) continue;

      const key = `${topicId}:${org.orgName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      links.push({
        orgName: org.orgName,
        totalAmount: org.totalAmount,
        receiptCount: org.receiptCount,
        orgTopicId: topicId,
        voteDate: vote.date,
        voteChoice: vote.vote,
        billTitle: vote.billTitle,
        billNumber: vote.billId,
        voteUrl: voteCongressGovUrl(vote),
        sector: org.sector,
      });
    }
  }

  return links.sort((a, b) => b.totalAmount - a.totalAmount);
}

export function orgVoteLinksForTopic(
  links: OrgVoteTopicLink[],
  topicId: string,
): OrgVoteTopicLink[] {
  return links.filter((l) => l.orgTopicId === topicId);
}
