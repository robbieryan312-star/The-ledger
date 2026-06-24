'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Filter, Info, Search, Users } from 'lucide-react';
import {
  AdvocacyGroupCategory,
  LobbyScope,
  getDominantParty,
  getTotalSpending,
  lobbyScopeLabel,
  lobbyingGroupCategories,
  lobbyingScopeOptions,
  mockLobbyingGroups,
} from '@/lib/data/mockLobbyingGroups';
import SourceBadge from '@/components/ui/SourceBadge';
import { FloridaRecordPanel } from '@/components/records/FloridaRecordPanel';
import { getLobbyingFllobbyistSlice } from '@/lib/data/slices/lobbyingFllobbyist';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function PartyDistribution({ group }: { group: (typeof mockLobbyingGroups)[number] }) {
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {group.spendingByParty.parties.map((party) => (
          <div
            key={party.party}
            className={
              party.party === 'Democratic'
                ? 'bg-blue-400'
                : party.party === 'Republican'
                  ? 'bg-red-400'
                  : 'bg-gray-400'
            }
            style={{ width: `${party.percentage}%` }}
            title={`${party.party}: ${party.percentage}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/35">
        {group.spendingByParty.parties.map((party) => (
          <span key={party.party}>
            {party.party.replace('/Other', '')}: {party.percentage}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LobbyingPage() {
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState<AdvocacyGroupCategory | 'all'>('all');
  const [scope, setScope] = useState<LobbyScope | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'spending' | 'scope'>('spending');

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return mockLobbyingGroups
      .filter((group) => {
        if (category !== 'all' && group.category !== category) return false;
        if (scope !== 'all' && group.lobbyScope !== scope) return false;
        if (!q) return true;
        return [
          group.name,
          group.shortName,
          group.description,
          lobbyScopeLabel(group.lobbyScope),
          ...group.issueFocus,
          ...group.formerNames.map((name) => name.name),
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'scope') {
          const scopeOrder = (s: LobbyScope) => (s === 'domestic' ? 0 : 1);
          const byScope = scopeOrder(a.lobbyScope) - scopeOrder(b.lobbyScope);
          if (byScope !== 0) return byScope;
          return a.name.localeCompare(b.name);
        }
        return getTotalSpending(b) - getTotalSpending(a);
      });
  }, [category, scope, searchText, sortBy]);

  const totalDemoSpending = mockLobbyingGroups.reduce((sum, group) => sum + getTotalSpending(group), 0);
  const uniqueIssues = new Set(mockLobbyingGroups.flatMap((group) => group.issueFocus)).size;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/finance" className="text-sm text-white/35 hover:text-[#d4ac52] transition-colors">
          Money & Donors / Lobbying Profiles
        </Link>
        <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Lobbying & Advocacy Groups</h1>
            <p className="text-white/40 max-w-3xl">
              Objective group profiles with disclosed spending patterns, stated issue priorities, history, and source links.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div className="rounded-xl border border-white/[0.07] p-3" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <div className="text-2xl font-bold text-[#d4ac52]">{formatMoney(totalDemoSpending)}</div>
              <div className="text-xs text-white/35">Demo disclosed records</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] p-3" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <div className="text-2xl font-bold text-white">{uniqueIssues}</div>
              <div className="text-xs text-white/35">Issue tags</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 border border-blue-400/20 mb-6 flex items-start gap-3" style={{ background: 'rgba(59,130,246,0.08)' }}>
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-100/80 text-sm leading-relaxed">
          Patterns are based on disclosed donations, endorsements, lobbying filings, and outside-spending records. They are not claims about motive,
          coordination, or improper influence. Demo dollar values should be refreshed from FEC, LDA, FARA, and aggregate sources before publication.
        </p>
      </div>

      <div className="rounded-xl p-4 border border-white/[0.07] mb-6" style={{ background: 'rgba(11,25,41,0.6)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-white/30" />
          <span className="text-white/60 text-sm font-medium">Search & Filter</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_200px_180px] gap-3">
          <label className="relative">
            <Search className="h-4 w-4 text-white/25 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search groups, issues, or former names"
              className="w-full rounded-lg border border-white/[0.08] bg-[#05090f]/70 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#d4ac52]/50"
            />
          </label>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as LobbyScope | 'all')}
            className="rounded-lg border border-white/[0.08] bg-[#05090f]/70 px-3 py-2 text-sm text-white/70 focus:outline-none"
          >
            {lobbyingScopeOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as AdvocacyGroupCategory | 'all')}
            className="rounded-lg border border-white/[0.08] bg-[#05090f]/70 px-3 py-2 text-sm text-white/70 focus:outline-none"
          >
            {lobbyingGroupCategories.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'name' | 'spending' | 'scope')}
            className="rounded-lg border border-white/[0.08] bg-[#05090f]/70 px-3 py-2 text-sm text-white/70 focus:outline-none"
          >
            <option value="spending">Sort: Spending</option>
            <option value="scope">Sort: Domestic first</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      <p className="text-white/30 text-sm mb-4">{filtered.length} groups shown</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((group) => {
          const dominantParty = getDominantParty(group);
          return (
            <Link
              key={group.id}
              href={`/lobbying/${group.id}`}
              className="group rounded-2xl p-5 border border-white/[0.07] hover:border-[#d4ac52]/35 transition-all"
              style={{ background: 'rgba(11,25,41,0.7)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/[0.08]" style={{ background: 'rgba(212,172,82,0.12)' }}>
                  <Building2 className="h-7 w-7 text-[#d4ac52]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-white font-semibold group-hover:text-[#d4ac52] transition-colors">{group.shortName}</h2>
                    <span
                      className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border ${
                        group.lobbyScope === 'foreign'
                          ? 'text-amber-200/80 border-amber-400/25 bg-amber-400/10'
                          : 'text-emerald-200/70 border-emerald-400/20 bg-emerald-400/8'
                      }`}
                    >
                      {lobbyScopeLabel(group.lobbyScope)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-white/35 border border-white/[0.07] rounded-full px-2 py-0.5">
                      {group.category.replaceAll('-', ' ')}
                    </span>
                  </div>
                  <div className="text-white/45 text-xs mb-2">{group.name}</div>
                  <p className="text-white/45 text-sm leading-relaxed line-clamp-3">{group.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {group.issueFocus.slice(0, 4).map((issue) => (
                  <span key={issue} className="text-xs text-[#d4ac52] bg-[#d4ac52]/10 border border-[#d4ac52]/15 rounded-full px-2 py-0.5">
                    {issue}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_170px] gap-4 border-t border-white/[0.06] pt-4">
                <div>
                  <div className="flex justify-between gap-3 mb-2">
                    <span className="text-xs text-white/35">Party support distribution</span>
                    <span className="text-xs text-white/50">{group.spendingByParty.cycle}</span>
                  </div>
                  <PartyDistribution group={group} />
                  <div className="mt-2 text-xs text-white/35">
                    Largest share: {dominantParty.party} ({dominantParty.percentage}%)
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3" style={{ background: 'rgba(5,9,15,0.35)' }}>
                  <div className="flex items-center gap-1.5 text-white/35 text-xs mb-1">
                    <Users className="h-3.5 w-3.5" /> Top recipient sample
                  </div>
                  <div className="text-white text-sm font-medium line-clamp-1">{group.topRecipients[0]?.name}</div>
                  <div className="text-[#d4ac52] text-sm font-bold">{formatMoney(group.topRecipients[0]?.amount ?? 0)}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {group.sources.slice(0, 3).map((source) => (
                    <SourceBadge key={`${group.id}-${source.name}`} source={source} />
                  ))}
                </div>
                <span className="text-xs text-[#d4ac52] flex items-center gap-1 group-hover:gap-2 transition-all">
                  View profile <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/35">
          <p className="text-lg">No advocacy groups match your filters</p>
          <p className="text-sm mt-1">Try a broader issue category or search term</p>
        </div>
      )}

      <div className="mt-10">
        <FloridaRecordPanel
          title="Florida lobbying firm directories (official PDF index)"
          subtitle="Tier 1 Florida Commission on Ethics lobbyist registration directories — PDF links from the public search portal."
          slice={getLobbyingFllobbyistSlice()}
        />
      </div>
    </div>
  );
}
