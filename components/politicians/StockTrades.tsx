'use client';

import { useMemo, useState } from 'react';
import { StockTrade, TradeTimelineEvent, Source } from '@/lib/types';
import { TrendingUp, TrendingDown, AlertTriangle, Info, ArrowUpDown, ChevronDown, ChevronRight, Vote, MessageSquare, Landmark, BarChart2, FileText, Calendar, Filter, ExternalLink } from 'lucide-react';
import SourceBadge from '@/components/ui/SourceBadge';
import SourceTierHelp from '@/components/ui/SourceTierHelp';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type SortKey = 'date' | 'amount' | 'gain_pct' | 'conflict';
type ConflictFilter = 'All' | 'High' | 'Medium' | 'Low';
type TimeRange = '6m' | '1y' | '2y' | '5y' | 'all';

const TIME_RANGE_MS: Record<Exclude<TimeRange, 'all'>, number> = {
  '6m': 183 * 86_400_000,
  '1y': 365 * 86_400_000,
  '2y': 730 * 86_400_000,
  '5y': 1825 * 86_400_000,
};

function tradesInRange(trades: StockTrade[], range: TimeRange): StockTrade[] {
  if (range === 'all') return trades;
  const cutoff = Date.now() - TIME_RANGE_MS[range];
  return trades.filter((t) => new Date(t.date).getTime() >= cutoff);
}

function portfolioGainPct(trades: StockTrade[]): number | null {
  const withPct = trades.map(priceMovePct).filter((p): p is number => p !== null);
  if (withPct.length === 0) return null;
  return withPct.reduce((s, p) => s + p, 0) / withPct.length;
}

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

function formatRange(trade: StockTrade): string {
  return `${formatMoney(trade.amountMin)} – ${formatMoney(trade.amountMax)}`;
}

