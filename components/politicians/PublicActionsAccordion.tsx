'use client';

import { useState } from 'react';
import type { CampaignFinance, VoteRecord } from '@/lib/types';
import VoteRow from '@/components/politicians/VoteRow';
import { ChevronDown, ChevronRight, Vote } from 'lucide-react';

interface Props {
  votes: VoteRecord[];
  finance?: CampaignFinance;
  isFeatured?: boolean;
  maxGroups?: number;
}

export default function PublicActionsAccordion({
  votes,
  finance,
  isFeatured = false,
  maxGroups = 4,
}: Props) {
  const [sectionOpen, setSectionOpen] = useState(false);

  if (votes.length === 0) return null;

  const byCategory = votes.reduce<Record<string, VoteRecord[]>>((acc, v) => {
    const cat = v.category || 'Other';
    (acc[cat] ??= []).push(v);
    return acc;
  }, {});

  const groups = Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxGroups);

  return (
    <div className="rounded-xl border border-white/[0.08] mb-6 overflow-hidden" style={{ background: 'rgba(11,25,41,0.7)' }}>
      <button
        type="button"
        onClick={() => setSectionOpen(!sectionOpen)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Vote className="h-4 w-4 text-[#c8a951]/70" />
          <div>
            <h2 className="text-white font-bold text-sm">Votes &amp; public actions</h2>
            <p className="text-white/35 text-xs mt-0.5">
              {votes.length} recent roll-call vote{votes.length !== 1 ? 's' : ''} — expand for summary and party split
            </p>
          </div>
        </div>
        {sectionOpen
          ? <ChevronDown className="h-4 w-4 text-white/30 flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />}
      </button>

      {sectionOpen && (
        <div className="px-5 pb-5 border-t border-white/[0.06] space-y-4">
          {groups.map(([category, categoryVotes]) => (
            <div key={category}>
              <div className="text-[10px] uppercase tracking-wide text-white/35 font-medium mb-2">{category}</div>
              <div className="space-y-2">
                {categoryVotes.slice(0, 3).map((v) => (
                  <VoteRow
                    key={v.id}
                    vote={v}
                    finance={finance}
                    isFeatured={isFeatured}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
          {votes.length > 0 && (
            <p className="text-[11px] text-white/25 pt-1">
              Open the Voting Record tab for filters and the full list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
