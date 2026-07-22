import type { SaidDidDiff } from '../types';
import { RECORD_TOPIC_BUCKETS, recordKeywordMatches } from './profileRecordByTopic';
import { isDisqualifiedPlatformPosition, isVoteRestatementSaid, saidDidSubjectsOverlap } from './sourceIntegrity';
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
  return topicKeywords(topicId).some((k) => recordKeywordMatches(hay, k));
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

function officialOutletLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('govinfo.gov')) return 'Congressional Record (GovInfo)';
    if (host.includes('republicanleader.senate.gov')) return 'Senate Republican Leader';
  } catch {
    /* fall through */
  }
  return 'Official record';
}

function pickSaidForLink(
  topicId: string,
  topicData: TopicPositionData,
  link: SaidDidLinkEntry,
  allTopics?: Record<string, TopicPositionData>,
): SaidSource | null {
  // Prefer verbatim Said embedded on the link (CREC quote + GovInfo URL).
  if (link.saidQuote?.trim() && link.saidUrl?.trim()) {
    return {
      quote: link.saidQuote.trim(),
      outlet: link.saidOutlet?.trim() || officialOutletLabel(link.saidUrl),
      url: link.saidUrl.trim(),
      tier: 'official',
      date: link.statedPositionDate ?? 'Date not recorded',
      verbatim: true,
    };
  }

  const statementPool = allTopics
    ? Object.values(allTopics).flatMap((t) => t.statements ?? [])
    : topicData.statements;

  const officialStatement = statementPool.find(
    (s) =>
      s.tier === 'official' &&
      textMatchesTopic(s.title, topicId) &&
      saidDidSubjectsOverlap(s.title, `${link.billNumber}: ${link.billTitle}`),
  );
  if (officialStatement) {
    return {
      quote: officialStatement.title,
      outlet: officialStatement.outlet ?? officialOutletLabel(officialStatement.url),
      url: officialStatement.url,
      tier: 'official',
      date: officialStatement.date,
      verbatim: officialStatement.verbatim ?? true,
    };
  }

  const mediaStatement = topicData.statements.find(
    (s) =>
      s.topicId === topicId &&
      s.tier === 'media' &&
      s.verbatim === true &&
      (statementMatchesVote(s.title, link, topicId) || textMatchesTopic(s.title, topicId)) &&
      saidDidSubjectsOverlap(s.title, `${link.billNumber}: ${link.billTitle}`),
  );
  if (mediaStatement) {
    return {
      quote: mediaStatement.title,
      outlet: mediaStatement.outlet ?? 'Journalism',
      url: mediaStatement.url,
      tier: 'media',
      date: mediaStatement.date,
      verbatim: true,
    };
  }

  const allegedStatement = topicData.statements.find(
    (s) =>
      s.topicId === topicId &&
      s.tier === 'alleged' &&
      s.verbatim === true &&
      (statementMatchesVote(s.title, link, topicId) || textMatchesTopic(s.title, topicId)) &&
      saidDidSubjectsOverlap(s.title, `${link.billNumber}: ${link.billTitle}`),
  );
  if (allegedStatement) {
    let outlet = allegedStatement.outlet ?? 'Journalism';
    if (!allegedStatement.outlet) {
      try {
        const host = new URL(allegedStatement.url).hostname.replace(/^www\./, '');
        if (host.includes('washingtonpost')) outlet = 'Washington Post';
        else if (host.includes('nytimes')) outlet = 'New York Times';
      } catch {
        /* keep generic */
      }
    }
    return {
      quote: allegedStatement.title,
      outlet,
      url: allegedStatement.url,
      tier: 'alleged',
      date: allegedStatement.date,
      verbatim: true,
    };
  }

  const statedPosition = topicData.statedPosition?.trim();
  if (
    statedPosition &&
    statementMatchesVote(statedPosition, link, topicId) &&
    saidDidSubjectsOverlap(statedPosition, `${link.billNumber}: ${link.billTitle}`)
  ) {
    return {
      quote: statedPosition,
      outlet: topicData.statedPositionSource?.source ?? 'VoteSmart',
      url: topicData.statedPositionSource?.url ?? '',
      tier: 'nonpartisan',
      // `pos.asOf`/scrape asOf dates are NOT the true statement date — using them here would
      // produce a fabricated gap against the vote date. Only a genuine statedPositionDate
      // counts; otherwise the Said side must show "Date not recorded" (gapDaysBetween
      // already returns null for a non-parseable date).
      date: link.statedPositionDate ?? 'Date not recorded',
      verbatim: true,
    };
  }

  for (const pos of topicData.platformPositions ?? []) {
    if (isDisqualifiedPlatformPosition(pos.text)) continue;
    if (
      platformKeyVoteMatchesLink(pos.text, link) &&
      saidDidSubjectsOverlap(pos.text, `${link.billNumber}: ${link.billTitle}`)
    ) {
      return {
        quote: pos.text,
        outlet: pos.source,
        url: pos.url,
        tier: 'nonpartisan',
        date: link.statedPositionDate ?? 'Date not recorded',
        verbatim: true,
      };
    }
  }

  return null;
}

/** Drop Said→Did link rows that cannot pair a genuine stated position with a vote. */
export function pruneSaidDidLinksByTopic(
  byTopic: Record<string, TopicPositionData>,
): Record<string, SaidDidLinkEntry[]> {
  const out: Record<string, SaidDidLinkEntry[]> = {};
  for (const [topicId, topicData] of Object.entries(byTopic)) {
    const kept: SaidDidLinkEntry[] = [];
    for (const link of topicData.saidDidLinks ?? []) {
      const said = pickSaidForLink(topicId, topicData, link, byTopic);
      if (!said?.quote?.trim() || !said.url?.trim()) continue;
      if (isVoteRestatementSaid(said.quote)) continue;
      kept.push({ ...link, topicId });
    }
    if (kept.length > 0) out[topicId] = kept;
  }
  return out;
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
      const said = pickSaidForLink(topicId, topicData, link, memberTopics);
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
        gapDays: gapDaysBetween(said.date, link.voteDate),
      });
    }
  }

  return diffs.sort(
    (a, b) => new Date(b.did.date).getTime() - new Date(a.did.date).getTime(),
  );
}
