'use client';

import { useMemo, useState } from 'react';
import { StockTrade, TradeTimelineEvent, Source } from '@/lib/types';
import { TrendingUp, TrendingDown, AlertTriangle, Info, ArrowUpDown, ChevronDown, ChevronRight, Vote, MessageSquare, Landmark, BarChart2, FileText, Calendar, Filter, ExternalLink } from 'lucide-react';

type SortKey = 'date' | 'amount' | 'gain_pct' | 'conflict';
type ConflictFilter = 'All' | 'High' | 'Medium' | 'Low';

const EVENT_ICONS: Record<TradeTimelineEvent['type'], typeof Vote> = {
  vote: Vote,
  statement: MessageSquare,
  committee_action: Landmark,
  hearing: Landmark,
  bill_signed: FileText,
  market_event: BarChart2,
};

const EVENT_COLORS: Record<TradeTimelineEvent['type'], string> = {
  vote: 'text-blue-400',
  statement: 'text-purple-400',
  committee_action: 'text-orange-400',
  hearing: 'text-orange-400',
  bill_signed: 'text-green-400',
  market_event: 'text-[#c8a951]',
};

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

function tradeSortValue(trade: StockTrade): number {
  return trade.amountMax ?? trade.amount;
}

function priceMovePct(trade: StockTrade): number | null {
  if (trade.purchasePriceApprox == null || trade.currentPrice == null) return null;
  return ((trade.currentPrice - trade.purchasePriceApprox) / trade.purchasePriceApprox) * 100;
}

function estimatedDollarMove(trade: StockTrade): number | null {
  const pct = priceMovePct(trade);
  if (pct === null || trade.purchasePriceApprox == null || trade.currentPrice == null) return null;
  return (trade.currentPrice - trade.purchasePriceApprox) * ((trade.amount ?? trade.amountMin) / trade.purchasePriceApprox);
}

function GainLossBadge({ trade }: { trade: StockTrade }) {
  const pct = priceMovePct(trade);
  if (pct === null) return null;
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const dollar = estimatedDollarMove(trade);
  return (
    <div className={`inline-flex items-center gap-1 text-sm font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
      <Icon className="h-3.5 w-3.5" />
      {positive ? '+' : ''}{pct.toFixed(1)}%
      {dollar !== null && (
        <span className="text-xs font-normal opacity-70">
          ({positive ? '+' : ''}{formatMoney(Math.abs(dollar))})
        </span>
      )}
    </div>
  );
}

function ConflictBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-red-400 bg-red-400/10 border-red-400/30' :
    score >= 40 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
    'text-green-400 bg-green-400/10 border-green-400/30';
  const label = score >= 70 ? 'High review priority' : score >= 40 ? 'Medium review priority' : 'Low review priority';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${color} inline-flex items-center gap-1`}>
      <AlertTriangle className="h-3 w-3" />
      {label} ({score})
    </span>
  );
}

function DataSourceStrip({
  usingOfficialTrades,
  officialSource,
  demoTradeCount,
}: {
  usingOfficialTrades?: boolean;
  officialSource?: Source;
  demoTradeCount?: number;
}) {
  return (
    <div className="bg-[#0a1628] rounded-xl border border-[#1e3a5f] p-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Data Sources</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {(usingOfficialTrades && officialSource ? [officialSource] : DATA_SOURCES).map((src) => (
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
        {usingOfficialTrades ? (
          <>
            <span className="text-green-400/90 font-medium">Tier 1 official STOCK Act filings.</span>{' '}
            Transactions are parsed from Senate eFD or House Clerk PTR disclosures. Amounts are reported ranges from the filing, not exact trade sizes.
          </>
        ) : (
          <>
            <span className="text-yellow-400/90 font-medium">Demo dataset for UI review — not a live STOCK Act feed.</span>{' '}
            Run <code className="text-gray-400">npm run sync:stock-trades</code> to refresh official PTR data. Demo trades are modeled on real disclosure formats.
          </>
        )}
        {!usingOfficialTrades && (demoTradeCount ?? 0) > 0 && (
          <span className="block mt-1 text-yellow-400/80">Showing {demoTradeCount} demo-labeled disclosure(s) — no official PTR rows synced for this profile yet.</span>
        )}
      </p>
    </div>
  );
}

