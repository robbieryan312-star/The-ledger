import type { PartyVoteBreakdown, VoteChoice } from '../types';

type PartyCode = 'R' | 'D' | 'I' | 'other';

function emptyBreakdown(): PartyVoteBreakdown {
  return {
    republican: { yea: 0, nay: 0, notVoting: 0 },
    democrat: { yea: 0, nay: 0, notVoting: 0 },
    independent: { yea: 0, nay: 0, notVoting: 0 },
  };
}

function normalizeParty(raw: string): PartyCode {
  const p = raw.trim().toUpperCase();
  if (p === 'R' || p.startsWith('REP')) return 'R';
  if (p === 'D' || p.startsWith('DEM')) return 'D';
  if (p === 'I' || p.startsWith('IND')) return 'I';
  return 'other';
}

function bucketFor(party: PartyCode): keyof PartyVoteBreakdown {
  if (party === 'R') return 'republican';
  if (party === 'D') return 'democrat';
  return 'independent';
}

function increment(
  breakdown: PartyVoteBreakdown,
  party: PartyCode,
  choice: VoteChoice,
): void {
  const key = bucketFor(party);
  const slot = breakdown[key] ?? breakdown.independent!;
  if (choice === 'Yea') slot.yea += 1;
  else if (choice === 'Nay') slot.nay += 1;
  else slot.notVoting = (slot.notVoting ?? 0) + 1;
}

/** Aggregate Yea/Nay by party from roll-call member rows. */
export function computePartyBreakdown(
  members: Array<{ party: string; voteCast: VoteChoice }>,
): PartyVoteBreakdown | undefined {
  if (members.length === 0) return undefined;

  const breakdown = emptyBreakdown();
  for (const m of members) {
    increment(breakdown, normalizeParty(m.party), m.voteCast);
  }

  const total =
    breakdown.republican.yea + breakdown.republican.nay +
    breakdown.democrat.yea + breakdown.democrat.nay +
    (breakdown.independent?.yea ?? 0) + (breakdown.independent?.nay ?? 0);

  return total > 0 ? breakdown : undefined;
}
