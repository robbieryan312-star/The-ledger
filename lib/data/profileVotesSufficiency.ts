/**
 * Sufficiency guard — sitting current members must not have unmarked votes=0 profiles.
 */
import { PROFILE_VOTES_DEPTH_MINIMUMS } from './__fixtures__/profileVotesSufficiency.fixture';

export interface ProfileVotesFileLike {
  bioguideId?: string;
  votes?: unknown[];
  status?: string;
}

export interface ProfileHeaderLike {
  profile?: { currentMember?: boolean };
}

export interface ProfileVotesSufficiencyViolation {
  bioguideId: string;
  message: string;
}

export function validateProfileVotesSufficiency(
  bioguideId: string,
  votesFile: ProfileVotesFileLike,
  headerFile: ProfileHeaderLike,
): ProfileVotesSufficiencyViolation | null {
  const currentMember = headerFile.profile?.currentMember === true;
  if (!currentMember) return null;

  const voteCount = votesFile.votes?.length ?? 0;
  const markedUnavailable = votesFile.status === 'unavailable';
  const depthMinimum = PROFILE_VOTES_DEPTH_MINIMUMS.find((entry) => entry.bioguideId === bioguideId);

  if (depthMinimum && voteCount < depthMinimum.minVotes) {
    return {
      bioguideId,
      message: `locked migrated profile has votes=${voteCount}, expected >=${depthMinimum.minVotes} — likely partial snapshot overwrite`,
    };
  }

  if (voteCount === 0 && !markedUnavailable) {
    return {
      bioguideId,
      message:
        'currentMember:true but votes.json has votes=0 without status:"unavailable" — likely wiring gap, not verified absence',
    };
  }

  return null;
}
