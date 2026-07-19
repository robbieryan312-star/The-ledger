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

const PREVIEW_LIMIT = 4;

function OfficialListRow({ p }: { p: DashboardPolitician }) {
  const partyColor =
    p.party === 'Democrat' ? 'bg-blue-500/20 text-blue-400' :
    p.party === 'Republican' ? 'bg-red-500/20 text-red-400' :
    'bg-gray-500/20 text-gray-300';

  return (
    <Link
      href={`/politicians/${p.id}`}
      className="flex items-center gap-3 py-2.5 border-t border-[var(--border-subtle)] first:border-t-0 hover:bg-[var(--foreground)]/[0.02] transition-colors group"
    >
      <div className="w-[38px] h-[38px] rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.08]">
        <PoliticianAvatar
          name={p.name}
          firstName={p.firstName}
          lastName={p.lastName}
          imageUrl={p.imageUrl}
          textClassName="text-[var(--gold)] text-xs font-bold"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[var(--foreground)] text-[13px] font-semibold truncate">{p.name}</div>
        <div className="text-[11.5px] text-[var(--muted)] truncate">{p.resolvedOffice.label}</div>
      </div>
      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${partyColor}`}>
        {p.party[0]}
      </span>
      <span className="text-[11px] text-[var(--muted)]/90 group-hover:text-[var(--gold)] flex-shrink-0 ml-1">
        profile →
      </span>
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
  const [showFullRoster, setShowFullRoster] = useState(false);
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
  const preview = baseRoster.slice(0, PREVIEW_LIMIT);
  const remaining = Math.max(0, baseRoster.length - PREVIEW_LIMIT);

  return (
    <section id="politicians" className="scroll-mt-24 py-7 border-b border-[var(--border-subtle)]">
      <div className="mb-4">
        <span className="font-mono text-[10.5px] tracking-widest text-[var(--gold)]">§03</span>
        <h2 className="text-base font-semibold text-[var(--foreground)] mt-1">Officials</h2>
        <p className="text-[12.5px] text-[var(--muted)] mt-1 max-w-prose">
          Ordered by office — statewide and federal first. Each links to a full profile.
        </p>
      </div>

      {!showFullRoster ? (
        <>
          <div>
            {preview.map((p) => (
              <OfficialListRow key={p.id} p={p} />
            ))}
          </div>
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShowFullRoster(true)}
              className="w-full mt-2 py-2.5 text-center text-[12px] text-[var(--muted)] border-t border-[var(--border-subtle)] hover:text-[var(--gold)] transition-colors"
            >
              +{remaining} more · filter by chamber, party, or name →
            </button>
          )}
        </>
      ) : (
        <>
          <StateRosterControls
            filters={filters}
            onChange={setFilters}
            totalCount={baseRoster.length}
            filteredCount={filtered.length}
          />
          <div className="mt-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No officials match these filters.</p>
            ) : (
              filtered.map((p) => <OfficialListRow key={p.id} p={p} />)
            )}
          </div>
        </>
      )}

      <p className="text-[10px] text-[var(--muted)]/90 mt-4 pt-3 border-t border-[var(--border-subtle)]">
        Roster:{' '}
        <a
          href="https://github.com/unitedstates/congress-legislators"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--foreground)]/85 border-b border-[var(--border-default)]"
        >
          unitedstates/congress-legislators
        </a>
        {' · '}portraits from official{' '}
        <a href="https://www.flsenate.gov" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)]/85 border-b border-[var(--border-default)]">
          .gov
        </a>{' '}
        sources
      </p>
    </section>
  );
}
