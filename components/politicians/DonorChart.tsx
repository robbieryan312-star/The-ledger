'use client';

import { CampaignFinance } from '@/lib/types';
import type { FecFinanceEntry } from '@/lib/data/fecFinance';
import SourceBadge from '@/components/ui/SourceBadge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { DollarSign, AlertTriangle, Globe, Users, Building2, Info } from 'lucide-react';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

const SOURCE_COLORS = ['#c8a951', '#2d5a8e', '#4ade80', '#f87171', '#a78bfa'];

export default function DonorChart({
  finance,
  fecEntry,
}: {
  finance: CampaignFinance;
  fecEntry?: FecFinanceEntry;
}) {
  const total = finance.totalRaised;
  const hasFecTotals = !!fecEntry;

  const sourceData = [
    { name: 'Individual', value: finance.individualDonations, color: '#4ade80' },
    { name: 'PAC / Super PAC', value: finance.pacDonations, color: '#f87171' },
    { name: 'Self-Funding', value: finance.selfFunding, color: '#a78bfa' },
  ].filter((d) => d.value > 0);

  const industryData = finance.topIndustries.map((ind) => ({
    name: ind.industry.length > 18 ? ind.industry.slice(0, 18) + '…' : ind.industry,
    amount: Math.round(ind.amount / 1000),
    percentage: ind.percentage,
  }));

  const lobbyistTotal = finance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
  const foreignTotal = finance.foreignPAC.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      {hasFecTotals && (
        <div className="bg-green-400/5 border border-green-400/25 rounded-xl p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-white text-sm font-semibold">Official FEC totals</span>
              <SourceBadge source={fecEntry.source} showName size="sm" />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Receipts, disbursements, and cash on hand are from OpenFEC for election cycle{' '}
              {fecEntry.electionYear}
              {fecEntry.coverageEnd ? ` (coverage through ${fecEntry.coverageEnd})` : ''}.
              Checked {fecEntry.asOf}.{' '}
              <a
                href={fecEntry.fecProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c8a951] hover:text-white transition-colors"
              >
                View on FEC.gov
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <DollarSign className="h-5 w-5 text-[#c8a951] mb-1" />
          <div className="text-xl font-bold text-white">{formatMoney(total)}</div>
          <div className="text-xs text-gray-400">Total Raised</div>
        </div>
        <div className={`bg-[#0d1f35] rounded-xl p-4 border ${lobbyistTotal > 0 ? 'border-yellow-400/30' : 'border-[#1e3a5f]'}`}>
          <AlertTriangle className={`h-5 w-5 mb-1 ${lobbyistTotal > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
          <div className={`text-xl font-bold ${lobbyistTotal > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {formatMoney(lobbyistTotal)}
          </div>
          <div className="text-xs text-gray-400">Lobbyist Money</div>
        </div>
        <div className={`bg-[#0d1f35] rounded-xl p-4 border ${foreignTotal > 0 ? 'border-red-400/30' : 'border-[#1e3a5f]'}`}>
          <Globe className={`h-5 w-5 mb-1 ${foreignTotal > 0 ? 'text-red-400' : 'text-gray-500'}`} />
          <div className={`text-xl font-bold ${foreignTotal > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {formatMoney(foreignTotal)}
          </div>
          <div className="text-xs text-gray-400">Foreign PAC</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <DollarSign className="h-5 w-5 text-blue-400 mb-1" />
          <div className="text-xl font-bold text-white">{formatMoney(finance.cashOnHand)}</div>
          <div className="text-xs text-gray-400">Cash on Hand</div>
        </div>
      </div>

      {/* Donation Source Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <h3 className="text-white font-semibold mb-4 text-sm">Funding Sources</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {sourceData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatMoney(Number(v))}
                contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {sourceData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-gray-300">{d.name}</span>
                </div>
                <span className="text-white font-medium">{formatMoney(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-white font-semibold text-sm">Top Industries ($K)</h3>
            {hasFecTotals && (
              <span className="text-[10px] uppercase tracking-wide text-yellow-400/80 border border-yellow-400/20 px-1.5 py-0.5 rounded">
                Demo data
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={industryData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 9 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => `$${v}K`}
                contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="amount" fill="#c8a951" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lobbyist Detail */}
      {finance.lobbyistMoney.length > 0 && (
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-yellow-400/30">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <h3 className="text-yellow-400 font-semibold text-sm">Lobbyist Contributions</h3>
            {hasFecTotals && (
              <span className="text-[10px] uppercase tracking-wide text-yellow-400/80 border border-yellow-400/20 px-1.5 py-0.5 rounded ml-auto">
                Demo data — not from FEC sync
              </span>
            )}
          </div>
          <div className="space-y-3">
            {finance.lobbyistMoney.map((l, i) => (
              <div key={i} className="flex items-start justify-between gap-3 border-b border-[#1e3a5f] last:border-0 pb-3 last:pb-0">
                <div>
                  <div className="text-white text-sm font-medium">{l.organization}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{l.sector}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {l.issues.map((issue) => (
                      <span key={issue} className="text-xs px-1.5 py-0.5 bg-yellow-400/10 text-yellow-400 rounded">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-yellow-400 font-bold text-sm whitespace-nowrap">{formatMoney(l.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Donors */}
      {finance.donors.length > 0 && (
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Building2 className="h-4 w-4 text-[#c8a951]" />
            <h3 className="text-white font-semibold text-sm">Top Donors</h3>
            {hasFecTotals && (
              <span className="text-[10px] uppercase tracking-wide text-yellow-400/80 border border-yellow-400/20 px-1.5 py-0.5 rounded ml-auto">
                Demo data — not from FEC sync
              </span>
            )}
          </div>
          <div className="space-y-2">
            {finance.donors.slice(0, 8).map((donor) => (
              <div key={donor.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                    donor.type === 'Super PAC' ? 'bg-red-400/20 text-red-400' :
                    donor.type === 'PAC' ? 'bg-yellow-400/20 text-yellow-400' :
                    'bg-blue-400/20 text-blue-400'
                  }`}>
                    {donor.type}
                  </div>
                  <span className="text-gray-300 text-sm truncate">{donor.name}</span>
                  {donor.isLobbyist && <AlertTriangle className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                </div>
                <span className="text-white font-medium text-sm whitespace-nowrap">{formatMoney(donor.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
