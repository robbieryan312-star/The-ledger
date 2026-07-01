/**
 * topicPositions.ts — platform positions, VoteSmart NPAT stated positions, and
 * Said→Did vote links keyed by bioguideId. Produced by sync-topic-positions.ts.
 */
import type { SourceTier, VoteChoice } from '../types';
import { RECORD_TOPIC_BUCKETS } from './profileRecordByTopic';
import snapshot from './generated/topicPositions.json';
import { normalizeTopicId, topicIdsForMergedLookup } from './topicAliases';
import { bestTopicIdForText } from './topicKeywordMatch';

export interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: SourceTier;
  asOf: string;
}

export interface TopicStatementEntry {
  title: string;
  date: string;
  url: string;
  tier: SourceTier;
  topicId: string;
}

export interface StatedPositionSourceEntry {
  tier: SourceTier;
  source: string;
  url: string;
}

export interface SaidDidLinkEntry {
  topicId?: string;
  statedPositionDate: string | null;
  voteDate: string;
  billTitle: string;
  billNumber: string;
  congressGovUrl: string;
  voteChoice: VoteChoice;
  tier: 'official';
}

export interface TopicPositionData {
  platformPositions?: PlatformPositionEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
  statements: TopicStatementEntry[];
  saidDidLinks: SaidDidLinkEntry[];
}

export interface TopicPositionsSnapshotMeta {
  asOf: string;
  source: string;
  totalMembers: number;
  membersWithData: number;
  membersWithPlatformPositions: number;
  membersWithStatedPosition: number;
  membersWithSaidDidLinks: number;
  perTopicCoverage: Record<string, number>;
  votesmartConfigured: boolean;
  note?: string;
}

export interface TopicPositionsSnapshot {
  meta: TopicPositionsSnapshotMeta;
  byBioguideId: Record<string, Record<string, TopicPositionData>>;
}

const data = snapshot as TopicPositionsSnapshot;

function mergeTopicData(existing: TopicPositionData | null, incoming: TopicPositionData): TopicPositionData {
  if (!existing) return incoming;
  return {
    platformPositions: [
      ...(existing.platformPositions ?? []),
      ...(incoming.platformPositions ?? []),
    ],
    statedPosition: existing.statedPosition ?? incoming.statedPosition,
    statedPositionSource: existing.statedPositionSource ?? incoming.statedPositionSource,
    statements: [...existing.statements, ...incoming.statements],
    saidDidLinks: [...existing.saidDidLinks, ...incoming.saidDidLinks],
  };
}

function sanitizeTopicData(rawTopicId: string, topic: TopicPositionData): TopicPositionData | null {
  const canonicalTopicId = normalizeTopicId(rawTopicId);
  const platformPositions = (topic.platformPositions ?? []).filter((position) => {
    return bestTopicIdForText(
      position.text,
      RECORD_TOPIC_BUCKETS.filter((bucket) => bucket.id !== 'legislation'),
    ) === canonicalTopicId;
  });
  const statements = (topic.statements ?? []).filter((statement) => {
    return normalizeTopicId(statement.topicId) === canonicalTopicId;
  });
  const hasPosition = Boolean(topic.statedPosition?.trim());
  const hasPlatform = platformPositions.length > 0;
  const hasStatements = statements.length > 0;
  const saidDidLinks = hasPlatform || hasPosition || hasStatements ? (topic.saidDidLinks ?? []) : [];

  if (!hasPlatform && !hasStatements && !hasPosition && saidDidLinks.length === 0) {
    return null;
  }

  return {
    platformPositions: hasPlatform ? platformPositions : undefined,
    statedPosition: topic.statedPosition,
    statedPositionSource: topic.statedPositionSource,
    statements,
    saidDidLinks,
  };
}

export function getTopicPositions(
  bioguideId: string,
  topicId: string,
): TopicPositionData | null {
  const member = data.byBioguideId[bioguideId];
  if (!member) return null;
  const canonicalTopicId = normalizeTopicId(topicId);
  let merged: TopicPositionData | null = null;

  for (const candidateTopicId of topicIdsForMergedLookup(canonicalTopicId)) {
    const topic = member[candidateTopicId];
    if (!topic) continue;
    const sanitized = sanitizeTopicData(candidateTopicId, topic);
    if (sanitized) merged = mergeTopicData(merged, sanitized);
  }

  return merged;
}

export function getMemberTopicPositions(bioguideId: string): Record<string, TopicPositionData> | null {
  const member = data.byBioguideId[bioguideId];
  if (!member) return null;

  const sanitizedMember: Record<string, TopicPositionData> = {};
  for (const [topicId, topic] of Object.entries(member)) {
    const sanitized = sanitizeTopicData(topicId, topic);
    if (sanitized) sanitizedMember[topicId] = sanitized;
  }

  return Object.keys(sanitizedMember).length > 0 ? sanitizedMember : null;
}

export function countMembersWithTopicPositions(): number {
  return data.meta.membersWithData;
}

export function getTopicPositionsMeta(): TopicPositionsSnapshotMeta {
  return data.meta;
}