function MethodologyPanel({ context }: { context: 'profile' | 'congress' }) {
  return (
    <div className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-white font-semibold text-sm mb-1">How this is calculated</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Exposure uses the midpoint or maximum of the disclosed dollar range from STOCK Act-style filings; Congress reports ranges,
            not exact trade sizes, and exposure is not an accusation. Estimated gain/loss is a rough demo price-move estimate using
            approximate price fields when available. For sales or partial sales, it shows movement after the reported trade, not a
            verified realized profit. Review priority is a rules-based potential conflict indicator using sector, committee or office
            relevance, nearby votes/actions, and disclosure timing. It is not investment advice and not proof of wrongdoing.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Default sort: {context === 'profile'
              ? 'newest disclosures first for profile review.'
              : 'largest disclosed exposure first as an investigative review order.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TradeTimeline({ events, tradeDate }: { events: TradeTimelineEvent[]; tradeDate: string }) {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const flagged = events.filter((e) => e.isFlagged);

  return (
    <div className="mt-3 border-t border-[#1e3a5f] pt-3">
      {flagged.length > 0 && (
        <div className="flex items-start gap-2 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-3 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-red-400 font-bold">REVIEW: </span>
            <span className="text-gray-300">
              {flagged.length} event{flagged.length > 1 ? 's' : ''} in this trade&apos;s timeline show a potential correlation between the stock position and official actions.
              Correlation is not proof of insider trading or misconduct; it is presented as a review priority.
            </span>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Event Timeline</div>

      <div className="relative pl-4">
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[#1e3a5f]" />
        <div className="space-y-3">
          {sorted.map((event, i) => {
            const Icon = EVENT_ICONS[event.type];
            const color = EVENT_COLORS[event.type];
            const isTrade = event.daysRelativeToTrade === 0;
            const dayLabel = event.daysRelativeToTrade === 0
              ? 'Trade Date'
              : event.daysRelativeToTrade < 0
                ? `${Math.abs(event.daysRelativeToTrade)}d before trade`
                : `${event.daysRelativeToTrade}d after trade`;

            return (
              <div key={i} className="relative">
                <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 ${
                  isTrade ? 'bg-[#c8a951] border-[#c8a951]' :
                  event.isFlagged ? 'bg-red-400/30 border-red-400' :
                  'bg-[#0d1f35] border-[#2d5a8e]'
                }`} />
                <div className={`rounded-lg p-2.5 ${
                  isTrade ? 'bg-[#c8a951]/10 border border-[#c8a951]/30' :
                  event.isFlagged ? 'bg-red-400/5 border border-red-400/20' :
                  'bg-[#0a1628]'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {!isTrade && <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />}
                        <span className={`text-xs font-semibold ${isTrade ? 'text-[#c8a951]' : 'text-white'}`}>
                          {event.title}
                        </span>
                        {event.isFlagged && !isTrade && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0 rounded bg-red-400/15 text-red-400 border border-red-400/30 font-bold">
                            <AlertTriangle className="h-2.5 w-2.5" /> REVIEW
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{event.description}</p>
                      {event.priceAtEvent != null && (
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-gray-600">
                            Price: <span className="text-gray-300">${event.priceAtEvent.toFixed(2)}</span>
                          </span>
                          {event.priceChangePct != null && (
                            <span className={`font-bold ${event.priceChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {event.priceChangePct >= 0 ? '+' : ''}{event.priceChangePct.toFixed(1)}% move
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className={`text-xs mt-0.5 ${
                        isTrade ? 'text-[#c8a951]' :
                        event.daysRelativeToTrade < 0 ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        {dayLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TradeCard({ trade, profileName }: { trade: StockTrade; profileName: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasTimeline = (trade.timelineEvents?.length ?? 0) > 0;
  const flaggedEvents = trade.timelineEvents?.filter((e) => e.isFlagged) ?? [];
  const pct = priceMovePct(trade);

  return (
    <div className={`bg-[#0d1f35] rounded-xl border overflow-hidden ${
      trade.conflictScore >= 70 ? 'border-red-400/30' :
      trade.conflictScore >= 40 ? 'border-yellow-400/30' : 'border-[#1e3a5f]'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-white font-semibold text-base">{profileName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                trade.type === 'Purchase' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
              }`}>
                {trade.type === 'Purchase' ? '↑' : '↓'} {trade.type}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-xl font-bold text-[#c8a951]">
                {formatMoney(trade.amountMin)} – {formatMoney(trade.amountMax)}
              </span>
              {pct !== null && <GainLossBadge trade={trade} />}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-sm text-gray-400">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#0a1628] text-gray-300">{trade.ticker}</span>
              <span className="text-gray-500">{trade.companyName}</span>
              <span className="text-xs px-2 py-0.5 bg-[#1e3a5f] rounded-full">{trade.sector}</span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Traded: {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span>Disclosed: {new Date(trade.disclosureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className={`px-2 py-0.5 rounded-full ${trade.daysToDisclose > 30 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#1e3a5f] text-gray-400'}`}>
                {trade.daysToDisclose}d disclosure
              </span>
            </div>

            {trade.purchasePriceApprox != null && (
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                <span>At trade: <span className="text-gray-300">${trade.purchasePriceApprox.toFixed(2)}</span></span>
                {trade.currentPrice != null && (
                  <span>Current: <span className="text-gray-300">${trade.currentPrice.toFixed(2)}</span></span>
                )}
              </div>
            )}

            {(trade.relatedVotes?.length || trade.relatedCommittees?.length) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {trade.relatedVotes?.map((v) => (
                  <span key={v} className="text-xs px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded">
                    Related Vote: {v}
                  </span>
                ))}
                {trade.relatedCommittees?.map((c) => (
                  <span key={c} className="text-xs px-2 py-0.5 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded">
                    Committee: {c}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <ConflictBadge score={trade.conflictScore} />
              {flaggedEvents.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 border border-red-400/30 font-bold">
                  <AlertTriangle className="h-3 w-3" />
                  {flaggedEvents.length} review event{flaggedEvents.length > 1 ? 's' : ''}
                </span>
              )}
              {trade.source?.url && (
                <a href={trade.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#c8a951] inline-flex items-center gap-0.5">
                  {trade.source.name} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-white font-bold text-lg">{formatMoney(tradeSortValue(trade))}</div>
            <div className="text-gray-500 text-xs">est. max value</div>
            {pct !== null && (
              <div className={`text-sm font-bold mt-1 ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {hasTimeline && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#c8a951] hover:text-white transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {expanded ? 'Hide' : 'Show'} full event timeline
            {flaggedEvents.length > 0 && (
              <span className="text-red-400 ml-1">({flaggedEvents.length} to review)</span>
            )}
          </button>
        )}

        {expanded && trade.timelineEvents && (
          <TradeTimeline events={trade.timelineEvents} tradeDate={trade.date} />
        )}
      </div>
    </div>
  );
}

export default function StockTrades({
  trades,
  name,
  usingOfficialTrades,
  officialSource,
  demoTradeCount,
}: {
  trades: StockTrade[];
  name: string;
  usingOfficialTrades?: boolean;
  officialSource?: Source;
  demoTradeCount?: number;
}) {
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterSector, setFilterSector] = useState('All');
  const [filterConflict, setFilterConflict] = useState<ConflictFilter>('All');

  const sectors = useMemo(
    () => ['All', ...Array.from(new Set(trades.map((t) => t.sector)))],
    [trades],
  );

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(k); setSortDir('desc'); }
  }

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterSector !== 'All' && t.sector !== filterSector) return false;
      if (filterConflict === 'High' && t.conflictScore < 70) return false;
      if (filterConflict === 'Medium' && (t.conflictScore < 40 || t.conflictScore >= 70)) return false;
      if (filterConflict === 'Low' && t.conflictScore >= 40) return false;
      return true;
    });
  }, [trades, filterSector, filterConflict]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: number, vb: number;
      if (sortBy === 'date') {
        va = new Date(a.date).getTime(); vb = new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        va = tradeSortValue(a); vb = tradeSortValue(b);
      } else if (sortBy === 'gain_pct') {
        va = priceMovePct(a) ?? -Infinity;
        vb = priceMovePct(b) ?? -Infinity;
      } else {
        va = a.conflictScore; vb = b.conflictScore;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [filtered, sortBy, sortDir]);

  if (trades.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No stock trades reported for {name}</p>
        <p className="text-gray-500 text-xs mt-1">Stock disclosures are required under the STOCK Act (2012)</p>
        <div className="mt-6 max-w-xl mx-auto">
          <DataSourceStrip usingOfficialTrades={usingOfficialTrades} officialSource={officialSource} demoTradeCount={demoTradeCount} />
        </div>
      </div>
    );
  }

  const highConflict = trades.filter((t) => t.conflictScore >= 70);
  const totalValue = trades.reduce((s, t) => s + tradeSortValue(t), 0);
  const totalFlagged = trades.reduce((s, t) => s + (t.timelineEvents?.filter((e) => e.isFlagged).length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-white">
          {trades.length} STOCK Act disclosure{trades.length !== 1 ? 's' : ''}
        </h3>
        <span className="text-xs text-gray-500">for {name}</span>
      </div>

      <DataSourceStrip
        usingOfficialTrades={usingOfficialTrades}
        officialSource={officialSource}
        demoTradeCount={demoTradeCount}
      />
      <MethodologyPanel context="profile" />

      {totalFlagged > 0 && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-yellow-400 font-semibold text-sm">Potential Trade-Event Correlations</div>
              <p className="text-gray-300 text-xs mt-1">
                {totalFlagged} event{totalFlagged > 1 ? 's' : ''} in trade timelines show potential correlation between stock positions and official votes, statements, or committee actions.
                Click &quot;Show full event timeline&quot; on each trade to review. Correlation is not legal proof or an allegation; it is presented for transparency.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
          <div className="text-2xl font-bold text-white">{trades.length}</div>
          <div className="text-xs text-gray-400">Disclosures</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
          <div className="text-2xl font-bold text-[#c8a951]">{formatMoney(totalValue)}</div>
          <div className="text-xs text-gray-400">Est. Disclosed Exposure</div>
        </div>
        <div className={`rounded-xl p-3 border text-center ${highConflict.length > 0 ? 'border-red-400/30 bg-red-400/5' : 'border-[#1e3a5f]'}`}>
          <div className={`text-2xl font-bold ${highConflict.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{highConflict.length}</div>
          <div className="text-xs text-gray-400">High Review Priority</div>
        </div>
      </div>

      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center"><ArrowUpDown className="inline h-3 w-3 mr-1" />Sort:</span>
          {([['date', 'Newest First'], ['amount', 'Exposure'], ['gain_pct', 'Est. Gain/Loss'], ['conflict', 'Review Priority']] as [SortKey, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortBy === k ? 'bg-[#c8a951] text-[#0a1628]' : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
              }`}
            >
              {label}{sortBy === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
            </button>
          ))}
        </div>

        <div className="border-t border-[#1e3a5f] pt-3">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <div className="flex flex-wrap gap-2">
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
            <span className="text-gray-600 mx-1">|</span>
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

      <div className="text-xs text-gray-500">Showing {sorted.length} of {trades.length} disclosures</div>

      <div className="space-y-3">
        {sorted.map((trade) => <TradeCard key={trade.id} trade={trade} profileName={name} />)}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 bg-[#0d1f35] rounded-lg p-3 border border-[#1e3a5f]">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Stock trade disclosures are required under the STOCK Act (Stop Trading on Congressional Knowledge Act, 2012).
          Review priority scores are computed by cross-referencing trade dates with related committee memberships and floor votes.
          Event timelines are sourced from official congressional records and verified news sources.
          Ranges are shown because Congress reports value ranges rather than exact amounts. Gain/loss estimates use historical price approximations.
        </p>
      </div>
    </div>
  );
}
