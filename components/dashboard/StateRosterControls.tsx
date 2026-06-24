'use client';

import { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  type StateRosterFilters,
  type OfficeFilter,
  type PartyFilter,
  type VoterTopicFilter,
  type RosterSort,
  DEFAULT_ROSTER_FILTERS,
  officeFilterLabel,
  voterTopicLabel,
  sortLabel,
  rosterUsesDemoConsistency,
  rosterUsesDemoFinance,
  rosterUsesDemoTrades,
} from '@/lib/dashboard/stateRoster';

interface StateRosterControlsProps {
  filters: StateRosterFilters;
  onChange: (next: StateRosterFilters) => void;
  totalCount: number;
  filteredCount: number;
}

const OFFICE_OPTIONS: OfficeFilter[] = ['all', 'senate', 'house', 'governor', 'state', 'local'];
const PARTY_OPTIONS: { value: PartyFilter; label: string }[] = [
  { value: 'all', label: 'All parties' },
  { value: 'Democrat', label: 'D' },
  { value: 'Republican', label: 'R' },
  { value: 'Independent', label: 'I' },
];
const VOTER_TOPIC_OPTIONS: VoterTopicFilter[] = [
  'immigration',
  'education',
  'abortion',
  'guns',
  'healthcare',
  'economy',
];
const SORT_OPTIONS: RosterSort[] = ['office', 'name', 'raised', 'consistency', 'newestTrade'];

function chipClass(active: boolean): string {
  return active
    ? 'bg-[#c8a951] text-[#0a1628] border-[#c8a951] font-semibold'
    : 'bg-[#0d1f35] text-gray-400 border-[#1e3a5f] hover:text-white hover:border-[#c8a951]/40';
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function StateRosterControls({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: StateRosterControlsProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const set = (patch: Partial<StateRosterFilters>) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.office !== 'all' ||
    filters.party !== 'all' ||
    filters.voterTopics.length > 0 ||
    !filters.inOfficeOnly ||
    filters.sort !== 'office';

  const showDemoFinance = rosterUsesDemoFinance(filters);
  const showDemoConsistency = rosterUsesDemoConsistency(filters);
  const showDemoTrades = rosterUsesDemoTrades(filters);

  return (
    <div className="space-y-3">
      {/* Search + sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search by name…"
            aria-label="Search representatives by name"
            className="w-full bg-[#0a1628] border border-[#1e3a5f] rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c8a951]"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <label className="sr-only" htmlFor="roster-sort">Sort roster</label>
          <select
            id="roster-sort"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value as RosterSort })}
            className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c8a951] min-w-[160px]"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>{sortLabel(s)}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              panelOpen || hasActiveFilters
                ? 'bg-[#c8a951]/10 border-[#c8a951]/50 text-[#c8a951]'
                : 'bg-[#0d1f35] border-[#1e3a5f] text-gray-400 hover:text-white'
            }`}
            aria-expanded={panelOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500">
        Showing {filteredCount} of {totalCount} officials
        {filters.inOfficeOnly ? ' · in office (resolver)' : ' · including former'}
        {filters.sort !== 'office' && (
          <> · sorted by {sortLabel(filters.sort).toLowerCase()}</>
        )}
      </p>

      {/* Demo / real data notices */}
      {(showDemoFinance || showDemoConsistency || showDemoTrades) && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-3 py-2 text-[11px] text-yellow-100/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-400/80" />
          <div className="space-y-0.5">
            {showDemoFinance && (
              <p>Finance sorts use OpenFEC totals where synced; otherwise modeled demo finance on featured profiles.</p>
            )}
            {showDemoConsistency && (
              <p>Consistency scores are modeled on featured profiles only — not verified roll-call analysis for every member.</p>
            )}
            {showDemoTrades && (
              <p>Trade sorts prefer official STOCK Act filings where synced; featured profiles may include illustrative demo trades.</p>
            )}
          </div>
        </div>
      )}

      {/* Expandable filter panel */}
      {panelOpen && (
        <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-4 sm:p-5 space-y-5">
          {/* Office */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">Office / chamber</h3>
            <div className="flex flex-wrap gap-2">
              {OFFICE_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set({ office: o })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${chipClass(filters.office === o)}`}
                >
                  {officeFilterLabel(o)}
                </button>
              ))}
            </div>
          </div>

          {/* Party */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">Party</h3>
            <div className="flex flex-wrap gap-2">
              {PARTY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ party: value })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${chipClass(filters.party === value)}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Voter topics */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Voter topics</h3>
            <p className="text-[11px] text-gray-600 mb-2">
              Officials with sourced records on selected issues — combine multiple topics
            </p>
            <div className="flex flex-wrap gap-2">
              {VOTER_TOPIC_OPTIONS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => set({ voterTopics: toggleInList(filters.voterTopics, topic) })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${chipClass(filters.voterTopics.includes(topic))}`}
                >
                  {voterTopicLabel(topic)}
                </button>
              ))}
            </div>
          </div>

          {/* In office */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#1e3a5f]/60">
            <div>
              <h3 className="text-sm text-white font-medium">In office only</h3>
              <p className="text-[11px] text-gray-500">Derived from authoritative office resolver, not hand-typed flags</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={filters.inOfficeOnly}
              onClick={() => set({ inOfficeOnly: !filters.inOfficeOnly })}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                filters.inOfficeOnly ? 'bg-[#c8a951]' : 'bg-[#1e3a5f]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  filters.inOfficeOnly ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_ROSTER_FILTERS)}
              className="text-xs text-gray-500 hover:text-[#c8a951] transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
