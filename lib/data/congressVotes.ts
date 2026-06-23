/**
 * congressVotes.ts — read the generated Congress.gov vote snapshot and merge
 * Tier-1 roll-call positions into featured profile display models.
 */
import type { Source, VoteRecord } from '../types';
import congressSnapshot from './generated/congressVotes.json';

export interface CongressVoteEntry {
  politicianId: string;
  bioguideId: string;
  chamber: 'house' | 'senate';
  votes: VoteRecord[];
  source: Source;
  asOf: string;
  congressGovUrl?: string;
  note?: string;
}

export interface CongressVotesSnapshotMeta {
  source: Source;
  asOf: string;
  featuredQueried: number;
  withVoteData: number;
  keyConfigured: boolean;
  houseMembersQueried: number;
  senateMembersQueried?: number;
  senateMembersSkipped: number;
  note?: string;
}

export interface CongressVotesSnapshot {
  meta: CongressVotesSnapshotMeta;
  byPoliticianId: Record<string, CongressVoteEntry>;
}

const snapshot = congressSnapshot as CongressVotesSnapshot;

export function getCongressVotesSnapshot(): CongressVotesSnapshot {
  return snapshot;
}

export function getCongressVotes(politicianId: string): CongressVoteEntry | undefined {
  return snapshot.byPoliticianId[politicianId];
}

export function hasCongressVotes(politicianId: string): boolean {
  const entry = snapshot.byPoliticianId[politicianId];
  return !!entry && entry.votes.length > 0;
}

export function congressVotesCount(): number {
  return Object.values(snapshot.byPoliticianId).filter((e) => e.votes.length > 0).length;
}

/**
 * Overlay official Congress.gov roll-call votes onto a profile's voting record.
 * Lightweight profiles always return an empty list (no fabrication).
 * Featured profiles use real API data when present; otherwise an empty list so
 * the UI can show an honest missing-data label.
 */
export function mergeVotingRecord(
  politicianId: string,
  _mockVotes: VoteRecord[],
  recordType?: 'featured' | 'lightweight',
): { votes: VoteRecord[]; congressEntry?: CongressVoteEntry; usingOfficialVotes: boolean } {
  if (recordType === 'lightweight') {
    return { votes: [], usingOfficialVotes: false };
  }

  const congress = getCongressVotes(politicianId);
  if (congress && congress.votes.length > 0) {
    return { votes: congress.votes, congressEntry: congress, usingOfficialVotes: true };
  }

  // No official snapshot — do not pass through hand-authored mock votes as Tier 1.
  return { votes: [], usingOfficialVotes: false };
}
