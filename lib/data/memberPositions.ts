/**
 * memberPositions.ts — VoteSmart stated positions and Congressional Record floor
 * statements per topic, keyed by bioguideId. Produced by sync-positions-national.ts.
 */
import type { Source, SourceTier } from '../types';
import snapshot from './generated/memberPositions.json';

export interface FloorStatement {
  title: string;
  date: string;
  url: string;
  excerpt: string;
  tier: SourceTier;
}

export interface TopicPositionEntry {
  statedPosition?: string;
  positionSource?: Source;
  floorStatements: FloorStatement[];
}

export interface MemberPositionsSnapshotMeta {
  source: Source;
  asOf: string;
  fetchedAt: string;
  membersQueried: number;
  membersWithPositions: number;
  membersWithFloorStatements: number;
  membersWithAnyTopicData: number;
  topicCoveragePct: number;
  votesmartConfigured: boolean;
  note?: string;
}

export interface MemberPositionsSnapshot {
  meta: MemberPositionsSnapshotMeta;
  byBioguideId: Record<string, Record<string, TopicPositionEntry>>;
}

const data = snapshot as MemberPositionsSnapshot;

export function getMemberPositions(
  bioguideId?: string,
): MemberPositionsSnapshot | Record<string, TopicPositionEntry> | null {
  if (!bioguideId) return data;
  return data.byBioguideId[bioguideId] ?? null;
}

export function getTopicPosition(bioguideId: string, topicId: string): TopicPositionEntry | null {
  const member = data.byBioguideId[bioguideId];
  if (!member) return null;
  return member[topicId] ?? null;
}

export function getMemberPositionsMeta(): MemberPositionsSnapshotMeta {
  return data.meta;
}