function LeadMetric({ trade }: { trade: StockTrade }) {
  const pct = priceMovePct(trade);
  const dollar = estimatedDollarMove(trade);
  const hasEstimate = pct !== null;

  if (hasEstimate) {
    const positive = pct! >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;
    return (
      <div>
        <div className={`text-2xl font-bold flex items-center gap-1.5 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          <Icon className="h-5 w-5" />
          {positive ? '+' : ''}{pct!.toFixed(1)}%
          {dollar !== null && (
            <span className="text-base font-semibold opacity-80">
              ({positive ? '+' : ''}{formatMoney(Math.abs(dollar))})
            </span>
          )}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">Est. from disclosure range · not exact trade price</div>
        <div className="text-sm text-[#c8a951]/90 mt-1">{formatRange(trade)} disclosed</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-2xl font-bold text-[#c8a951]">{formatRange(trade)}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">Disclosed dollar range (STOCK Act)</div>
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
            <span className="inline-flex items-center gap-1">
              <SourceBadge source={officialSource ?? { name: 'House/Senate Clerk', tier: 'official', url: 'https://disclosures-clerk.house.gov' }} size="xs" showTierHelp />
            </span>{' '}
            Transactions parsed from Senate eFD or House Clerk PTR disclosures. Amounts are reported ranges, not exact trade sizes.
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
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span className="text-white font-semibold text-sm">How gain/loss and exposure are estimated</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#1e3a5f]">
          <p className="text-xs text-gray-400 leading-relaxed mt-3">
            Exposure uses the midpoint or maximum of the disclosed dollar range from STOCK Act-style filings; Congress reports ranges,
            not exact trade sizes. Estimated gain/loss uses approximate price fields when available — labeled as estimated from the disclosure range.
            For sales, it shows price movement after the reported trade, not verified realized profit. Review priority is a rules-based indicator
            using sector, committee relevance, nearby votes, and disclosure timing — not investment advice and not proof of wrongdoing.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Default sort: {context === 'profile'
              ? 'newest disclosures first.'
              : 'largest disclosed exposure first.'}
          </p>
        </div>
      )}
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

  const borderClass =
    trade.conflictScore >= 70 ? 'border-red-400/30' :
    trade.conflictScore >= 40 ? 'border-yellow-400/30' : 'border-[#1e3a5f]';

  return (
    <div className={`bg-[#0d1f35] rounded-xl border overflow-hidden ${borderClass}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#0a1628] text-gray-300">{trade.ticker}</span>
                <span className="text-white font-semibold text-sm truncate">{trade.companyName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  trade.type === 'Purchase' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                }`}>
                  {trade.type === 'Purchase' ? '↑' : '↓'} {trade.type}
                </span>
              </div>
              <div className="text-lg font-bold text-[#c8a951] mt-1">{formatRange(trade)}</div>
              <div className="text-[10px] text-gray-500">Disclosed range · estimate, not exact trade price</div>
            </div>
            <div className="text-right flex-shrink-0">
              {pct !== null && (
                <div className={`text-sm font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
              )}
              <ConflictBadge score={trade.conflictScore} />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>{trade.daysToDisclose}d disclosure lag</span>
            <span className="text-xs px-2 py-0.5 bg-[#1e3a5f] rounded-full">{trade.sector}</span>
            {flaggedEvents.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3" />
                {flaggedEvents.length} review event{flaggedEvents.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!expanded && (trade.relatedVotes?.length || trade.relatedCommittees?.length) ? (
            <div className="mt-2 text-[11px] text-gray-500 line-clamp-1">
              {trade.relatedVotes?.length ? `${trade.relatedVotes.length} related vote${trade.relatedVotes.length > 1 ? 's' : ''}` : ''}
              {trade.relatedVotes?.length && trade.relatedCommittees?.length ? ' · ' : ''}
              {trade.relatedCommittees?.length ? `${trade.relatedCommittees.length} committee overlap${trade.relatedCommittees.length > 1 ? 's' : ''}` : ''}
            </div>
          ) : null}
        </div>

        {expanded
          ? <ChevronDown className="h-4 w-4 text-[#c8a951]/60 flex-shrink-0 mt-1" />
          : <ChevronRight className="h-4 w-4 text-[#c8a951]/60 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1e3a5f] space-y-3">
          <LeadMetric trade={trade} />

          <div className="text-xs text-gray-400">
            <span className="text-white/50">Disclosed by </span>{profileName}
            <span className="text-white/30"> · filed {new Date(trade.disclosureDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          {trade.purchasePriceApprox != null && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>At trade: <span className="text-gray-300">${trade.purchasePriceApprox.toFixed(2)}</span></span>
              {trade.currentPrice != null && (
                <span>Current: <span className="text-gray-300">${trade.currentPrice.toFixed(2)}</span></span>
              )}
            </div>
          )}

          {(trade.relatedVotes?.length || trade.relatedCommittees?.length) && (
            <div className="flex flex-wrap gap-1">
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

          <div className="rounded-lg border border-[#1e3a5f] p-3 text-xs text-gray-400 leading-relaxed" style={{ background: 'rgba(5,9,15,0.5)' }}>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Disclosure methodology</div>
            Exposure uses the disclosed dollar range from STOCK Act filings — Congress reports ranges, not exact trade sizes.
            Estimated gain/loss uses approximate price fields when available. Review priority reflects sector, committee relevance, and timing — not proof of wrongdoing.
          </div>

          {trade.source && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <SourceBadge source={trade.source} size="xs" showTierHelp />
              {trade.source.url && (
                <a href={trade.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#c8a951] inline-flex items-center gap-0.5">
                  View filing <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {hasTimeline && trade.timelineEvents && (
            <TradeTimeline events={trade.timelineEvents} tradeDate={trade.date} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Cumulative net of disclosed STOCK Act transactions using the midpoint of each
 * reported dollar range (purchases add, sales subtract). This estimates transaction
 * flow, NOT market value or total holdings — pre-period holdings and exact prices are
 * not in PTR data — so it is labeled and caveated, never presented as net worth.
 */
function PortfolioValueChart({
  series,
}: {
  series: { date: string; value: number; label: string }[];
}) {
  const data = series.map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    value: Math.round(p.value / 1000),
    label: p.label,
  }));

  return (
    <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
        <h3 className="text-white font-semibold text-sm">Estimated Disclosed Portfolio Value Over Time</h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-[#1e3a5f] px-1.5 py-0.5 rounded whitespace-nowrap">
          STOCK Act range midpoints
        </span>
      </div>
      <p className="text-gray-500 text-[11px] leading-snug mb-3">
        Cumulative net of disclosed transactions, using the midpoint of each reported dollar range
        (purchases add, sales subtract). This estimates transaction flow, not market value, and excludes
        holdings disclosed before the tracked period — it can differ from actual net worth.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="pv-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a951" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#c8a951" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}K`}
            width={52}
          />
          <Tooltip
            formatter={(v) => [`$${Number(v)}K`, 'Cumulative (est.)']}
            labelStyle={{ color: '#c8a951' }}
            contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#fff' }}
          />
          <Area type="monotone" dataKey="value" stroke="#c8a951" strokeWidth={2} fill="url(#pv-gradient)" />
        </AreaChart>
      </ResponsiveContainer>
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
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const rangeTrades = useMemo(() => tradesInRange(trades, timeRange), [trades, timeRange]);

  const sectors = useMemo(
    () => ['All', ...Array.from(new Set(rangeTrades.map((t) => t.sector)))],
    [rangeTrades],
  );

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(k); setSortDir('desc'); }
  }

  const filtered = useMemo(() => {
    return rangeTrades.filter((t) => {
      if (filterSector !== 'All' && t.sector !== filterSector) return false;
      if (filterConflict === 'High' && t.conflictScore < 70) return false;
      if (filterConflict === 'Medium' && (t.conflictScore < 40 || t.conflictScore >= 70)) return false;
      if (filterConflict === 'Low' && t.conflictScore >= 40) return false;
      return true;
    });
  }, [rangeTrades, filterSector, filterConflict]);

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

  const highConflict = rangeTrades.filter((t) => t.conflictScore >= 70);
  const totalValue = rangeTrades.reduce((s, t) => s + tradeSortValue(t), 0);
  const totalFlagged = rangeTrades.reduce((s, t) => s + (t.timelineEvents?.filter((e) => e.isFlagged).length ?? 0), 0);
  const estGainPct = portfolioGainPct(rangeTrades);

  const portfolioSeries = (() => {
    const chrono = [...rangeTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0;
    return chrono.map((t) => {
      const midpoint = (t.amountMin + t.amountMax) / 2;
      cum += t.type === 'Purchase' ? midpoint : -midpoint;
      return { date: t.date, value: Math.round(cum), label: `${t.type} ${t.ticker}` };
    });
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-white">
          {rangeTrades.length} STOCK Act disclosure{rangeTrades.length !== 1 ? 's' : ''}
        </h3>
        <span className="text-xs text-gray-500">for {name}</span>
      </div>

      {/* Portfolio summary — visible immediately */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#c8a951]/30 text-center">
          <div className="text-2xl font-bold text-[#c8a951]">{formatMoney(totalValue)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Est. disclosed exposure (range midpoints)</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] text-center">
          {estGainPct !== null ? (
            <>
              <div className={`text-2xl font-bold ${estGainPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {estGainPct >= 0 ? '+' : ''}{estGainPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Est. avg. price move (disclosed trades)</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-500">—</div>
              <div className="text-[10px] text-gray-500 mt-0.5">No price estimate on file</div>
            </>
          )}
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] text-center col-span-2 md:col-span-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Time range</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {([
              ['6m', '6 mo'],
              ['1y', '1 yr'],
              ['2y', '2 yr'],
              ['5y', '5 yr'],
              ['all', 'All'],
            ] as [TimeRange, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTimeRange(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  timeRange === key
                    ? 'bg-[#c8a951] text-[#0a1628]'
                    : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MethodologyPanel context="profile" />
      <div className="flex justify-end">
        <SourceTierHelp />
      </div>

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

      {portfolioSeries.length >= 2 && <PortfolioValueChart series={portfolioSeries} />}

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

      <div className="text-xs text-gray-500">Showing {sorted.length} of {rangeTrades.length} disclosures in selected range</div>

      <div className="space-y-3">
        {sorted.map((trade) => <TradeCard key={trade.id} trade={trade} profileName={name} />)}
      </div>

      <DataSourceStrip
        usingOfficialTrades={usingOfficialTrades}
        officialSource={officialSource}
        demoTradeCount={demoTradeCount}
      />

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
