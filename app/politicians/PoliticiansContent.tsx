'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PoliticianSearchHit, StateRosterEntry } from '@/lib/types/searchIndex';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import StateRosterControls from '@/components/dashboard/StateRosterControls';
import {
  applyStateRosterFilters,
  type DashboardPolitician,
  type StateRosterFilters,
} from '@/lib/dashboard/stateRosterClient';
import {
  applyInOfficeFilter,
  parseRosterSearchParams,
  rosterFiltersToQuery,
} from '@/lib/dashboard/rosterSearchParams';
import { formatCompactCurrency } from '@/lib/format/number';
import { ArrowRight } from 'lucide-react';

export interface PoliticiansListEntry extends DashboardPolitician {
  displayVoteCount: number;
}

export interface PoliticiansCoverageStats {
  total: number;
  executives: number;
  justices: number;
  senators: number;
  representatives: number;
  governors: number;
  withPhotos: number;
  featured: number;
}

type SearchParamsInput = Record<string, string | string[] | undefined>;

interface PoliticiansContentProps {
  initialSearchParams?: SearchParamsInput;
  politicians: PoliticiansListEntry[];
  rosterStates: Array<{ code: string; name: string; activePoliticians: number }>;
  coverageStats: PoliticiansCoverageStats;
  fecFinanceCount: number;
  congressVotesCount: number;
  politicianHits: PoliticianSearchHit[];
  states: StateRosterEntry[];
}

const PAGE_SIZE = 48;

const partyColors: Record<string, string> = {
  Democrat: 'bg-blue-500/20 text-blue-400',
  Republican: 'bg-red-500/20 text-red-400',
  Independent: 'bg-gray-500/20 text-gray-300',
};

function OfficialRow({ p }: { p: PoliticiansListEntry }) {
  return (
    <Link
      href={`/politicians/${p.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-[#1e3a5f] hover:border-[#c8a951]/40 hover:bg-[#1e3a5f]/30 transition-colors group"
    >
      <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.06]">
        <PoliticianAvatar
          name={p.name}
          firstName={p.firstName}
          lastName={p.lastName}
          imageUrl={p.imageUrl}
          textClassName="text-[#c8a951] text-xs font-bold"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-white text-sm font-semibold truncate group-hover:text-[#c8a951]">
          {p.name}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-xs px-1.5 py-0 rounded ${partyColors[p.party] ?? 'bg-gray-500/20 text-gray-300'}`}>
            {p.party[0]}
          </span>
          <span className="text-gray-400 text-xs truncate">{p.resolvedOffice.label}</span>
          {p.displayVoteCount > 0 && (
            <span className="text-[10px] text-gray-600">{p.displayVoteCount} votes on file</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 hidden sm:block">
        <div className="text-xs text-[#c8a951] font-medium">
          {formatCompactCurrency(p.totalRaisedSort)}
        </div>
        <div className="text-[10px] text-gray-600 flex items-center gap-0.5 justify-end mt-0.5">
          Profile <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

function PoliticiansContentInner({
  initialSearchParams,
  politicians,
  coverageStats,
  fecFinanceCount: fecCount,
  congressVotesCount: votesCount,
}: PoliticiansContentProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<StateRosterFilters>(() =>
    parseRosterSearchParams(initialSearchParams ?? {}),
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFilters(parseRosterSearchParams(initialSearchParams ?? {}));
    setPage(1);
  }, [initialSearchParams]);

  const baseRoster = useMemo(
    () => applyInOfficeFilter(politicians, filters.inOfficeOnly),
    [politicians, filters.inOfficeOnly],
  );

  const filtered = useMemo(
    () => applyStateRosterFilters(baseRoster, filters) as PoliticiansListEntry[],
    [baseRoster, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (next: StateRosterFilters) => {
    setFilters(next);
    setPage(1);
    const qs = rosterFiltersToQuery(next);
    router.replace(`/politicians${qs}`, { scroll: false });
  };

  return (
    <section aria-label="Filterable officials roster">
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        {[
          { label: `${coverageStats.total} officials`, sub: 'national roster' },
          { label: `${coverageStats.senators + coverageStats.representatives} Congress`, sub: 'legislators-current' },
          { label: `${coverageStats.governors} governors`, sub: 'NGA roster' },
          { label: `${fecCount} FEC finance`, sub: 'OpenFEC sync' },
          { label: `${votesCount} vote files`, sub: 'Congress.gov sync' },
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

      <StateRosterControls
        filters={filters}
        onChange={handleFilterChange}
        totalCount={baseRoster.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 space-y-2">
        {pageSlice.map((p) => (
          <OfficialRow key={p.id} p={p} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No officials match these filters.</p>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-lg text-sm border border-white/[0.1] text-white/60 hover:text-white disabled:opacity-30"
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
            className="px-4 py-2 rounded-lg text-sm border border-white/[0.1] text-white/60 hover:text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export default function PoliticiansContent(props: PoliticiansContentProps) {
  return <PoliticiansContentInner {...props} />;
}
