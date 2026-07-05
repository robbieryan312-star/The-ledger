import type { Candidate, Election } from '@/lib/types';

export const CANDIDATE_PICK_PREFIX = 'cand:';

export function isCandidatePick(pick: string): boolean {
  return pick.startsWith(CANDIDATE_PICK_PREFIX);
}

export function candidateIdFromPick(pick: string): string {
  return pick.slice(CANDIDATE_PICK_PREFIX.length);
}

export function candidatePick(candidateId: string): string {
  return `${CANDIDATE_PICK_PREFIX}${candidateId}`;
}

export function findElectionCandidate(
  election: Election | undefined,
  pick: string,
): Candidate | undefined {
  if (!election || !isCandidatePick(pick)) return undefined;
  const id = candidateIdFromPick(pick);
  return election.candidates.find((c) => c.id === id);
}

function topByParty<T extends Candidate>(
  candidates: T[],
  party: string,
  score: (c: T) => number,
): T | undefined {
  return [...candidates]
    .filter((c) => c.party === party)
    .sort((a, b) => score(b) - score(a))[0];
}

/** Pick the most comparable pair for a race (general: R vs D; primary: top R vs top D). */
export function pickComparePair(
  election: Election,
  resolvePick: (candidate: Candidate) => string,
): { a: string; b: string } | null {
  if (election.candidates.length < 2) return null;

  if (election.isPrimary) {
    const r = topByParty(election.candidates, 'Republican', (c) => c.primaryProbability ?? 0);
    const d = topByParty(election.candidates, 'Democrat', (c) => c.primaryProbability ?? 0);
    if (r && d) return { a: resolvePick(r), b: resolvePick(d) };
  } else {
    const r = topByParty(election.candidates, 'Republican', (c) => c.winProbability ?? 0);
    const d = topByParty(election.candidates, 'Democrat', (c) => c.winProbability ?? 0);
    if (r && d) return { a: resolvePick(r), b: resolvePick(d) };
  }

  return {
    a: resolvePick(election.candidates[0]),
    b: resolvePick(election.candidates[1]),
  };
}
