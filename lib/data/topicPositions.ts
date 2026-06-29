/**
 * topicPositions.ts — per-topic bills, Congressional Record statements, and
 * VoteSmart stated positions keyed by bioguideId. Produced by sync-topic-positions.ts.
 */
import type { SourceTier } from '../types';
import snapshot from './generated/topicPositions.json';

export interface TopicBillEntry {
  title: string;
  billNumber: string;
  date: string;
  url: string;
  role: 'sponsored';
  tier: SourceTier;
  topicId: string;
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

export interface TopicPositionData {
  bills: TopicBillEntry[];
  statements: TopicStatementEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
}

export interface TopicPositionsSnapshotMeta {
  asOf: string;
  source: string;
  totalMembers: number;
  membersWithData: number;
  perTopicCoverage: Record<string, number>;
  validationKept: number;
  validationDiscarded: number;
  validationPassRatePct: number;
}

export interface TopicPositionsSnapshot {
  meta: TopicPositionsSnapshotMeta;
  byBioguideId: Record<string, Record<string, Omit<TopicPositionData, 'bills' | 'statements'> & {
    bills?: TopicBillEntry[];
    statements?: TopicStatementEntry[];
  }>>;
}

const data = snapshot as TopicPositionsSnapshot;

export function getTopicPositions(
  bioguideId: string,
  topicId: string,
): TopicPositionData | null {
  const member = data.byBioguideId[bioguideId];
  if (!member) return null;
  const topic = member[topicId];
  if (!topic) return null;

  const bills = topic.bills ?? [];
  const statements = topic.statements ?? [];
  const hasPosition = Boolean(topic.statedPosition?.trim());

  if (bills.length === 0 && statements.length === 0 && !hasPosition) return null;

  return {
    bills,
    statements,
    statedPosition: topic.statedPosition,
    statedPositionSource: topic.statedPositionSource,
  };
}

export function countMembersWithTopicPositions(): number {
  return data.meta.membersWithData;
}

export function getTopicPositionsMeta(): TopicPositionsSnapshotMeta {
  return data.meta;
}
