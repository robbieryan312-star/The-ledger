import {
  allPoliticians,
  isCurrentlyInOffice,
  sortOfficialsForDisplay,
} from '@/lib/data/allPoliticians';
import { hasCongressVotes } from '@/lib/data/congressVotes';
import { getFecFinance, hasFecFinance } from '@/lib/data/fecFinance';
import { mergeStockTrades } from '@/lib/data/stockTrades';
import type { Politician } from '@/lib/types';

export type OfficeFilter = 'all' | 'senate' | 'house' | 'governor' | 'state' | 'local';
export type PartyFilter = 'all' | 'Democrat' | 'Republican' | 'Independent';
export type DataCompletenessFilter = 'fec' | 'votes' | 'trades';
export type ValuePreset = 'bipartisan' | 'noPAC' | 'noLobbyist';
export type RosterSort = 'prominence' | 'name' | 'raised' | 'consistency' | 'newestTrade';

export interface StateRosterFilters {
  search: string;
  office: OfficeFilter;
  party: PartyFilter;
  dataCompleteness: DataCompletenessFilter[];
  valuePresets: ValuePreset[];
  inOfficeOnly: boolean;
  sort: RosterSort;
}

export const DEFAULT_ROSTER_FILTERS: StateRosterFilters = {
  search: '',
  office: 'all',
  party: 'all',
  dataCompleteness: [],
  valuePresets: [],
  inOfficeOnly: true,
  sort: 'prominence',
};

export function getPoliticiansForStateRoster(stateCode: string, inOfficeOnly: boolean): Politician[] {
  return allPoliticians.filter((p) => {
    if (p.stateCode !== stateCode) return false;
    if (inOfficeOnly && !isCurrentlyInOffice(p)) return false;
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

function hasTradeData(p: Politician): boolean {
  const { trades } = mergeStockTrades(p.id, p.stockTrades, p.recordType);
  return trades.length > 0;
}

function matchesDataCompleteness(p: Politician, filters: DataCompletenessFilter[]): boolean {
  if (filters.length === 0) return true;
  return filters.every((f) => {
    if (f === 'fec') return hasFecFinance(p.id);
    if (f === 'votes') return hasCongressVotes(p.id);
    return hasTradeData(p);
  });
}

function bipartisanPct(p: Politician): number {
  return 100 - p.consistency.partyLineVotePercentage;
}

function matchesValuePresets(p: Politician, presets: ValuePreset[]): boolean {
  if (presets.length === 0) return true;
  return presets.every((preset) => {
    if (preset === 'bipartisan') return bipartisanPct(p) >= 15;
    if (preset === 'noPAC') return p.campaignFinance.pacDonations === 0;
    return p.campaignFinance.lobbyistMoney.length === 0;
  });
}

export function totalRaisedForSort(p: Politician): number {
  const fec = getFecFinance(p.id);
  if (fec) return fec.receipts;
  return p.campaignFinance.totalRaised;
}

export function newestTradeTimestamp(p: Politician): number {
  const { trades } = mergeStockTrades(p.id, p.stockTrades, p.recordType);
  if (trades.length === 0) return 0;
  return Math.max(...trades.map((t) => new Date(t.date).getTime()));
}

export function filterStateRoster(roster: Politician[], filters: StateRosterFilters): Politician[] {
  const q = filters.search.trim().toLowerCase();

  return roster.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (!matchesOffice(p, filters.office)) return false;
    if (!matchesParty(p, filters.party)) return false;
    if (!matchesDataCompleteness(p, filters.dataCompleteness)) return false;
    if (!matchesValuePresets(p, filters.valuePresets)) return false;
    return true;
  });
}

export function sortStateRoster(roster: Politician[], sort: RosterSort): Politician[] {
  const list = [...roster];

  if (sort === 'prominence') {
    return sortOfficialsForDisplay(list);
  }

  if (sort === 'name') {
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === 'raised') {
    return list.sort((a, b) => totalRaisedForSort(b) - totalRaisedForSort(a));
  }

  if (sort === 'consistency') {
    return list.sort((a, b) => b.consistency.overallScore - a.consistency.overallScore);
  }

  return list.sort((a, b) => newestTradeTimestamp(b) - newestTradeTimestamp(a));
}

export function applyStateRosterFilters(
  roster: Politician[],
  filters: StateRosterFilters,
): Politician[] {
  return sortStateRoster(filterStateRoster(roster, filters), filters.sort);
}

export function rosterUsesDemoFinance(filters: StateRosterFilters): boolean {
  return (
    filters.sort === 'raised' ||
    filters.valuePresets.includes('noPAC') ||
    filters.valuePresets.includes('noLobbyist')
  );
}

export function rosterUsesDemoConsistency(filters: StateRosterFilters): boolean {
  return filters.sort === 'consistency' || filters.valuePresets.includes('bipartisan');
}

export function rosterUsesDemoTrades(filters: StateRosterFilters): boolean {
  return filters.sort === 'newestTrade' || filters.dataCompleteness.includes('trades');
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

export function sortLabel(sort: RosterSort): string {
  const labels: Record<RosterSort, string> = {
    prominence: 'Office prominence',
    name: 'Name A–Z',
    raised: 'Total raised',
    consistency: 'Consistency score',
    newestTrade: 'Newest trade',
  };
  return labels[sort];
}
