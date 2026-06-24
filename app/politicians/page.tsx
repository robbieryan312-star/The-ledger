'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockStates } from '@/lib/data/mockPoliticians';
import { allPoliticians, resolveOffice, getCoverageStats, comparePoliticiansByOffice, getPoliticianBranch } from '@/lib/data/allPoliticians';
import type { GovernmentBranch } from '@/lib/data/branches';
import { EXECUTIVE_CHAMBERS } from '@/lib/data/officeResolution';
import { fecFinanceCount } from '@/lib/data/fecFinance';
import { congressVotesCount, mergeVotingRecord } from '@/lib/data/congressVotes';
import { PHOTO_ATTRIBUTION } from '@/lib/data/photos';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import Link from 'next/link';
import SearchBar from '@/components/search/SearchBar';
import { Filter, TrendingUp, DollarSign, AlertTriangle, ArrowRight, Shield, MapPin } from 'lucide-react';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const partyColors: Record<string, string> = {
  Democrat: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Republican: 'bg-red-500/20 text-red-400 border-red-500/30',
  Independent: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  Green: 'bg-green-500/20 text-green-400 border-green-500/30',
  Libertarian: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const PAGE_SIZE = 48;

const BRANCH_FILTERS: { value: '' | GovernmentBranch; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'executive', label: 'Executive' },
  { value: 'legislative', label: 'Legislative' },
  { value: 'judicial', label: 'Judicial' },
];

const coverageStats = getCoverageStats();

