import type { SaidDidDiff } from '../types';
import { RECORD_TOPIC_BUCKETS } from './profileRecordByTopic';
import { getMemberTopicPositions, type TopicPositionData } from './topicPositions';
import type { SaidDidLinkEntry } from './topicPositions';

function gapDaysBetween(statedDate: string | null, voteDate: string): number | null {
  if (!statedDate?.trim()) return null;
  const a = new Date(statedDate).getTime();
  const b = new Date(voteDate).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function topicKeywords(topicId: string): string[] {
  return RECORD_TOPIC_BUCKETS.find((b) => b.id === topicId)?.keywords ?? [];
}

function textMatchesTopic(text: string, topicId: string): boolean {
  const hay = text.toLowerCase();
  return topicKeywords(topicId).some((k) => {
    const keyword = k.trim().toLowerCase();
    if (!keyword) return false;
    if (/\s/.test(keyword)) return hay.includes(keyword);
    return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hay);
  });
}

function voteContext(link: SaidDidLinkEntry): string {
  return `${link.billTitle} ${link.billNumber}`.toLowerCase();
}

function platformKeyVoteMatchesLink(platformText: string, link: SaidDidLinkEntry): boolean {
  const text = platformText.toLowerCase();
  if (!text.includes('voted yea') && !text.includes('voted nay')) return false;

  const billNum = link.billNumber.replace(/\s+/g, '').toLowerCase();
  if (billNum.length > 3 && text.replace(/\s+/g, '').includes(billNum.replace(/\./g, ''))) {
    return true;
  }

  const titleWords = link.billTitle
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 5);
  return titleWords.some((w) => text.includes(w));
}

function statementMatchesVote(statementText: string, link: SaidDidLinkEntry, topicId: string): boolean {
  const hay = `${statementText} ${voteContext(link)}`.toLowerCase();
  return textMatchesTopic(hay, topicId);
}

interface SaidSource {
  quote: string;
  outlet: string;
  url: string;
  tier: SaidDidDiff['said']['tier'];
  date: string;
  verbatim: boolean;
}

function pickSaidForLink(
  topicId: string,
  topicData: TopicPositionData,
  link: SaidDidLinkEntry,
): SaidSource | null {
  const mediaStatement = topicData.statements.find(
    (s) =>
      s.topicId === topicId &&
      s.tier === 'media' &&
      (statementMatchesVote(s.title, link, topicId) || textMatchesTopic(s.title, topicId)),
  );
  if (mediaStatement) {
    return {
      quote: mediaStatement.title,
      outlet: 'Journalism',
      url: mediaStatement.url,
      tier: 'media',
      date: mediaStatement.date,
      verbatim: true,
    };
  }

  const officialStatement = topicData.statements.find(
    (s) => s.topicId === topicId && s.tier === 'official' && statementMatchesVote(s.title, link, topicId),
  );
  if (officialStatement) {
    return {
      quote: officialStatement.title,
      outlet: 'Congressional Record (GovInfo)',
      url: officialStatement.url,
      tier: 'official',
      date: officialStatement.date,
      verbatim: true,
    };
  }

  const statedPosition = topicData.statedPosition?.trim();
  if (statedPosition && statementMatchesVote(statedPosition, link, topicId)) {
    return {
      quote: statedPosition,
      outlet: topicData.statedPositionSource?.source ?? 'VoteSmart',
      url: topicData.statedPositionSource?.url ?? '',
      tier: 'nonpartisan',
      date: link.statedPositionDate ?? topicData.platformPositions?.[0]?.asOf ?? 'Date not recorded',
      verbatim: true,
    };
  }

  for (const pos of topicData.platformPositions ?? []) {
    if (platformKeyVoteMatchesLink(pos.text, link)) {
      return {
        quote: pos.text,
        outlet: pos.source,
        url: pos.url,
        tier: 'nonpartisan',
        date: link.statedPositionDate ?? pos.asOf,
        verbatim: false,
      };
    }
  }

  return null;
}

export function buildSaidDidDiffsFromTopicPositions(
  bioguideId: string,
  politicianName: string,
): SaidDidDiff[] {
  const memberTopics = getMemberTopicPositions(bioguideId);
  if (!memberTopics) return [];

  const diffs: SaidDidDiff[] = [];

  for (const [topicId, topicData] of Object.entries(memberTopics)) {
    for (const link of topicData.saidDidLinks ?? []) {
      const said = pickSaidForLink(topicId, topicData, link);
      if (!said) continue;

      diffs.push({
        said: {
          quote: said.quote,
          speaker: politicianName,
          date: said.date,
          outlet: said.outlet,
          url: said.url,
          tier: said.tier,
          verbatim: said.verbatim,
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
