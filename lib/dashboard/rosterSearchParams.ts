import type { GovernmentBranch } from '@/lib/types';
import { getPoliticianBranch } from '@/lib/branches';
import type {
  BranchFilter,
  DashboardPolitician,
  OfficeFilter,
  PartyFilter,
  RosterSort,
  StateRosterFilters,
  VoterTopicFilter,
} from './stateRosterClient';
import { DEFAULT_ROSTER_FILTERS } from './stateRosterClient';

type SearchParamsInput = Record<string, string | string[] | undefined>;

function paramOne(params: SearchParamsInput, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

const OFFICE_VALUES: OfficeFilter[] = ['all', 'senate', 'house', 'governor', 'state', 'local'];
const PARTY_VALUES: PartyFilter[] = ['all', 'Democrat', 'Republican', 'Independent'];
const BRANCH_VALUES: BranchFilter[] = ['all', 'executive', 'legislative', 'judicial', 'state_local'];
const SORT_VALUES: RosterSort[] = ['office', 'name', 'raised', 'consistency', 'newestTrade'];
const TOPIC_VALUES: VoterTopicFilter[] = [
  'immigration',
  'education',
  'abortion',
  'guns',
  'healthcare',
  'economy',
];

function asOffice(value: string | undefined): OfficeFilter {
  if (value && OFFICE_VALUES.includes(value as OfficeFilter)) return value as OfficeFilter;
  return 'all';
}

function asParty(value: string | undefined): PartyFilter {
  if (value && PARTY_VALUES.includes(value as PartyFilter)) return value as PartyFilter;
  return 'all';
}

function asBranch(value: string | undefined): BranchFilter {
  if (value && BRANCH_VALUES.includes(value as BranchFilter)) return value as BranchFilter;
  return 'all';
}

function asSort(value: string | undefined): RosterSort {
  if (value && SORT_VALUES.includes(value as RosterSort)) return value as RosterSort;
  return 'office';
}

function legacyChamberToOffice(chamber: string | undefined): OfficeFilter {
  if (!chamber) return 'all';
  if (chamber === 'senate' || chamber === 'house' || chamber === 'governor') return chamber;
  if (chamber === 'executive') return 'all';
  return 'all';
}

function legacyLevelToBranch(level: string | undefined): BranchFilter {
  if (level === 'state' || level === 'local') return 'state_local';
  if (level === 'federal') return 'all';
  return 'all';
}

/** Map URL search params (incl. legacy branch/chamber/level) → roster filters. */
export function parseRosterSearchParams(params: SearchParamsInput): StateRosterFilters {
  const q = paramOne(params, 'q') ?? paramOne(params, 'search') ?? '';
  const office = asOffice(paramOne(params, 'office') ?? legacyChamberToOffice(paramOne(params, 'chamber')));
  const party = asParty(paramOne(params, 'party'));
  let branch = asBranch(paramOne(params, 'branch'));
  const legacyBranch = legacyLevelToBranch(paramOne(params, 'level'));
  if (branch === 'all' && legacyBranch !== 'all') branch = legacyBranch;

  const topicsRaw = paramOne(params, 'topics') ?? paramOne(params, 'voterTopics') ?? '';
  const voterTopics = topicsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is VoterTopicFilter => TOPIC_VALUES.includes(t as VoterTopicFilter));

  const inOfficeParam = paramOne(params, 'inOffice');
  const inOfficeOnly = inOfficeParam === '0' || inOfficeParam === 'false' ? false : DEFAULT_ROSTER_FILTERS.inOfficeOnly;

  const sortLegacy = paramOne(params, 'sort');
  let sort = asSort(paramOne(params, 'sortBy') ?? sortLegacy);
  if (sortLegacy === 'lobbyist') sort = 'raised';
  if (sortLegacy === 'consistency') sort = 'consistency';

  return {
    search: q,
    office,
    party,
    voterTopics,
    inOfficeOnly,
    sort,
    branch,
    stateCode: (paramOne(params, 'state') ?? '').toUpperCase(),
  };
}

/** Serialize roster filters to query string (canonical param names). */
export function rosterFiltersToQuery(filters: StateRosterFilters): string {
  const p = new URLSearchParams();
  if (filters.search.trim()) p.set('q', filters.search.trim());
  if (filters.office !== 'all') p.set('office', filters.office);
  if (filters.party !== 'all') p.set('party', filters.party);
  if (filters.branch !== 'all') p.set('branch', filters.branch);
  if (filters.stateCode) p.set('state', filters.stateCode);
  if (filters.voterTopics.length) p.set('topics', filters.voterTopics.join(','));
  if (!filters.inOfficeOnly) p.set('inOffice', '0');
  if (filters.sort !== 'office') p.set('sortBy', filters.sort);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export function hrefForRosterFilters(filters: Partial<StateRosterFilters>): string {
  return `/politicians${rosterFiltersToQuery({ ...DEFAULT_ROSTER_FILTERS, ...filters })}`;
}

export function applyInOfficeFilter(
  roster: DashboardPolitician[],
  inOfficeOnly: boolean,
): DashboardPolitician[] {
  if (!inOfficeOnly) return roster;
  return roster.filter((p) => p.inOfficeResolved);
}

export function matchesBranchFilter(p: DashboardPolitician, branch: BranchFilter): boolean {
  if (branch === 'all') return true;
  const b = getPoliticianBranch(p);
  if (branch === 'state_local') return b === 'state';
  return b === (branch as GovernmentBranch);
}

export function filterByStateCode(
  roster: DashboardPolitician[],
  stateCode: string,
): DashboardPolitician[] {
  if (!stateCode) return roster;
  return roster.filter((p) => p.stateCode === stateCode);
}
