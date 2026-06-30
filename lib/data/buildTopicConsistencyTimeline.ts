import type { SourceTier } from '../types';
import { voteCongressGovUrl, voteTopicId } from './profileRecordByTopic';
import { getCongressVotes } from './congressVotes';
import { getMemberTopicPositions, type TopicPositionData } from './topicPositions';

export interface TopicTimelineBullet {
  date: string;
  kind: 'SAID' | 'DID';
  claim: string;
  sourceName: string;
  tier: SourceTier;
  url: string;
}

function sortByDateAsc(bullets: TopicTimelineBullet[]): TopicTimelineBullet[] {
  return [...bullets].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function buildTopicConsistencyTimeline(
  bioguideId: string,
  topicId: string,
  topicData: TopicPositionData,
  politicianId: string,
): TopicTimelineBullet[] {
  const bullets: TopicTimelineBullet[] = [];

  for (const statement of topicData.statements) {
    if (statement.topicId !== topicId) continue;
    bullets.push({
      date: statement.date,
      kind: 'SAID',
      claim: statement.title,
      sourceName: statement.tier === 'official' ? 'Congressional Record (GovInfo)' : statement.tier,
      tier: statement.tier,
      url: statement.url,
    });
  }

  if (topicData.statedPosition?.trim()) {
    bullets.push({
      date: topicData.saidDidLinks[0]?.statedPositionDate ?? topicData.platformPositions?.[0]?.asOf ?? '',
      kind: 'SAID',
      claim: topicData.statedPosition,
      sourceName: topicData.statedPositionSource?.source ?? 'VoteSmart',
      tier: topicData.statedPositionSource?.tier ?? 'nonpartisan',
      url: topicData.statedPositionSource?.url ?? '',
    });
  }

  const congressEntry = getCongressVotes(politicianId, bioguideId);
  for (const vote of congressEntry?.votes ?? []) {
    if (voteTopicId(vote) !== topicId) continue;
    bullets.push({
      date: vote.date,
      kind: 'DID',
      claim: `Voted ${vote.vote} on ${vote.billId}: ${vote.billTitle}`,
      sourceName: 'Congress.gov',
      tier: 'official',
      url: voteCongressGovUrl(vote),
    });
  }

  return sortByDateAsc(bullets.filter((b) => b.date.trim()));
}

export function buildAllTopicTimelines(
  bioguideId: string,
  politicianId: string,
): Map<string, TopicTimelineBullet[]> {
  const memberTopics = getMemberTopicPositions(bioguideId);
  const out = new Map<string, TopicTimelineBullet[]>();
  if (!memberTopics) return out;

  for (const [topicId, topicData] of Object.entries(memberTopics)) {
    const bullets = buildTopicConsistencyTimeline(bioguideId, topicId, topicData, politicianId);
    if (bullets.length >= 2) {
      out.set(topicId, bullets);
    }
  }

  return out;
}
