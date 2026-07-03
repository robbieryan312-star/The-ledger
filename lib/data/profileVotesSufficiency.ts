/**
 * Sufficiency guard — sitting current members must not have unmarked votes=0 profiles.
 */

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

  if (voteCount === 0 && !markedUnavailable) {
    return {
      bioguideId,
      message:
        'currentMember:true but votes.json has votes=0 without status:"unavailable" — likely wiring gap, not verified absence',
    };
  }

  return null;
}
