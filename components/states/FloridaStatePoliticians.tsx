'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import StateRosterControls from '@/components/dashboard/StateRosterControls';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import {
  applyStateRosterFilters,
  DEFAULT_ROSTER_FILTERS,
  type DashboardPolitician,
  type StateRosterFilters,
} from '@/lib/dashboard/stateRosterClient';

function OfficialListRow({ p }: { p: DashboardPolitician }) {
  const partyColor =
    p.party === 'Democrat' ? 'bg-blue-500/20 text-blue-400' :
    p.party === 'Republican' ? 'bg-red-500/20 text-red-400' :
    'bg-gray-500/20 text-gray-300';

  return (
    <Link
      href={`/politicians/${p.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-[#1e3a5f] hover:border-[#c8a951]/40 hover:bg-[#1e3a5f]/30 transition-colors"
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
        <div className="text-white text-sm font-semibold truncate">{p.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-xs px-1.5 py-0 rounded ${partyColor}`}>{p.party[0]}</span>
          <span className="text-gray-400 text-xs truncate">{p.resolvedOffice.label}</span>
        </div>
      </div>
    </Link>
  );
}

export default function FloridaStatePoliticians({
  politicians,
  stateName,
}: {
  politicians: DashboardPolitician[];
  stateName: string;
}) {
  const [filters, setFilters] = useState<StateRosterFilters>(DEFAULT_ROSTER_FILTERS);
  const baseRoster = useMemo(
    () =>
      filters.inOfficeOnly
        ? politicians.filter((p) => p.inOfficeResolved)
        : politicians,
    [politicians, filters.inOfficeOnly],
  );
  const filtered = useMemo(
    () => applyStateRosterFilters(baseRoster, filters),
    [baseRoster, filters],
  );

  return (
    <section id="politicians" className="scroll-mt-24">
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-widest text-[#c8a951]/80 font-semibold">Elected roster</p>
        <h2 className="text-white font-bold text-xl mt-1">{stateName} officials</h2>
        <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
          Office-ranked roster — filter by chamber, party, or search by name.
        </p>
      </div>
      <StateRosterControls
        filters={filters}
        onChange={setFilters}
        totalCount={baseRoster.length}
        filteredCount={filtered.length}
      />
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No officials match these filters.</p>
        ) : (
          filtered.map((p) => <OfficialListRow key={p.id} p={p} />)
        )}
      </div>
    </section>
  );
}
