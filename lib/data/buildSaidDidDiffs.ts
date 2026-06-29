import type { SaidDidDiff } from '../types';
import { getMemberTopicPositions } from './topicPositions';

function gapDaysBetween(statedDate: string | null, voteDate: string): number | null {
  if (!statedDate?.trim()) return null;
  const a = new Date(statedDate).getTime();
  const b = new Date(voteDate).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function buildSaidDidDiffsFromTopicPositions(
  bioguideId: string,
  politicianName: string,
): SaidDidDiff[] {
  const memberTopics = getMemberTopicPositions(bioguideId);
  if (!memberTopics) return [];

  const diffs: SaidDidDiff[] = [];

  for (const topicData of Object.values(memberTopics)) {
    const platform = topicData.platformPositions?.[0];
    const statedPosition = topicData.statedPosition?.trim();
    const statedSource = topicData.statedPositionSource;

    for (const link of topicData.saidDidLinks ?? []) {
      const useNpat = Boolean(statedPosition);
      const quote = statedPosition ?? platform?.text ?? '';
      if (!quote) continue;

      const outlet = useNpat
        ? (statedSource?.source ?? 'VoteSmart')
        : (platform?.source ?? 'Ballotpedia');
      const url = useNpat
        ? (statedSource?.url ?? '')
        : (platform?.url ?? '');
      const tier: 'nonpartisan' = 'nonpartisan';

      diffs.push({
        said: {
          quote,
          speaker: politicianName,
          date: link.statedPositionDate ?? platform?.asOf ?? 'Date not recorded',
          outlet,
          url,
          tier,
          verbatim: useNpat,
        },
        did: {
          action: `Voted ${link.voteChoice} — ${link.billNumber}: ${link.billTitle}`,
          date: link.voteDate,
          url: link.congressGovUrl,
          tier: 'official',
        },
        gapDays: gapDaysBetween(link.statedPositionDate, link.voteDate),
      });
    }
  }

  return diffs.sort(
    (a, b) => new Date(b.did.date).getTime() - new Date(a.did.date).getTime(),
  );
}
