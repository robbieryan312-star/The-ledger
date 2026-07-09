import { comparePoliticiansByOffice } from '@/lib/politicianSort';
import { getPoliticianBranch } from '@/lib/branches';
import type { Politician, ResolvedOffice } from '@/lib/types';

export type OfficeFilter = 'all' | 'senate' | 'house' | 'governor' | 'state' | 'local';
export type PartyFilter = 'all' | 'Democrat' | 'Republican' | 'Independent';
export type BranchFilter = 'all' | 'executive' | 'legislative' | 'judicial' | 'state_local';
export type VoterTopicFilter =
  | 'immigration'
  | 'education'
  | 'abortion'
  | 'guns'
  | 'healthcare'
  | 'economy';
export type RosterSort = 'office' | 'name' | 'raised' | 'consistency' | 'newestTrade';

export interface StateRosterFilters {
  search: string;
  office: OfficeFilter;
  party: PartyFilter;
  voterTopics: VoterTopicFilter[];
  inOfficeOnly: boolean;
  sort: RosterSort;
  branch: BranchFilter;
  stateCode: string;
}

export const DEFAULT_ROSTER_FILTERS: StateRosterFilters = {
  search: '',
  office: 'all',
  party: 'all',
  voterTopics: [],
  inOfficeOnly: true,
  sort: 'office',
  branch: 'all',
  stateCode: '',
};

export interface DashboardPolitician extends Politician {
  resolvedOffice: ResolvedOffice;
  inOfficeResolved: boolean;
  totalRaisedSort: number;
  newestTradeTs: number;
}

const TOPIC_CATEGORY_MATCH: Record<VoterTopicFilter, string[]> = {
  immigration: ['immigration'],
  education: ['education'],
  abortion: ['abortion', 'reproductive'],
  guns: ['gun', 'guns', 'firearm'],
  healthcare: ['healthcare', 'health care'],
  economy: ['economy', 'fiscal', 'tax', 'budget'],
};

export function politiciansForStateRoster(
  politicians: DashboardPolitician[],
  stateCode: string,
  inOfficeOnly: boolean,
): DashboardPolitician[] {
  return politicians.filter((p) => {
    if (p.stateCode !== stateCode) return false;
    if (inOfficeOnly && !p.inOfficeResolved) return false;
    return true;
  });
}

function matchesOffice(p: Politician, office: OfficeFilter): boolean {
  if (office === 'all') return true;
  if (office === 'senate') return p.chamber === 'senate';
  if (office === 'house') return p.chamber === 'house';
  if (office === 'governor') return p.chamber === 'governor';
  if (office === 'state') {
    return p.level === 'state' && p.chamber !== 'governor';
  }
  return p.level === 'local';
}

function matchesParty(p: Politician, party: PartyFilter): boolean {
  if (party === 'all') return true;
  return p.party === party;
}

function politicianHasTopicEvidence(p: Politician, topic: VoterTopicFilter): boolean {
  const needles = TOPIC_CATEGORY_MATCH[topic];
  const issues = p.topIssues ?? [];
  return issues.some((issue) => {
    const cat = (issue.category ?? issue.name).toLowerCase();
    const matchesTopic = needles.some((n) => cat.includes(n));
    if (!matchesTopic) return false;
    const evidence = issue.evidence ?? [];
    return evidence.length > 0 || Boolean(issue.statement);
  });
}

function matchesVoterTopics(p: Politician, topics: VoterTopicFilter[]): boolean {
  if (topics.length === 0) return true;
  return topics.every((topic) => politicianHasTopicEvidence(p, topic));
}

function matchesBranch(p: Politician, branch: BranchFilter): boolean {
  if (branch === 'all') return true;
  const b = getPoliticianBranch(p);
  if (branch === 'state_local') return b === 'state';
  return b === branch;
}

export function filterStateRoster(
  roster: DashboardPolitician[],
  filters: StateRosterFilters,
): DashboardPolitician[] {
  const q = filters.search.trim().toLowerCase();

  return roster.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (!matchesOffice(p, filters.office)) return false;
    if (!matchesParty(p, filters.party)) return false;
    if (!matchesBranch(p, filters.branch)) return false;
    if (filters.stateCode && p.stateCode !== filters.stateCode) return false;
    if (!matchesVoterTopics(p, filters.voterTopics)) return false;
    return true;
  });
}

export function sortStateRoster(
  roster: DashboardPolitician[],
  sort: RosterSort,
): DashboardPolitician[] {
  const list = [...roster];

  if (sort === 'office') {
    return list.sort(comparePoliticiansByOffice);
  }

  if (sort === 'name') {
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === 'raised') {
    return list.sort((a, b) => b.totalRaisedSort - a.totalRaisedSort);
  }

  if (sort === 'consistency') {
    return list.sort((a, b) => b.consistency.overallScore - a.consistency.overallScore);
  }

  return list.sort((a, b) => b.newestTradeTs - a.newestTradeTs);
}

export function applyStateRosterFilters(
  roster: DashboardPolitician[],
  filters: StateRosterFilters,
): DashboardPolitician[] {
  return sortStateRoster(filterStateRoster(roster, filters), filters.sort);
}

export function rosterUsesDemoFinance(filters: StateRosterFilters): boolean {
  return filters.sort === 'raised';
}

export function rosterUsesDemoConsistency(filters: StateRosterFilters): boolean {
  return filters.sort === 'consistency';
}

export function rosterUsesDemoTrades(filters: StateRosterFilters): boolean {
  return filters.sort === 'newestTrade';
}

export function officeFilterLabel(office: OfficeFilter): string {
  const labels: Record<OfficeFilter, string> = {
    all: 'All offices',
    senate: 'U.S. Senate',
    house: 'U.S. House',
    governor: 'Governor',
    state: 'State legislature',
    local: 'Local',
  };
  return labels[office];
}

export function voterTopicLabel(topic: VoterTopicFilter): string {
  const labels: Record<VoterTopicFilter, string> = {
    immigration: 'Immigration',
    education: 'Education',
    abortion: 'Abortion',
    guns: 'Gun policy',
    healthcare: 'Healthcare',
    economy: 'Economy & taxes',
  };
  return labels[topic];
}

export function sortLabel(sort: RosterSort): string {
  const labels: Record<RosterSort, string> = {
    office: 'By office',
    name: 'Name A–Z',
    raised: 'Total raised',
    consistency: 'Consistency score',
    newestTrade: 'Newest trade',
  };
  return labels[sort];
}
