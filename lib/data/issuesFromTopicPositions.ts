/**
 * Build profile Issue[] from topicPositions.json — single source of truth for stance UI.
 */
import type { EvidenceItem, Issue } from '../types';
import {
  STANDARD_POLICY_TOPICS,
  issuesWithTopicCoverage,
  matchTopic,
} from './topicCoverage';
import { getMemberTopicPositions, type TopicPositionData } from './topicPositions';

/** Legacy sync keys before 10-topic consolidation — merged at read time until full re-sync. */
const LEGACY_TOPIC_ALIASES: Record<string, string> = {
  environment: 'climate',
  defense: 'defense-veterans',
  crime: 'public-safety',
  civil: 'civil-liberties',
  judiciary: 'civil-liberties',
  economy: 'economy-taxes',
};

function normalizeTopicId(rawId: string): string {
  return LEGACY_TOPIC_ALIASES[rawId] ?? rawId;
}

function firstSentence(text: string, max = 90): string {
  const sentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text.trim();
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1)}…`;
}

function buildEvidence(topicId: string, data: TopicPositionData): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const st of data.statements) {
    const isVerbatim = st.tier === 'official' || st.tier === 'media';
    items.push({
      type: isVerbatim ? 'quote' : 'statement',
      description: firstSentence(st.title, 140),
      quote: isVerbatim ? st.title : undefined,
      date: st.date,
      source: {
        name:
          st.tier === 'official'
            ? 'Congressional Record (GovInfo)'
            : st.tier === 'media'
              ? 'Journalism'
              : 'Ballotpedia',
        url: st.url,
        tier: st.tier,
        date: st.date,
      },
    });
  }

  for (const p of data.platformPositions?.slice(0, 2) ?? []) {
    items.push({
      type: 'statement',
      description: firstSentence(p.text, 160),
      date: p.asOf,
      source: { name: p.source, url: p.url, tier: p.tier, date: p.asOf },
    });
  }

  for (const link of data.saidDidLinks?.slice(0, 3) ?? []) {
    items.push({
      type: 'vote',
      description: `Voted ${link.voteChoice} on ${link.billNumber}: ${firstSentence(link.billTitle, 100)}`,
      date: link.voteDate,
      source: { name: 'Congress.gov', url: link.congressGovUrl, tier: 'official', date: link.voteDate },
    });
  }

  void topicId;
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mergeTopicData(existing: TopicPositionData | undefined, incoming: TopicPositionData): TopicPositionData {
  if (!existing) return incoming;
  return {
    statements: [...existing.statements, ...incoming.statements],
    platformPositions: [...(existing.platformPositions ?? []), ...(incoming.platformPositions ?? [])],
    statedPosition: existing.statedPosition ?? incoming.statedPosition,
    statedPositionSource: existing.statedPositionSource ?? incoming.statedPositionSource,
    saidDidLinks: [...(existing.saidDidLinks ?? []), ...(incoming.saidDidLinks ?? [])],
  };
}

export function buildIssuesFromTopicPositions(bioguideId: string): Issue[] {
  const member = getMemberTopicPositions(bioguideId);
  if (!member) return [];

  const mergedByPolicy = new Map<string, TopicPositionData>();

  for (const [rawTopicId, data] of Object.entries(member)) {
    const policyId = normalizeTopicId(rawTopicId);
    mergedByPolicy.set(policyId, mergeTopicData(mergedByPolicy.get(policyId), data));
  }

  const issues: Issue[] = [];

  for (const [policyId, data] of mergedByPolicy) {
    const policyDef = STANDARD_POLICY_TOPICS.find((t) => t.id === policyId);
    if (!policyDef) continue;

    const hasContent =
      (data.platformPositions?.length ?? 0) > 0 ||
      data.statements.length > 0 ||
      (data.saidDidLinks?.length ?? 0) > 0 ||
      Boolean(data.statedPosition?.trim());

    if (!hasContent) continue;

    const headline =
      data.statements.find((s) => s.tier === 'media' || s.tier === 'official')?.title ??
      data.platformPositions?.[0]?.text ??
      data.statedPosition ??
      policyDef.label;

    const evidence = buildEvidence(policyId, data);
    const summarySource =
      data.statements[0] ?? data.platformPositions?.[0]
        ? {
            text:
              data.statements[0]?.title ??
              data.platformPositions?.[0]?.text ??
              '',
          }
        : null;

    issues.push({
      name: policyDef.label,
      position: firstSentence(headline, 100),
      detail: summarySource ? firstSentence(summarySource.text, 220) : firstSentence(headline, 220),
      category: policyDef.label,
      statement: summarySource ? firstSentence(summarySource.text, 240) : undefined,
      evidence,
    });
  }

  return issues;
}

/**
 * Pipeline-verified topics first; per-topic legacy topIssues fallback where pipeline has no match;
 * honest gap cards for featured profiles with neither source.
 */
export function buildMergedProfileIssues(
  bioguideId: string | undefined,
  legacyIssues: Issue[],
  isFeatured: boolean,
): Issue[] {
  const pipelineIssues = bioguideId ? buildIssuesFromTopicPositions(bioguideId) : [];
  const merged: Issue[] = [...pipelineIssues];
  const coveredTopicIds = new Set<string>();

  for (const topic of STANDARD_POLICY_TOPICS) {
    if (matchTopic(pipelineIssues, topic)) {
      coveredTopicIds.add(topic.id);
    }
  }

  for (const topic of STANDARD_POLICY_TOPICS) {
    if (coveredTopicIds.has(topic.id)) continue;
    const legacy = matchTopic(legacyIssues, topic);
    if (!legacy) continue;
    merged.push({
      ...legacy,
      name: topic.label,
      category: topic.label,
      pendingIntegration: true,
    });
    coveredTopicIds.add(topic.id);
  }

  return issuesWithTopicCoverage(merged, isFeatured);
}

export function getProfileIssues(
  bioguideId: string | undefined,
  legacyIssues: Issue[],
  isFeatured: boolean,
): Issue[] {
  return buildMergedProfileIssues(bioguideId, legacyIssues, isFeatured);
}
