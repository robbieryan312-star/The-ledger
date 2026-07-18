'use client';

import { useState, useEffect, useMemo } from 'react';
import type { CampaignFinance, Politician, Source } from '@/lib/types';
import type { FecFinanceEntry } from '@/lib/data/fecFinance';
import type { CongressVoteEntry } from '@/lib/data/congressVotes';
import type { SnapshotSlice } from '@/lib/types/snapshotTypes';
import FollowTheMoneyPanel from '@/components/finance/FollowTheMoneyPanel';
import SourceBadge from '@/components/ui/SourceBadge';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import { FloridaRecordPanel } from '@/components/records/FloridaRecordPanel';
import { DollarSign, AlertTriangle, TrendingUp, ArrowRight, Info, Building2 } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type SearchParamsInput = Record<string, string | string[] | undefined>;

function paramValue(params: SearchParamsInput, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function FinanceContentInner({
  initialSearchParams,
  featuredWithFinance,
  fecMeta,
  fldoeSlice,
  filingsSlice,
  linkageExample,
}: {
  initialSearchParams: SearchParamsInput;
  featuredWithFinance: Array<{
    politician: Politician;
    finance: CampaignFinance;
    fecEntry?: FecFinanceEntry;
  }>;
  fecMeta: { asOf?: string; source: Source };
  fldoeSlice: SnapshotSlice;
  filingsSlice: SnapshotSlice;
  linkageExample: {
    row: { politician: Politician; finance: CampaignFinance; fecEntry?: FecFinanceEntry };
    congressEntry?: CongressVoteEntry;
  } | null;
}) {
  const [view, setView] = useState<'overview' | 'lobbyists' | 'pacs' | 'filings'>('overview');
  const [sortBy, setSortBy] = useState<'total' | 'lobbyist' | 'pac'>('total');

  useEffect(() => {
    const viewParam = paramValue(initialSearchParams, 'view');
    // 'foreign' is the legacy alias for the reworked PAC & advocacy view.
    if (viewParam === 'pacs' || viewParam === 'foreign') {
      setView('pacs');
    } else if (viewParam === 'lobbyists' || viewParam === 'overview' || viewParam === 'filings') {
      setView(viewParam);
    }
  }, [initialSearchParams]);

  const sorted = [...featuredWithFinance].sort((a, b) => {
    if (sortBy === 'lobbyist') {
      const aL = a.finance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
      const bL = b.finance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
      return bL - aL;
    }
    if (sortBy === 'pac') return b.finance.pacDonations - a.finance.pacDonations;
    return b.finance.totalRaised - a.finance.totalRaised;
  });

  const totalRaised = featuredWithFinance.reduce((s, row) => s + row.finance.totalRaised, 0);
  const totalLobbyist = featuredWithFinance.reduce((s, row) => s + row.finance.lobbyistMoney.reduce((sl, l) => sl + l.amount, 0), 0);
  const totalPAC = featuredWithFinance.reduce((s, row) => s + row.finance.pacDonations, 0);
  const fecBackedCount = featuredWithFinance.filter((row) => !!row.fecEntry).length;

  const chartData = sorted.slice(0, 6).map((row) => ({
    name: row.politician.lastName,
    total: Math.round(row.finance.totalRaised / 1000),
    pac: Math.round(row.finance.pacDonations / 1000),
    lobbyist: Math.round(row.finance.lobbyistMoney.reduce((s, l) => s + l.amount, 0) / 1000),
  }));

  const allLobbyistGroups = featuredWithFinance.flatMap((row) =>
    row.finance.lobbyistMoney.map((l) => ({ ...l, politician: row.politician.name, politicianId: row.politician.id }))
  ).sort((a, b) => b.amount - a.amount);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Follow the Money</h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Campaign receipts, lobbying disclosures, and PAC spending — who funds whom, and what that money buys access to.
          In federal House races during the 2023–2024 cycle, the better-funded major-party candidate won about 94% of contests
          (OpenSecrets, as of 2024 — chamber and cycle specific, not a universal rule).
        </p>
        <p className="text-white/35 text-xs mt-2 max-w-3xl">
          A 2% tax on tea once sparked a revolution because citizens knew who represented them. Today most voters cannot name
          their representatives — follow the money to see who actually holds power.
        </p>
        {fecBackedCount > 0 && (
          <p className="text-gray-500 text-xs mt-1">
            {fecBackedCount} featured profile{fecBackedCount === 1 ? '' : 's'} with official FEC totals (as of {fecMeta.asOf})
          </p>
        )}
      </div>

      {fecBackedCount > 0 && (
        <div className="mb-6 bg-green-400/5 border border-green-400/25 rounded-xl p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-white text-sm font-semibold">Official FEC data integrated</span>
              <SourceBadge source={fecMeta.source} showName size="sm" />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Total raised, spent, and cash-on-hand for {fecBackedCount} featured profiles come from OpenFEC candidate totals.
              Lobbyist and industry breakdowns remain demo-labeled until a separate integration. Run <code className="text-[#c8a951]">npm run sync:fec</code> to refresh.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <DollarSign className="h-5 w-5 text-[#c8a951] mb-1" />
          <div className="text-2xl font-bold text-white">{formatMoney(totalRaised)}</div>
          <div className="text-xs text-gray-400">Total Raised{fecBackedCount > 0 ? ' (FEC where available)' : ' (sample)'}</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-yellow-400/30">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mb-1" />
          <div className="text-2xl font-bold text-yellow-400">{formatMoney(totalLobbyist)}</div>
          <div className="text-xs text-gray-400">Lobbyist Money (demo)</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-orange-400/30">
          <TrendingUp className="h-5 w-5 text-orange-400 mb-1" />
          <div className="text-2xl font-bold text-orange-400">{formatMoney(totalPAC)}</div>
          <div className="text-xs text-gray-400" title="Money from PACs' own treasuries. Conduit-bundled small-dollar money (e.g. ActBlue, WinRed) is reported as individual contributions, not PAC money.">
            PAC contributions{fecBackedCount > 0 ? ' (FEC where available)' : ''}
          </div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <Building2 className="h-5 w-5 text-[#c8a951] mb-1" />
          <div className="text-2xl font-bold text-white/30">—</div>
          <div className="text-xs text-gray-400">PAC &amp; advocacy groups (pipeline pending)</div>
        </div>
      </div>

      <p className="text-gray-500 text-xs leading-relaxed mb-8 -mt-4">
        <span className="text-gray-400 font-medium">How to read these categories:</span>{' '}
        <span className="text-gray-300">Individual contributions</span> are from people;{' '}
        <span className="text-gray-300">PAC contributions</span> are from committees&apos; own treasuries.
        Conduits/bundlers such as ActBlue and WinRed forward earmarked small-dollar individual donations — that
        money is reported as individual contributions, not PAC money, so a low PAC figure does not contradict a
        large conduit total on a profile.
      </p>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'lobbyists', label: 'Lobbyists' },
          { id: 'pacs', label: 'PACs & Advocacy' },
          { id: 'filings', label: 'SEC Filings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as typeof view)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === tab.id
                ? 'bg-[#c8a951] text-[#0a1628]'
                : 'bg-[#0d1f35] text-gray-400 border border-[#1e3a5f] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-white font-semibold text-sm mb-1">Future Lobbying Transparency Layer</div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Production lobbying profiles will show who gave money, supported candidates, related bills, stated agendas, and source links.
            Groups will be labeled by record type, such as domestic PAC, foreign-connected PAC, foreign-affiliated registrant, or issue advocacy.
            For example, AIPAC would be described neutrally as a pro-Israel advocacy/lobbying organization, with any historical or reported labels
            attributed to the source. The UI should present records and sourcing, not conclusions beyond the filings.
          </p>
          <Link
            href="/lobbying"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#c8a951] hover:text-white transition-colors font-medium"
          >
            View demo lobbying group profiles <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {view === 'overview' && (
        <div className="space-y-6">
          <p className="text-white/50 text-sm leading-relaxed border-l-2 border-[#c8a951]/30 pl-3">
            Politicians ranked by total funds raised. Hover any dollar amount for a contribution breakdown by category and top donors.
          </p>

          {/* Politician leaderboard — primary */}
          <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0a1628] flex items-center justify-between">
              <h2 className="text-white font-bold">Most Funded Politicians</h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[#0d1f35] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
              >
                <option value="total">Sort: Total Raised</option>
                <option value="lobbyist">Sort: Lobbying Orgs</option>
                <option value="pac">Sort: PAC Money</option>
              </select>
            </div>
            <div className="divide-y divide-[#1e3a5f]">
              {sorted.map((row) => {
                const p = row.politician;
                const finance = row.finance;
                const lobbyOrgTotal = finance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
                const indivPct = finance.totalRaised > 0
                  ? Math.round((finance.individualDonations / finance.totalRaised) * 100)
                  : 0;
                const topDonors = finance.donors.slice(0, 5);

                return (
                  <Link
                    key={p.id}
                    href={`/politicians/${p.id}?tab=finance`}
                    className="grid grid-cols-5 gap-4 px-5 py-4 hover:bg-[#1e3a5f]/50 transition-colors items-center"
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-xs font-bold text-[#c8a951] overflow-hidden">
                        <PoliticianAvatar name={p.name} firstName={p.firstName} lastName={p.lastName} imageUrl={p.imageUrl} textClassName="text-[#c8a951] font-bold text-xs" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium flex items-center gap-1.5 flex-wrap">
                          {p.name}
                          {row.fecEntry && <SourceBadge source={row.fecEntry.source} size="xs" />}
                        </div>
                        <div className="text-gray-500 text-xs">{p.party} · {p.stateCode}</div>
                      </div>
                    </div>
                    <div className="text-right relative group">
                      <div className="text-white text-sm font-bold cursor-default">{formatMoney(finance.totalRaised)}</div>
                      <div className="text-gray-500 text-xs">{indivPct}% individual{row.fecEntry ? ' · FEC' : ' · demo'}</div>
                      <div className="absolute right-0 top-full z-30 mt-1 hidden group-hover:block w-64 rounded-xl border border-[#1e3a5f] bg-[#0a1628] p-3 shadow-xl text-left">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Contribution breakdown</div>
                        <div className="space-y-1 text-xs mb-2">
                          <div className="flex justify-between"><span className="text-green-400">Individual</span><span className="text-white">{formatMoney(finance.individualDonations)}</span></div>
                          <div className="flex justify-between"><span className="text-red-400">PAC</span><span className="text-white">{formatMoney(finance.pacDonations)}</span></div>
                          <div className="flex justify-between"><span className="text-yellow-400">Lobbying orgs</span><span className="text-white">{formatMoney(lobbyOrgTotal)}</span></div>
                        </div>
                        {topDonors.length > 0 && (
                          <>
                            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1 pt-1 border-t border-[#1e3a5f]">Top donors</div>
                            {topDonors.map((d) => (
                              <div key={d.id} className="flex justify-between text-xs gap-2">
                                <span className="text-gray-400 truncate">{d.name}</span>
                                <span className="text-white flex-shrink-0">{formatMoney(d.amount)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right relative group">
                      <div className={`text-sm font-bold ${finance.pacDonations > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {finance.pacDonations > 0 ? formatMoney(finance.pacDonations) : '$0'}
                      </div>
                      <div className="text-gray-500 text-xs">PAC{row.fecEntry ? '' : ' (demo)'}</div>
                    </div>
                    <div className="text-right relative group">
                      <div className={`text-sm font-bold ${lobbyOrgTotal > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {lobbyOrgTotal > 0 ? formatMoney(lobbyOrgTotal) : '—'}
                      </div>
                      <div className="text-gray-500 text-xs">Lobbying orgs</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Comparison chart — secondary */}
          <div className="bg-[#0d1f35] rounded-2xl p-5 border border-[#1e3a5f]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">Funding Comparison ($K) — top 6</h2>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#c8a951]" />Total</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-400" />PAC</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-yellow-400" />Lobbying orgs</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => `$${v}K`}
                  contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="total" fill="#c8a951" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pac" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lobbyist" fill="#facc15" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <FloridaRecordPanel
            title="Florida state campaign contributions ($25,000+)"
            subtitle="Official disclosures from the Florida Division of Elections Campaign Finance Database."
            slice={fldoeSlice}
          />

          {linkageExample && (
            <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-5">
              <h2 className="text-white font-bold mb-1">Follow the Money — record linkage</h2>
              <p className="text-gray-500 text-xs mb-4">
                Example for {linkageExample.row.politician.name}: Schedule A donors paired with roll-call votes (facts only).
              </p>
              <FollowTheMoneyPanel
                bioguideId={linkageExample.row.politician.bioguideId}
                politicianId={linkageExample.row.politician.id}
                politicianName={linkageExample.row.politician.name}
                fecEntry={linkageExample.row.fecEntry}
                congressEntry={linkageExample.congressEntry}
              />
            </div>
          )}
        </div>
      )}

      {view === 'lobbyists' && (
        <div className="space-y-4">
          <p className="text-white/45 text-xs leading-relaxed border-l-2 border-yellow-400/40 pl-3">
            <strong className="text-white/70">Lobbying</strong> — organizations paid to influence legislation and officials directly (Lobbying Disclosure Act).
            Distinct from PACs, which fund campaigns. Cross-links on each profile where both records exist.
          </p>
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-yellow-400 font-semibold text-sm">Lobbyist Money (demo data)</div>
              <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                Illustrative lobbyist contribution rows for UI behavior only — not synced from OpenFEC.
                Production should source from FEC and OpenSecrets with official and nonpartisan attribution.
              </p>
              <Link
                href="/lobbying"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-yellow-300 hover:text-white transition-colors font-medium"
              >
                Browse advocacy group profiles <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0a1628]">
              <h2 className="text-white font-bold">Lobbyist Contributions by Organization</h2>
            </div>
            <div className="divide-y divide-[#1e3a5f]">
              {allLobbyistGroups.map((item, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{item.organization}</div>
                    <div className="text-gray-400 text-xs">{item.sector}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.issues.map((issue) => (
                        <span key={issue} className="text-xs bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-yellow-400 font-bold">{formatMoney(item.amount)}</div>
                    <Link href={`/politicians/${item.politicianId}`} className="text-xs text-gray-400 hover:text-[#c8a951] flex items-center gap-0.5 justify-end mt-0.5">
                      → {item.politician}
                    </Link>
                  </div>
                </div>
              ))}
              {allLobbyistGroups.length === 0 && (
                <div className="px-5 py-12 text-center text-gray-500">
                  No lobbyist contributions recorded in current sample data
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'pacs' && (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="text-lg text-white/60 font-medium">No verified record available</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            PAC &amp; advocacy group profiles will be populated when real pipelines are integrated from LDA, FARA, and FEC disclosure records.
          </p>
        </div>
      )}

      {view === 'filings' && (
        <div className="space-y-4">
          <p className="text-white/50 text-sm leading-relaxed border-l-2 border-[#c8a951]/30 pl-3">
            SEC EDGAR filings for companies with Florida domicile or headquarters mentions in recent submissions.
          </p>
          <FloridaRecordPanel
            title="Florida-linked SEC EDGAR filings"
            subtitle="Official SEC submissions — company name, form type, and filing date from EDGAR full-text search."
            slice={filingsSlice}
          />
        </div>
      )}
    </div>
  );
}

export default function FinanceContent({
  initialSearchParams = {},
  featuredWithFinance,
  fecMeta,
  fldoeSlice,
  filingsSlice,
  linkageExample,
}: {
  initialSearchParams?: SearchParamsInput;
  featuredWithFinance: Array<{
    politician: Politician;
    finance: CampaignFinance;
    fecEntry?: FecFinanceEntry;
  }>;
  fecMeta: { asOf?: string; source: Source };
  fldoeSlice: SnapshotSlice;
  filingsSlice: SnapshotSlice;
  linkageExample: {
    row: { politician: Politician; finance: CampaignFinance; fecEntry?: FecFinanceEntry };
    congressEntry?: CongressVoteEntry;
  } | null;
}) {
  return (
    <FinanceContentInner
      initialSearchParams={initialSearchParams}
      featuredWithFinance={featuredWithFinance}
      fecMeta={fecMeta}
      fldoeSlice={fldoeSlice}
      filingsSlice={filingsSlice}
      linkageExample={linkageExample}
    />
  );
}