function PoliticiansContent() {
  const searchParams = useSearchParams();
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedChamber, setSelectedChamber] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'office' | 'name' | 'consistency' | 'lobbyist'>('office');
  const [searchText, setSearchText] = useState<string>('');

  const [page, setPage] = useState(1);

  useEffect(() => {
    const chamber = searchParams.get('chamber');
    const level = searchParams.get('level');
    const branch = searchParams.get('branch');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const q = searchParams.get('q');
    if (chamber) setSelectedChamber(chamber);
    if (level) setSelectedLevel(level);
    if (branch) setSelectedBranch(branch);
    if (state) setSelectedState(state);
    if (party) setSelectedParty(party);
    if (q) setSearchText(q);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [selectedState, selectedParty, selectedChamber, selectedLevel, selectedBranch, searchText, sortBy]);

  const filtered = allPoliticians
    .filter((p) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.party.toLowerCase().includes(q) && !p.state.toLowerCase().includes(q)) return false;
      }
      if (selectedState && p.stateCode !== selectedState) return false;
      if (selectedParty && p.party !== selectedParty) return false;
      if (selectedBranch && getPoliticianBranch(p) !== selectedBranch) return false;
      if (selectedChamber === 'executive') {
        if (!EXECUTIVE_CHAMBERS.includes(p.chamber)) return false;
      } else if (selectedChamber && p.chamber !== selectedChamber) return false;
      if (selectedLevel && p.level !== selectedLevel) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'consistency') return b.consistency.overallScore - a.consistency.overallScore;
      if (sortBy === 'lobbyist') {
        const aL = a.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
        const bL = b.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
        return bL - aL;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return comparePoliticiansByOffice(a, b);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectStyle: React.CSSProperties = {
    background: 'rgba(5,9,15,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Politicians</h1>
        <p className="text-white/40">
          National coverage: executive officials, Supreme Court justices, Congress, and governors —
          current office derived from authoritative sources.
        </p>
        <p className="text-white/25 text-xs mt-1">
          {PHOTO_ATTRIBUTION.label}.{' '}
          <a href={PHOTO_ATTRIBUTION.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">
            unitedstates/images
          </a>
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[
            { label: `${coverageStats.total} officials`, sub: 'national roster' },
            { label: `${coverageStats.executives} executive`, sub: 'Tier 1 · whitehouse.gov' },
            { label: `${coverageStats.justices} justices`, sub: 'Tier 1 · supremecourt.gov' },
            { label: `${coverageStats.senators + coverageStats.representatives} Congress`, sub: 'Tier 1 · legislators-current' },
            { label: `${coverageStats.governors} governors`, sub: 'Tier 2 · NGA roster' },
            { label: `${coverageStats.withPhotos} with photos`, sub: 'bioguide portraits' },
            { label: `${coverageStats.featured} featured`, sub: 'rich demo profiles' },
            { label: `${fecFinanceCount()} FEC finance`, sub: 'Tier 1 · OpenFEC sync' },
            { label: `${congressVotesCount()} Congress votes`, sub: 'Tier 1 · Congress.gov sync' },
          ].map((chip) => (
            <span
              key={chip.label}
              className="inline-flex flex-col rounded-lg border border-[#c8a951]/20 px-3 py-1.5"
              style={{ background: 'rgba(212,172,82,0.06)' }}
            >
              <span className="text-[#d4ac52] font-semibold">{chip.label}</span>
              <span className="text-white/30 text-[10px]">{chip.sub}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Branch filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {BRANCH_FILTERS.map((b) => {
          const active = selectedBranch === b.value;
          return (
            <button
              key={b.label}
              type="button"
              onClick={() => setSelectedBranch(b.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                active
                  ? 'bg-[#c8a951]/20 text-[#d4ac52] border-[#c8a951]/40'
                  : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/80 hover:border-white/[0.15]'
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 border border-white/[0.07] mb-6" style={{ background: 'rgba(11,25,41,0.6)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-white/30" />
          <span className="text-white/60 text-sm font-medium">Filter & Sort</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { value: selectedState, set: setSelectedState, opts: [['', 'All States'], ...mockStates.map(s => [s.code, s.name])] },
            { value: selectedParty, set: setSelectedParty, opts: [['', 'All Parties'], ...['Democrat', 'Republican', 'Independent', 'Green', 'Libertarian'].map(p => [p, p])] },
            { value: selectedChamber, set: setSelectedChamber, opts: [['', 'All Chambers'], ['executive', 'Executive'], ...['president', 'vice_president', 'cabinet', 'scotus', 'senate', 'house', 'governor', 'state_senate', 'state_house', 'mayor', 'city_council'].map(c => [c, c.replaceAll('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())])] },
            { value: selectedLevel, set: setSelectedLevel, opts: [['', 'All Levels'], ['federal', 'Federal'], ['state', 'State'], ['local', 'Local']] },
            { value: sortBy, set: (v: string) => setSortBy(v as 'office' | 'name' | 'consistency' | 'lobbyist'), opts: [['office', 'Sort: By office'], ['name', 'Sort: Name A–Z'], ['consistency', 'Sort: Consistency'], ['lobbyist', 'Sort: Lobbyist $']] },
          ].map((sel, idx) => (
            <select
              key={idx}
              value={sel.value}
              onChange={(e) => sel.set(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={selectStyle}
            >
              {sel.opts.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <p className="text-white/30 text-sm mb-4">
        {filtered.length} politicians shown
        {filtered.length > PAGE_SIZE && (
          <span className="text-white/20"> · page {safePage} of {totalPages}</span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageSlice.map((politician) => {
          const lobbyistTotal = politician.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
          const resolved = resolveOffice(politician);
          const isLightweight = politician.recordType === 'lightweight';
          const { votes: displayVotes } = mergeVotingRecord(
            politician.id,
            politician.votingRecord,
            politician.recordType,
          );
          return (
            <Link
              key={politician.id}
              href={`/politicians/${politician.id}`}
              className="group rounded-xl p-5 border border-white/[0.07] hover:border-white/[0.18] transition-all"
              style={{ background: 'rgba(11,25,41,0.6)' }}
            >
              <div className="flex items-start gap-3 mb-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/[0.09]"
                     style={{ background: 'linear-gradient(135deg, #0f2236 0%, #07101f 100%)' }}>
                  <PoliticianAvatar
                    name={politician.name}
                    firstName={politician.firstName}
                    lastName={politician.lastName}
                    imageUrl={politician.imageUrl}
                    textClassName="font-bold text-xl text-[#d4ac52]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-white font-semibold group-hover:text-[#d4ac52] transition-colors truncate">
                      {politician.name}
                    </div>
                    {resolved.isCurrent ? (
                      <span className="text-[10px] bg-green-400/15 text-green-400 border border-green-400/25 px-1.5 py-0 rounded-full flex-shrink-0">Current</span>
                    ) : resolved.reason === 'real-former' ? (
                      <span className="text-[10px] bg-gray-400/15 text-gray-300 border border-gray-400/25 px-1.5 py-0 rounded-full flex-shrink-0">Former</span>
                    ) : null}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {resolved.label}
                  </div>
                  <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border ${partyColors[politician.party] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                    {politician.party}
                  </span>
                </div>
              </div>

              {isLightweight ? (
                /* Lightweight, real-sourced record — honest placeholder, no fabricated metrics */
                <div className="space-y-2 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#c8a951]">
                    <Shield className="h-3 w-3" />
                    Real-sourced record · current office verified
                  </div>
                  <p className="text-white/30 text-xs leading-snug">
                    Detailed votes, finance, and positions are not yet integrated for this profile.
                  </p>
                </div>
              ) : (
                /* Featured profile — full metrics */
                <div className="space-y-2 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/35 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Consistency
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div
                          className={`h-full rounded-full ${politician.consistency.overallScore >= 75 ? 'bg-green-400' : politician.consistency.overallScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${politician.consistency.overallScore}%` }}
                        />
                      </div>
                      <span className={`font-bold ${politician.consistency.overallScore >= 75 ? 'text-green-400' : politician.consistency.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {politician.consistency.overallScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/35 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Total Raised
                    </span>
                    <span className="text-white font-medium">{formatMoney(politician.campaignFinance.totalRaised)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1 ${lobbyistTotal > 0 ? 'text-yellow-400' : 'text-white/35'}`}>
                      <AlertTriangle className="h-3 w-3" /> Lobbyist $
                    </span>
                    <span className={`font-medium ${lobbyistTotal > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {lobbyistTotal > 0 ? formatMoney(lobbyistTotal) : 'None'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/35">Votes Recorded</span>
                    <span className="text-white">{displayVotes.length}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: '#d4ac52' }}>
                View Full Profile <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-lg text-sm border border-white/[0.1] text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'rgba(11,25,41,0.6)' }}
          >
            Previous
          </button>
          <span className="text-white/40 text-sm">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-lg text-sm border border-white/[0.1] text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'rgba(11,25,41,0.6)' }}
          >
            Next
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/35">
          <p className="text-lg">No politicians match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}

export default function PoliticiansPage() {
  return (
    <Suspense>
      <PoliticiansContent />
    </Suspense>
  );
}
