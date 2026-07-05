/**
 * Golden profile snapshot extraction — mirrors rendered display strings for regression guards.
 */
import { buildSaidDidDiffsFromTopicPositions } from './buildSaidDidDiffs';
import { statementDisplayText } from './crecDisplayText';
import { leadSummary } from './displaySummary';
import { buildIssuesFromTopicPositions } from './issuesFromTopicPositions';
import {
  getMemberProfileNews,
  getMemberProfileVotes,
} from './memberProfile';
import { getMemberTopicPositions } from './topicPositions';
import { isDisqualifiedPlatformPosition } from './sourceIntegrity';

export interface ProfileSnapshot {
  bioguideId: string;
  keyIssuePositions: string[];
  statementDisplayTexts: string[];
  saidDidLines: Array<{ said: string; did: string }>;
  voteRows: string[];
  newsHeadlines: string[];
}

const ROSTER_NAMES: Record<string, string> = {
  S000033: 'Bernie Sanders',
  M000355: 'Mitch McConnell',
  O000172: 'Alexandria Ocasio-Cortez',
  M001184: 'Thomas Massie',
  W000817: 'Elizabeth Warren',
  C001098: 'Ted Cruz',
};

export function extractProfileSnapshot(bioguideId: string): ProfileSnapshot {
  const issues = buildIssuesFromTopicPositions(bioguideId);
  const keyIssuePositions = issues.map((i) => i.position).filter(Boolean);

  const topics = getMemberTopicPositions(bioguideId) ?? {};
  const statementDisplayTexts: string[] = [];
  for (const data of Object.values(topics)) {
    for (const st of data.statements ?? []) {
      const display = statementDisplayText(st);
      if (display?.trim()) statementDisplayTexts.push(leadSummary(display, 120));
    }
    for (const p of data.platformPositions ?? []) {
      if (!isDisqualifiedPlatformPosition(p.text)) {
        statementDisplayTexts.push(leadSummary(p.text, 120));
      }
    }
  }

  const politicianName = ROSTER_NAMES[bioguideId] ?? bioguideId;
  const diffs = buildSaidDidDiffsFromTopicPositions(bioguideId, politicianName);
  const saidDidLines = diffs.map((d) => ({
    said: leadSummary(d.said.quote, 120),
    did: leadSummary(d.did.action, 120),
  }));

  const votesFile = getMemberProfileVotes(bioguideId);
  const voteRows = (votesFile?.votes ?? []).slice(0, 30).map(
    (v) => `${v.vote} — ${leadSummary(v.billTitle, 80)}`,
  );

  const news = getMemberProfileNews(bioguideId);
  const newsHeadlines = (news ?? []).map((n) => n.headline);

  return {
    bioguideId,
    keyIssuePositions,
    statementDisplayTexts,
    saidDidLines,
    voteRows,
    newsHeadlines,
  };
}
