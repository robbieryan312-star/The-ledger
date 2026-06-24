import type { CampaignFinance, Source, VoteDonorConnection, VoteRecord } from '../types';

const FEC_DEMO: Source = {
  name: 'FEC campaign finance (demo overlay)',
  url: 'https://www.fec.gov',
  tier: 'nonpartisan',
  description: 'Demo-labeled donor/industry overlap tag for UI review — not an LDA filing',
};

function textOverlap(a: string, b: string): boolean {
  const words = b.toLowerCase().split(/[\s,/]+/).filter((w) => w.length > 3);
  const hay = a.toLowerCase();
  return words.some((w) => hay.includes(w));
}

/**
 * Optional demo donor/lobby note when campaign finance mock data overlaps a vote topic.
 * Never fabricates LDA links — only tags when finance demo data shares issue keywords.
 */
export function inferVoteDonorConnection(
  vote: VoteRecord,
  finance: CampaignFinance | undefined,
  isFeatured: boolean,
): VoteDonorConnection | undefined {
  if (!isFeatured || !finance) return undefined;
  if (vote.donorConnection) return vote.donorConnection;

  const context = `${vote.billTitle} ${vote.billSummary ?? ''} ${vote.billDescription} ${vote.category}`.toLowerCase();

  for (const lobby of finance.lobbyistMoney) {
    const issueHit = lobby.issues.some((issue) => textOverlap(context, issue) || textOverlap(issue, context));
    const sectorHit = textOverlap(context, lobby.sector);
    if (issueHit || sectorHit) {
      const issue = lobby.issues.find((i) => textOverlap(context, i)) ?? lobby.issues[0];
      return {
        text: `Reported alignment with ${lobby.organization} on ${issue} (demo finance overlay)`,
        isDemo: true,
        source: FEC_DEMO,
      };
    }
  }

  for (const industry of finance.topIndustries.slice(0, 5)) {
    if (textOverlap(context, industry.industry)) {
      return {
        text: `Top donor industry "${industry.industry}" overlaps this vote topic (demo finance overlay)`,
        isDemo: true,
        source: FEC_DEMO,
      };
    }
  }

  if (vote.alignsWithDonors) {
    return {
      text: 'Vote tagged as aligning with major donors in demo dataset',
      isDemo: true,
      source: FEC_DEMO,
    };
  }

  return undefined;
}
