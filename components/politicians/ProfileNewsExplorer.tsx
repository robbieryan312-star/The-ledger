'use client';

import { useMemo, useState } from 'react';
import type { NewsItem } from '@/lib/types';
import { SOURCE_TIER_RANK } from '@/lib/types';
import { TierLegend } from '@/components/ui/SourceBadge';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { TIER_NUMBER } from '@/lib/data/sourceTiers';
import {
  Newspaper,
  Search,
  X,
  SlidersHorizontal,
  ArrowDownUp,
  Tag,
} from 'lucide-react';

type SortMode = 'newest' | 'oldest' | 'tier';

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'tier', label: 'Most authoritative' },
];

// Tier numbers shown in the filter row (1 = most credible). 4 covers both
// alleged and unverified sources, which map to Tier 4 in the data policy.
const TIER_FILTERS: { num: number; label: string }[] = [
  { num: 1, label: 'T1 · Official' },
  { num: 2, label: 'T2 · Research' },
  { num: 3, label: 'T3 · Journalism' },
  { num: 4, label: 'T4 · Unverified' },
];

function toTime(date: string): number {
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function ProfileNewsExplorer({ news, name }: { news: NewsItem[]; name: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [activeTiers, setActiveTiers] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showOpinion, setShowOpinion] = useState(false);
  const [journalismOnly, setJournalismOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('newest');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(news.map((n) => n.category))).sort()],
    [news],
  );

  const opinionCount = useMemo(() => news.filter((n) => n.isOpinion).length, [news]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTime = dateFrom ? toTime(dateFrom) : null;
    const toTimeBound = dateTo ? toTime(dateTo) : null;

    const matches = news.filter((n) => {
      if (!showOpinion && n.isOpinion) return false;
      if (category !== 'All' && n.category !== category) return false;
      if (journalismOnly && n.source.tier !== 'media') return false;
      if (activeTiers.length > 0 && !activeTiers.includes(TIER_NUMBER[n.source.tier])) return false;

      if (fromTime !== null || toTimeBound !== null) {
        const itemTime = toTime(n.date);
        if (fromTime !== null && itemTime < fromTime) return false;
        if (toTimeBound !== null && itemTime > toTimeBound) return false;
      }

      if (q) {
        const haystack = `${n.headline} ${n.summary} ${n.source.name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...matches];
    sorted.sort((a, b) => {
      if (sort === 'newest') return toTime(b.date) - toTime(a.date);
      if (sort === 'oldest') return toTime(a.date) - toTime(b.date);
      // 'tier' — most authoritative first, newest as tiebreaker
      const rankDiff = SOURCE_TIER_RANK[b.source.tier] - SOURCE_TIER_RANK[a.source.tier];
      return rankDiff !== 0 ? rankDiff : toTime(b.date) - toTime(a.date);
    });
    return sorted;
  }, [news, query, category, activeTiers, dateFrom, dateTo, showOpinion, journalismOnly, sort]);

  const hasActiveFilters =
    query.trim() !== '' ||
    category !== 'All' ||
    activeTiers.length > 0 ||
    dateFrom !== '' ||
    dateTo !== '' ||
    journalismOnly;

  function resetFilters() {
    setQuery('');
    setCategory('All');
    setActiveTiers([]);
    setDateFrom('');
    setDateTo('');
    setJournalismOnly(false);
  }

  function toggleTier(num: number) {
    setActiveTiers((prev) =>
      prev.includes(num) ? prev.filter((t) => t !== num) : [...prev, num],
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-12">
        <Newspaper className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No verified news record available for {name}</p>
        <p className="text-white/25 text-xs mt-1">News coverage is added as items are sourced, dated, and tier-rated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Why this isn't just a feed — mission-aligned, not a disclaimer */}
      <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-3.5 text-xs text-gray-400 leading-relaxed">
        <span className="text-[#c8a951] font-semibold">Why this isn&apos;t just a news feed. </span>
        Anyone can stack up headlines and let the loudest source win. The Ledger shows you the receipts: every item is
        dated, linked to its primary source, and rated by the kind of outlet behind it — official record, nonpartisan
        research, or journalism — so you weigh the evidence instead of our framing. Opinion is hidden by default and
        labeled when shown; items marked <span className="text-red-400 font-medium">UNVERIFIED</span> are flagged, never
        blended in. Sort and filter freely, follow any link back to the original, and draw your own conclusion.
      </div>

      <TierLegend />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search headlines, summaries, and sources…"
          className="w-full bg-[#0d1f35] border border-[#1e3a5f] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#c8a951] transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters + sort */}
      <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-3 space-y-3">
        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-[#c8a951] text-[#0a1628]'
                  : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
              }`}
            >
              <Tag className="h-3 w-3" />
              {cat}
            </button>
          ))}
        </div>

        {/* Tier + sort row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-500">
              <SlidersHorizontal className="h-3 w-3" /> Tier
            </span>
            {TIER_FILTERS.map((t) => (
              <button
                key={t.num}
                type="button"
                onClick={() => toggleTier(t.num)}
                aria-pressed={activeTiers.includes(t.num)}
                className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  activeTiers.includes(t.num)
                    ? 'bg-[#c8a951] text-[#0a1628] border-[#c8a951]'
                    : 'bg-[#0a1628] text-gray-400 border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-500">
              <ArrowDownUp className="h-3 w-3" /> Sort
            </span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSort(opt.id)}
                aria-pressed={sort === opt.id}
                className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  sort === opt.id
                    ? 'bg-[#c8a951] text-[#0a1628] border-[#c8a951]'
                    : 'bg-[#0a1628] text-gray-400 border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#c8a951] transition-colors [color-scheme:dark]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#c8a951] transition-colors [color-scheme:dark]"
            />
          </label>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
            <input
              type="checkbox"
              checked={showOpinion}
              onChange={(e) => setShowOpinion(e.target.checked)}
              className="accent-[#c8a951]"
            />
            Show opinion &amp; editorial (labeled)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
            <input
              type="checkbox"
              checked={journalismOnly}
              onChange={(e) => setJournalismOnly(e.target.checked)}
              className="accent-[#c8a951]"
            />
            Tier 3 journalism only
          </label>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="text-xs text-gray-500">
        Showing {filtered.length} of {news.length} item{news.length !== 1 ? 's' : ''}
        {!showOpinion && opinionCount > 0 && (
          <span className="ml-1">({opinionCount} opinion piece{opinionCount !== 1 ? 's' : ''} hidden)</span>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-8 text-center">
            <Newspaper className="h-9 w-9 text-gray-600 mx-auto mb-3" />
            <p className="text-white/60 text-sm font-medium">No verified record available for these filters</p>
            <p className="text-white/30 text-xs mt-1">
              Try clearing the search or widening the tier, category, or date filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#c8a951] hover:text-white transition-colors"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className={`bg-[#0d1f35] rounded-xl border p-4 ${
                !item.isVerified ? 'border-red-400/20' : item.isOpinion ? 'border-gray-400/20' : 'border-[#1e3a5f]'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-xs px-2 py-0 rounded-full bg-[#1e3a5f] text-gray-400">{item.category}</span>
                {item.isOpinion && (
                  <span className="text-xs px-2 py-0 rounded-full bg-gray-400/10 text-gray-400 border border-gray-400/20 font-medium">
                    OPINION
                  </span>
                )}
                {!item.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0 rounded-full bg-red-400/10 text-red-400 border border-red-400/30 font-bold">
                    UNVERIFIED
                  </span>
                )}
              </div>

              <h3 className={`font-medium text-sm leading-snug mb-1 ${item.isOpinion ? 'text-gray-300' : 'text-white'}`}>
                {item.headline}
              </h3>

              <p className="text-gray-400 text-xs leading-relaxed mb-2.5">{item.summary}</p>

              {/* Date, tier badge, link, and checked date — sourced provenance */}
              <SourceProvenance source={item.source} recordDate={item.date} asOf={item.asOf} />
            </article>
          ))
        )}
      </div>
    </div>
  );
}
