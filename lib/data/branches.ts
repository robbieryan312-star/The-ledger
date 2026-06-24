/**
 * branches.ts — government branch metadata and helpers.
 */
import { Chamber, GovernmentBranch, Politician } from '../types';

const EXECUTIVE_CHAMBERS: Chamber[] = ['president', 'vice_president', 'cabinet'];
const LEGISLATIVE_CHAMBERS: Chamber[] = ['senate', 'house'];
const STATE_CHAMBERS: Chamber[] = [
  'governor',
  'state_senate',
  'state_house',
  'mayor',
  'city_council',
  'school_board',
];

export const BRANCH_LABELS: Record<GovernmentBranch, string> = {
  executive: 'Executive',
  legislative: 'Legislative',
  judicial: 'Judicial',
  state: 'State & Local',
};

/** Resolve a politician's branch — uses explicit `branch` when set, else derives from chamber/level. */
export function getPoliticianBranch(p: Politician): GovernmentBranch {
  if (p.branch) return p.branch;
  if (EXECUTIVE_CHAMBERS.includes(p.chamber)) return 'executive';
  if (p.chamber === 'scotus') return 'judicial';
  if (LEGISLATIVE_CHAMBERS.includes(p.chamber) && p.level === 'federal') return 'legislative';
  if (STATE_CHAMBERS.includes(p.chamber) || p.level === 'state' || p.level === 'local') {
    return 'state';
  }
  return 'legislative';
}

export function isExecutiveChamber(chamber: Chamber): boolean {
  return EXECUTIVE_CHAMBERS.includes(chamber);
}

export function isJudicialChamber(chamber: Chamber): boolean {
  return chamber === 'scotus';
}
