'use client';

import { useState } from 'react';
import { NewsItem } from '@/lib/types';
import SourceBadge, { TierLegend } from '@/components/ui/SourceBadge';
import { Newspaper, ExternalLink, AlertTriangle, Tag } from 'lucide-react';

const CATEGORIES = ['All', 'Finance', 'Legislation', 'Ethics', 'Foreign Policy', 'Healthcare', 'Economy', 'Environment'];

export default function NewsSection({ news, name }: { news: NewsItem[]; name: string }) {
  const [category, setCategory] = useState('All');
  const [showOpinion, setShowOpinion] = useState(false);

  const filtered = news.filter((n) => {
    if (!showOpinion && n.isOpinion) return false;
    if (category !== 'All' && n.category !== category) return false;
    return true;
  });

  const activeCategories = ['All', ...Array.from(new Set(news.map((n) => n.category)))];

  if (news.length === 0) {
    return (
      <div className="text-center py-12">
        <Newspaper className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No news items on record for {name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
        <span className="text-[#c8a951] font-medium">Editorial Standard: </span>
        News is sorted by relevance. Opinion and editorial content is excluded by default and shown only on request.
        Items marked <span className="text-red-400 font-medium">UNVERIFIED</span> are circulating claims not confirmed by reliable sources.
        Source tiers are assigned based on the type of outlet, not political lean.
      </div>

      <TierLegend />

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {activeCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-[#c8a951] text-[#0a1628]'
                  : 'bg-[#0d1f35] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
              }`}
            >
              <Tag className="h-3 w-3" />
              {cat}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
          <input
            type="checkbox"
            checked={showOpinion}
            onChange={(e) => setShowOpinion(e.target.checked)}
            className="accent-[#c8a951]"
          />
          Show opinion & editorial content (labeled)
        </label>
      </div>

      {/* Count */}
      <div className="text-xs text-gray-500">
        Showing {filtered.length} of {news.length} items
        {!showOpinion && news.filter((n) => n.isOpinion).length > 0 && (
          <span className="ml-1">({news.filter((n) => n.isOpinion).length} opinion pieces hidden)</span>
        )}
      </div>

      {/* News Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No items match this filter</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-[#0d1f35] rounded-xl border p-4 ${
                !item.isVerified ? 'border-red-400/20' : item.isOpinion ? 'border-gray-400/20' : 'border-[#1e3a5f]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <SourceBadge source={item.source} />
                    {item.isOpinion && (
                      <span className="text-xs px-2 py-0 rounded-full bg-gray-400/10 text-gray-400 border border-gray-400/20 font-medium">
                        OPINION
                      </span>
                    )}
                    {!item.isVerified && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0 rounded-full bg-red-400/10 text-red-400 border border-red-400/30 font-bold">
                        <AlertTriangle className="h-3 w-3" />
                        UNVERIFIED
                      </span>
                    )}
                    <span className="text-xs px-2 py-0 rounded-full bg-[#1e3a5f] text-gray-400">
                      {item.category}
                    </span>
                  </div>

                  <div className={`font-medium text-sm leading-snug mb-1 ${item.isOpinion ? 'text-gray-300' : 'text-white'}`}>
                    {item.headline}
                  </div>

                  <p className="text-gray-400 text-xs leading-relaxed mb-2">{item.summary}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{item.source.name}</span>
                    <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors"
                      >
                        Read source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
