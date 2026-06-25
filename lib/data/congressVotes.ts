/**
 * congressVotes.ts — read the generated Congress.gov vote snapshot and merge
 * Tier-1 roll-call positions into featured profile display models.
 */
import type { Source, VoteRecord } from '../types';
import congressSnapshot from './generated/congressVotes.json';
import nationalVotesSnapshot from '../../data/votes/national/congress-votes.json';

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

interface NationalVoteMember {
  bioguideId: string;
  name: string;
  chamber: string;
  votes: VoteRecord[];
  source: Source;
  asOf: string;
}

interface NationalVotesSnapshotMeta {
  source: Source;
  asOf: string;
  fetchedAt?: string;
  membersQueried?: number;
  withVoteData?: number;
  totalVotePositions?: number;
  failureCount?: number;
  keyConfigured?: boolean;
  note?: string;
}

interface NationalVotesSnapshot {
  meta: NationalVotesSnapshotMeta;
  byBioguideId: Record<string, NationalVoteMember>;
}

const nationalSnapshot = nationalVotesSnapshot as NationalVotesSnapshot;

export function getCongressVotesSnapshot(): CongressVotesSnapshot {
  return snapshot;
}

export function getNationalVotesSnapshot(): NationalVotesSnapshot {
  return nationalSnapshot;
}

function nationalEntryToCongressEntry(row: NationalVoteMember): CongressVoteEntry {
  return {
    politicianId: row.bioguideId,
    bioguideId: row.bioguideId,
    chamber: row.chamber === 'senate' ? 'senate' : 'house',
    votes: row.votes,
    source: row.source,
    asOf: row.asOf,
    congressGovUrl: 'https://www.congress.gov',
    note: `${row.votes.length} official roll-call position(s) from national sync.`,
  };
}

function lookupCongressVotes(politicianId: string, bioguideId?: string): CongressVoteEntry | undefined {
  const featured =
    snapshot.byPoliticianId[politicianId] ??
    (bioguideId ? snapshot.byPoliticianId[bioguideId] : undefined);
  if (featured && featured.votes.length > 0) return featured;

  const nationalRow =
    (bioguideId ? nationalSnapshot.byBioguideId[bioguideId] : undefined) ??
    nationalSnapshot.byBioguideId[politicianId];
  if (nationalRow && nationalRow.votes.length > 0) {
    return nationalEntryToCongressEntry(nationalRow);
  }
  return featured;
}

export function getCongressVotes(politicianId: string, bioguideId?: string): CongressVoteEntry | undefined {
  return lookupCongressVotes(politicianId, bioguideId);
}

export function hasCongressVotes(politicianId: string, bioguideId?: string): boolean {
  const entry = lookupCongressVotes(politicianId, bioguideId);
  return !!entry && entry.votes.length > 0;
}

export function congressVotesCount(): number {
  const withVotes = new Set<string>();
  for (const [id, e] of Object.entries(snapshot.byPoliticianId)) {
    if (e.votes.length > 0) withVotes.add(id);
  }
  for (const [id, e] of Object.entries(nationalSnapshot.byBioguideId)) {
    if (e.votes.length > 0) withVotes.add(id);
  }
  return withVotes.size;
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
  bioguideId?: string,
): { votes: VoteRecord[]; congressEntry?: CongressVoteEntry; usingOfficialVotes: boolean } {
  const congress = lookupCongressVotes(politicianId, bioguideId);
  if (congress && congress.votes.length > 0) {
    return { votes: congress.votes, congressEntry: congress, usingOfficialVotes: true };
  }

  if (recordType === 'lightweight') {
    return { votes: [], usingOfficialVotes: false };
  }

  // Featured profile without official snapshot — do not pass mock votes as Tier 1.
  return { votes: [], usingOfficialVotes: false };
}
