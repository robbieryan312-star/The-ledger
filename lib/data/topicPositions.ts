/**
 * topicPositions.ts — platform positions, VoteSmart NPAT stated positions, and
 * Said→Did vote links keyed by bioguideId. Produced by sync-topic-positions.ts.
 */
import type { SourceTier, VoteChoice } from '../types';
import snapshot from './generated/topicPositions.json';
import { getMemberProfileTopicPositions } from './memberProfile';

export interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: SourceTier;
  asOf: string;
}

export interface TopicStatementCorroboratingSource {
  url: string;
  outlet?: string;
  date?: string;
  tier?: SourceTier;
}

export interface TopicStatementEntry {
  title: string;
  date: string;
  url: string;
  tier: SourceTier;
  topicId: string;
  /** Required true for tier 'media' or 'alleged' (build-gated). Official CREC floor remarks: true. */
  verbatim?: boolean;
  outlet?: string;
  corroboratingSources?: TopicStatementCorroboratingSource[];
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

export function getTopicPositions(
  bioguideId: string,
  topicId: string,
): TopicPositionData | null {
  const member = getMemberTopicPositions(bioguideId);
  if (!member) return null;
  const topic = member[topicId];
  if (!topic) return null;

  const platformPositions = topic.platformPositions ?? [];
  const statements = topic.statements ?? [];
  const saidDidLinks = topic.saidDidLinks ?? [];
  const hasPosition = Boolean(topic.statedPosition?.trim());
  const hasPlatform = platformPositions.length > 0;

  if (!hasPlatform && statements.length === 0 && !hasPosition && saidDidLinks.length === 0) {
    return null;
  }

  return {
    platformPositions: platformPositions.length > 0 ? platformPositions : undefined,
    statedPosition: topic.statedPosition,
    statedPositionSource: topic.statedPositionSource,
    statements,
    saidDidLinks,
  };
}

export function getMemberTopicPositions(bioguideId: string): Record<string, TopicPositionData> | null {
  const profile = getMemberProfileTopicPositions(bioguideId);
  if (profile) return profile;
  return data.byBioguideId[bioguideId] ?? null;
}

export function countMembersWithTopicPositions(): number {
  return data.meta.membersWithData;
}

export function getTopicPositionsMeta(): TopicPositionsSnapshotMeta {
  return data.meta;
}
