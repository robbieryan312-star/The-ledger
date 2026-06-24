import type { VoteviewSlice } from '../snapshotTypes';
import slice from '../generated/slices/profiles-voteview.json';

export function getVoteviewSlice(): VoteviewSlice {
  return slice as VoteviewSlice;
}

export function getVoteviewByBioguide(bioguideId: string | undefined) {
  if (!bioguideId) return undefined;
  return getVoteviewSlice().byBioguideId[bioguideId];
}
