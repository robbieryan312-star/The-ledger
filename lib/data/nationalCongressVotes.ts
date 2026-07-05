/**
 * National Congress roll-call votes — single source of truth keyed by bioguideId.
 * Committed snapshot: data/national/votes/congress-votes.json (537 members).
 */
import type { Source, VoteRecord } from '../types';
import nationalSnapshot from '../../data/national/votes/congress-votes.json';
import type { CongressVoteEntry } from './congressVotes';

interface NationalVoteMemberRow {
  bioguideId: string;
  name?: string;
  chamber: 'house' | 'senate';
  votes: VoteRecord[];
  source: Source;
  asOf: string;
}

interface NationalCongressVotesSnapshot {
  meta: { asOf: string; withVoteData?: number; membersQueried?: number };
  byBioguideId: Record<string, NationalVoteMemberRow>;
}

const snapshot = nationalSnapshot as NationalCongressVotesSnapshot;

export function getNationalCongressVotesSnapshot(): NationalCongressVotesSnapshot {
  return snapshot;
}

/** Resolve official roll-call votes for a member by bioguideId (national file). */
export function getNationalCongressVotesByBioguide(
  bioguideId: string,
  politicianId?: string,
): CongressVoteEntry | undefined {
  const row = snapshot.byBioguideId[bioguideId];
  if (!row) return undefined;
  return {
    politicianId: politicianId ?? bioguideId,
    bioguideId: row.bioguideId,
    chamber: row.chamber,
    votes: row.votes,
    source: row.source,
    asOf: row.asOf,
  };
}

export function hasNationalCongressVotes(bioguideId: string): boolean {
  const row = snapshot.byBioguideId[bioguideId];
  return !!row && row.votes.length > 0;
}

export function nationalCongressVotesAsOf(): string {
  return snapshot.meta.asOf;
}
