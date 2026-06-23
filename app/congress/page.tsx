 'use client';

import { useState, useMemo } from 'react';
import { mockPoliticians } from '@/lib/data/mockPoliticians';
import { mergeStockTrades, getStockTradesSnapshot } from '@/lib/data/stockTrades';
import { TrendingUp, TrendingDown, AlertTriangle, Info, ArrowRight, ArrowUpDown, Filter, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { StockTrade, Party } from '@/lib/types';

type TradeWithMeta = StockTrade & {
  politician: string;
  politicianId: string;
  party: Party;
  stateCode: string;
  gainLossPct: number | null;
  gainLossDollar: number | null;
  isOfficial: boolean;
};

type SortKey = 'politician' | 'date' | 'amount' | 'gain_pct' | 'conflict';

const DATA_SOURCES = [
  { name: 'Senate Stock Watcher', url: 'https://senatestockwatcher.com' },
  { name: 'House Stock Watcher', url: 'https://housestockwatcher.com' },
  { name: 'STOCK Act', url: 'https://www.congress.gov/bill/112th-congress/senate-bill/2038' },
  { name: 'FEC', url: 'https://www.fec.gov' },
];

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function GainLossBadge({ pct, dollar }: { pct: number | null; dollar: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-600">N/A</span>;
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-1 text-sm font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
      <Icon className="h-4 w-4" />
      <span>{positive ? '+' : ''}{pct.toFixed(1)}%</span>
      {dollar !== null && (
        <span className="text-xs font-normal opacity-70">
          ({positive ? '+' : ''}{formatMoney(Math.abs(dollar))})
        </span>
      )}
    </div>
  );
}

function tradeSortValue(t: TradeWithMeta): number {
  return t.amountMax ?? t.amount;
}

function priceMovePct(t: StockTrade): number | null {
  if (t.purchasePriceApprox == null || t.currentPrice == null) return null;
  return ((t.currentPrice - t.purchasePriceApprox) / t.purchasePriceApprox) * 100;
}

function estimatedDollarMove(t: StockTrade): number | null {
  const pct = priceMovePct(t);
  if (pct === null || t.purchasePriceApprox == null || t.currentPrice == null) return null;
  return (t.currentPrice - t.purchasePriceApprox) * ((t.amount ?? t.amountMin) / t.purchasePriceApprox);
}

function DataSourceStrip({ officialCount, demoCount }: { officialCount: number; demoCount: number }) {
  const stockMeta = getStockTradesSnapshot().meta;
  return (
    <div className="bg-[#0a1628] rounded-xl border border-[#1e3a5f] p-4 mb-6">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Data Sources</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {DATA_SOURCES.map((src) => (
          <a
            key={src.name}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0d1f35] text-[#c8a951] border border-[#2d5a8e] hover:border-[#c8a951] hover:text-white transition-colors"
          >
            {src.name}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        {officialCount > 0 ? (
          <>
            <span className="text-green-400/90 font-medium">{officialCount} Tier 1 official PTR transaction(s)</span> from Senate eFD / House Clerk
            {demoCount > 0 && (
              <span className="text-yellow-400/80"> · {demoCount} demo-labeled trade(s) on profiles without official rows</span>
            )}
            . Snapshot as of {stockMeta.asOf}. Run <code className="text-gray-400">npm run sync:stock-trades</code> to refresh.
          </>
        ) : (
          <>
            <span className="text-yellow-400/90 font-medium">Demo dataset for UI review — not a live STOCK Act feed.</span>{' '}
            Official STOCK Act disclosures come from Senate eFD and the House Clerk. Run <code className="text-gray-400">npm run sync:stock-trades</code> when
            the integration pipeline is implemented; until then, trades below are modeled on real disclosure formats for featured profiles only.
          </>
        )}
      </p>
    </div>
  );
}

function ConflictBadge({ score }: { score: number }) {
  const cfg =
    score >= 70 ? { color: 'text-red-400 bg-red-400/10 border-red-400/30', label: 'High review priority' } :
    score >= 40 ? { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'Med review priority' } :
                  { color: 'text-green-400 bg-green-400/10 border-green-400/30', label: 'Low review priority' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <AlertTriangle className="h-3 w-3" />
      {cfg.label} ({score})
    </span>
  );
}

function MethodologyPanel() {
  return (
    <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6 flex items-start gap-3">
      <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-white font-semibold mb-1 text-sm">How this is calculated</div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Exposure uses the midpoint or maximum of the disclosed STOCK Act dollar range; filings report ranges rather than exact trade sizes,
          so exposure is not an accusation. Estimated gain/loss is a rough demo price-move estimate using approximate price fields when available.
          For sales or partial sales, it shows movement after the reported trade, not a verified realized profit. Review priority is a rules-based
          potential conflict indicator based on sector, committee or office relevance, nearby votes/actions, and disclosure timing. It is not
          investment advice, proof of wrongdoing, or a legal conclusion. This page defaults to largest disclosed exposure first for investigative review.
        </p>
      </div>
    </div>
  );
}

export default function CongressStocksPage() {
  const [sortBy, setSortBy] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterParty, setFilterParty] = useState<'All' | 'Democrat' | 'Republican' | 'Independent'>('All');
  const [filterType, setFilterType] = useState<'All' | 'Purchase' | 'Sale' | 'Partial Sale'>('All');
  const [filterConflict, setFilterConflict] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [filterSector, setFilterSector] = useState('All');

  const allTrades: TradeWithMeta[] = useMemo(() =>
    mockPoliticians
      .filter((p) => p.chamber === 'house' || p.chamber === 'senate')
      .flatMap((p) => {
        const { trades, usingOfficialTrades } = mergeStockTrades(p.id, p.stockTrades, p.recordType);
        return trades.map((t) => {
          const gainLossPct = priceMovePct(t);
          const gainLossDollar = estimatedDollarMove(t);
          return {
            ...t,
            politician: p.name,
            politicianId: p.id,
            party: p.party,
            stateCode: p.stateCode,
            gainLossPct,
            gainLossDollar,
            isOfficial: usingOfficialTrades,
          };
        });
      }),
  []);

  const officialTradeCount = allTrades.filter((t) => t.isOfficial).length;
  const demoTradeCount = allTrades.filter((t) => !t.isOfficial).length;

  const sectors = useMemo(() => ['All', ...Array.from(new Set(allTrades.map((t) => t.sector)))], [allTrades]);

  const filtered = useMemo(() => {
    let out = allTrades.filter((t) => {
      if (filterParty !== 'All' && t.party !== filterParty) return false;
      if (filterType !== 'All' && t.type !== filterType) return false;
      if (filterSector !== 'All' && t.sector !== filterSector) return false;
      if (filterConflict === 'High' && t.conflictScore < 70) return false;
      if (filterConflict === 'Medium' && (t.conflictScore < 40 || t.conflictScore >= 70)) return false;
      if (filterConflict === 'Low' && t.conflictScore >= 40) return false;
      return true;
    });

    out.sort((a, b) => {
      if (sortBy === 'politician') {
        const nameCmp = a.politician.localeCompare(b.politician);
        if (nameCmp !== 0) return sortDir === 'desc' ? -nameCmp : nameCmp;
        return tradeSortValue(b) - tradeSortValue(a);
      }
      let va: number, vb: number;
      if (sortBy === 'date') {
        va = new Date(a.date).getTime();
        vb = new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        va = tradeSortValue(a); vb = tradeSortValue(b);
      } else if (sortBy === 'gain_pct') {
        va = a.gainLossPct ?? -Infinity;
        vb = b.gainLossPct ?? -Infinity;
      } else {
        va = a.conflictScore; vb = b.conflictScore;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

    return out;
  }, [allTrades, filterParty, filterType, filterSector, filterConflict, sortBy, sortDir]);

  const highConflict = allTrades.filter((t) => t.conflictScore >= 70);
  const totalValue = allTrades.reduce((s, t) => s + tradeSortValue(t), 0);
  const tradesWithPriceData = allTrades.filter((t) => t.gainLossPct !== null);
  const avgGain = tradesWithPriceData.length > 0
    ? tradesWithPriceData.reduce((s, t) => s + (t.gainLossPct ?? 0), 0) / tradesWithPriceData.length
    : null;

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  }

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortBy === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          active ? 'bg-[#c8a951] text-[#0a1628]' : 'bg-[#0d1f35] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
        }`}
      >
        <ArrowUpDown className="h-3 w-3" />
        {label}
        {active && <span className="opacity-70">{sortDir === 'desc' ? '↓' : '↑'}</span>}
      </button>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Congressional Stock Trades</h1>
        <p className="text-gray-400 text-sm">
          {allTrades.length} STOCK Act disclosures across {new Set(allTrades.map((t) => t.politicianId)).size} featured politicians
          {officialTradeCount > 0 ? (
            <span className="text-green-400/80"> · {officialTradeCount} official Tier 1</span>
          ) : (
            <span className="text-yellow-400/80"> · demo dataset for UI review</span>
          )}
          {demoTradeCount > 0 && officialTradeCount > 0 && (
            <span className="text-yellow-400/80"> · {demoTradeCount} demo-labeled</span>
          )}
        </p>
      </div>

      <DataSourceStrip officialCount={officialTradeCount} demoCount={demoTradeCount} />
      <MethodologyPanel />

      {/* STOCK Act Info */}
      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-white font-semibold mb-1 text-sm">STOCK Act (2012) — Stop Trading on Congressional Knowledge Act</div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Members of Congress must disclose stock trades worth more than $1,000 within 30–45 days of the transaction.
            Gain/loss percentages are estimated using the approximate price at trade date vs. current price (STOCK Act reports value
            ranges, not exact amounts or share prices). Review priority scores (0–100) are computed from committee membership overlap and related votes.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
          <div className="text-2xl font-bold text-white">{allTrades.length}</div>
          <div className="text-xs text-gray-400">Total Trades</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
          <div className="text-2xl font-bold text-[#c8a951]">{formatMoney(totalValue)}</div>
          <div className="text-xs text-gray-400">Disclosed Exposure</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-red-400/20 text-center">
          <div className="text-2xl font-bold text-red-400">{highConflict.length}</div>
          <div className="text-xs text-gray-400">High Review Priority</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
          <div className="text-2xl font-bold text-white">{new Set(allTrades.map((t) => t.politicianId)).size}</div>
          <div className="text-xs text-gray-400">Politicians</div>
        </div>
        {avgGain !== null && (
          <div className={`rounded-xl p-3 border text-center ${avgGain >= 0 ? 'border-green-400/20 bg-green-400/5' : 'border-red-400/20 bg-red-400/5'}`}>
            <div className={`text-2xl font-bold ${avgGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {avgGain >= 0 ? '+' : ''}{avgGain.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">Avg Gain/Loss</div>
          </div>
        )}
      </div>

      {/* Review Priority Alert */}
      {highConflict.length > 0 && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="text-yellow-400 font-semibold text-sm">{highConflict.length} High Review-Priority Disclosures</div>
          </div>
          <p className="text-gray-300 text-xs">
            These trades correlate with the trader&apos;s committee assignments or related legislation, making them useful to review first.
            Correlation does not prove wrongdoing; scores are informational potential conflict indicators only.
          </p>
        </div>
      )}

      {/* Sort + Filter */}
      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6 space-y-3">
        <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort by:
        </div>
        <div className="flex flex-wrap gap-2">
          <SortBtn label="Politician" k="politician" />
          <SortBtn label="Largest Exposure" k="amount" />
          <SortBtn label="Most Recent" k="date" />
          <SortBtn label="Est. Gain / Loss" k="gain_pct" />
          <SortBtn label="Review Priority" k="conflict" />
        </div>

        <div className="border-t border-[#1e3a5f] pt-3">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Democrat', 'Republican', 'Independent'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterParty(p)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  filterParty === p
                    ? p === 'Democrat' ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                    : p === 'Republican' ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                    : 'bg-[#c8a951] text-[#0a1628]'
                    : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {p}
              </button>
            ))}
            <span className="text-gray-600 mx-1">|</span>
            {(['All', 'Purchase', 'Sale', 'Partial Sale'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  filterType === t
                    ? 'bg-[#c8a951] text-[#0a1628]'
                    : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {t}
              </button>
            ))}
            <span className="text-gray-600 mx-1">|</span>
            {(['All', 'High', 'Medium', 'Low'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilterConflict(c)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  filterConflict === c
                    ? c === 'High' ? 'bg-red-400/30 text-red-400 border border-red-400/50'
                    : c === 'Medium' ? 'bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
                    : c === 'Low' ? 'bg-green-400/30 text-green-400 border border-green-400/50'
                    : 'bg-[#c8a951] text-[#0a1628]'
                    : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {c === 'All' ? 'All Priority' : `${c} Priority`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500 self-center">Sector:</span>
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSector(s)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  filterSector === s
                    ? 'bg-[#c8a951] text-[#0a1628]'
                    : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">Showing {filtered.length} of {allTrades.length} trades</div>

      {/* Trade List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No trades match the current filters</p>
          </div>
        ) : (
          filtered.map((trade) => (
            <div
              key={trade.id}
              className={`bg-[#0d1f35] rounded-xl p-4 border ${
                trade.conflictScore >= 70 ? 'border-red-400/30' :
                trade.conflictScore >= 40 ? 'border-yellow-400/30' : 'border-[#1e3a5f]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/politicians/${trade.politicianId}?tab=stocks`}
                    className="flex items-center gap-2 mb-1 group"
                  >
                    <div className={`text-xs px-1.5 py-0.5 rounded ${
                      trade.party === 'Democrat' ? 'bg-blue-500/20 text-blue-400' :
                      trade.party === 'Republican' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>{trade.party[0]}</div>
                    <span className="text-white font-semibold text-base group-hover:text-[#c8a951] transition-colors">{trade.politician}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-[#c8a951]" />
                  </Link>

                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="text-xl font-bold text-[#c8a951]">
                      {formatMoney(trade.amountMin)} – {formatMoney(trade.amountMax)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      trade.type === 'Purchase' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                    }`}>
                      {trade.type === 'Purchase' ? '↑' : '↓'} {trade.type}
                    </span>
                    {trade.gainLossPct !== null && (
                      <GainLossBadge pct={trade.gainLossPct} dollar={trade.gainLossDollar} />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-sm text-gray-400 mb-2">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#0a1628] text-gray-300">{trade.ticker}</span>
                    <span className="text-gray-500">{trade.companyName}</span>
                    <span className="text-xs bg-[#1e3a5f] text-gray-300 px-2 py-0.5 rounded-full">{trade.sector}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                    <span>Traded: {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>Disclosed: {new Date(trade.disclosureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className={`px-1.5 py-0.5 rounded ${trade.daysToDisclose > 30 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#1e3a5f] text-gray-400'}`}>
                      {trade.daysToDisclose}d to disclose
                    </span>
                  </div>

                  {trade.purchasePriceApprox != null && (
                    <div className="flex flex-wrap items-center gap-3 text-xs mb-2 text-gray-500">
                      <span>Price at trade: <span className="text-gray-300">${trade.purchasePriceApprox.toFixed(2)}</span></span>
                      {trade.currentPrice != null && (
                        <span>Current: <span className="text-gray-300">${trade.currentPrice.toFixed(2)}</span></span>
                      )}
                    </div>
                  )}

                  {/* Related Votes / Committees */}
                  {(trade.relatedVotes?.length || trade.relatedCommittees?.length) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {trade.relatedVotes?.map((v) => (
                        <span key={v} className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded">
                          Vote: {v}
                        </span>
                      ))}
                      {trade.relatedCommittees?.map((c) => (
                        <span key={c} className="text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20 px-2 py-0.5 rounded">
                          Committee: {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <ConflictBadge score={trade.conflictScore} />
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-white font-bold text-lg">{formatMoney(tradeSortValue(trade))}</div>
                  <div className="text-gray-500 text-xs">est. max value</div>
                  {trade.gainLossPct !== null && (
                    <div className={`text-sm font-bold mt-1 ${trade.gainLossPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.gainLossPct >= 0 ? '+' : ''}{trade.gainLossPct.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex items-start gap-2 text-xs text-gray-500 bg-[#0d1f35] rounded-lg p-3 border border-[#1e3a5f]">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p className="text-gray-400 text-xs mt-1">
          All data from STOCK Act disclosures filed with the Senate or House. Value ranges are reported ranges — exact amounts are
          not disclosed. Gain/loss percentages are <span className="text-yellow-400/80">demo estimates</span> using historical price data;
          actual gains may differ. Review priority scores are informational potential conflict indicators, not legal determinations.
        </p>
      </div>
    </div>
  );
}
