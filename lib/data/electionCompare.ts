/**
 * electionCompare.ts — resolve election candidates to compare picks and URLs.
 */
import { Candidate, Election } from '../types';
import { getPoliticianById, allPoliticians } from './allPoliticians';
import { mockElections } from './mockElections';

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

/** Map an election candidate to a politician id when a profile exists. */
export function resolveCandidatePoliticianId(candidate: Candidate): string | null {
  if (candidate.incumbentId) {
    const byIncumbent = getPoliticianById(candidate.incumbentId);
    if (byIncumbent) return byIncumbent.id;
  }
  const byName = allPoliticians.find((p) => p.name === candidate.name);
  return byName?.id ?? null;
}

/** Politician id or `cand:{candidateId}` when no profile exists. */
export function resolveCandidatePick(candidate: Candidate): string {
  return resolveCandidatePoliticianId(candidate) ?? candidatePick(candidate.id);
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
export function pickComparePair(election: Election): { a: string; b: string } | null {
  if (election.candidates.length < 2) return null;

  if (election.isPrimary) {
    const r = topByParty(election.candidates, 'Republican', (c) => c.primaryProbability ?? 0);
    const d = topByParty(election.candidates, 'Democrat', (c) => c.primaryProbability ?? 0);
    if (r && d) return { a: resolveCandidatePick(r), b: resolveCandidatePick(d) };
  } else {
    const r = topByParty(election.candidates, 'Republican', (c) => c.winProbability ?? 0);
    const d = topByParty(election.candidates, 'Democrat', (c) => c.winProbability ?? 0);
    if (r && d) return { a: resolveCandidatePick(r), b: resolveCandidatePick(d) };
  }

  return {
    a: resolveCandidatePick(election.candidates[0]),
    b: resolveCandidatePick(election.candidates[1]),
  };
}

export function buildCompareUrl(electionId: string): string {
  const election = mockElections.find((e) => e.id === electionId);
  if (!election) return '/compare';
  const pair = pickComparePair(election);
  if (!pair) return `/compare?election=${electionId}`;
  const params = new URLSearchParams({ election: electionId, a: pair.a, b: pair.b });
  return `/compare?${params}`;
}

export function findElectionCandidate(
  election: Election | undefined,
  pick: string,
): Candidate | undefined {
  if (!election || !isCandidatePick(pick)) return undefined;
  const id = candidateIdFromPick(pick);
  return election.candidates.find((c) => c.id === id);
}
