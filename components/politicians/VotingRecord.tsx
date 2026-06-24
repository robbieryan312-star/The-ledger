'use client';

import { useState } from 'react';
import type { CampaignFinance, VoteRecord } from '@/lib/types';
import VoteRow from '@/components/politicians/VoteRow';
import SourceTierHelp from '@/components/ui/SourceTierHelp';
import { AlertTriangle, Filter } from 'lucide-react';

export default function VotingRecord({
  votes,
  officialSource = false,
  finance,
  isFeatured = false,
}: {
  votes: VoteRecord[];
  officialSource?: boolean;
  finance?: CampaignFinance;
  isFeatured?: boolean;
}) {
  const [filter, setFilter] = useState('All');
  const [showConflicts, setShowConflicts] = useState(false);

  const activeCategories = ['All', ...Array.from(new Set(votes.map(v => v.category)))];

  const filtered = votes.filter((v) => {
    if (filter !== 'All' && v.category !== filter) return false;
    if (showConflicts && !v.alignsWithDonors && v.alignsWithCampaign !== false) return false;
    return true;
  });

  const yeas = votes.filter(v => v.vote === 'Yea').length;
  const nays = votes.filter(v => v.vote === 'Nay').length;
  const conflicts = votes.filter(v => v.alignsWithDonors).length;
  const broken = votes.filter(v => v.alignsWithCampaign === false).length;

  if (votes.length === 0) {
    return (
      <div className="text-center py-12 text-white/35 text-sm">
        <p>No voting record available for this official.</p>
        <p className="text-xs mt-1 text-white/20">Governors and local officials do not hold Congressional voting records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl p-3 border border-green-400/20 text-center" style={{ background: 'rgba(5,9,15,0.5)' }}>
          <div className="text-xl font-bold text-green-400">{yeas}</div>
          <div className="text-xs text-white/35">Yea</div>
        </div>
        <div className="rounded-xl p-3 border border-red-400/20 text-center" style={{ background: 'rgba(5,9,15,0.5)' }}>
          <div className="text-xl font-bold text-red-400">{nays}</div>
          <div className="text-xs text-white/35">Nay</div>
        </div>
        <div className="rounded-xl p-3 border border-yellow-400/20 text-center" style={{ background: 'rgba(5,9,15,0.5)' }}>
          <div className="text-xl font-bold text-yellow-400">{conflicts}</div>
          <div className="text-xs text-white/35">Donor overlap</div>
        </div>
        <div className="rounded-xl p-3 border border-orange-400/20 text-center" style={{ background: 'rgba(5,9,15,0.5)' }}>
          <div className="text-xl font-bold text-orange-400">{broken}</div>
          <div className="text-xs text-white/35">Stance diff</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <Filter className="h-4 w-4 text-white/25" />
          {activeCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className="text-xs px-3 py-1 rounded-full border transition-all"
              style={filter === cat
                ? { background: '#d4ac52', color: '#05090f', borderColor: '#d4ac52', fontWeight: 600 }
                : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowConflicts(!showConflicts)}
          className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            showConflicts
              ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/40'
              : 'border-white/[0.07] text-white/30 hover:border-yellow-400/40 hover:text-yellow-400'
          }`}
        >
          <AlertTriangle className="h-3 w-3" /> Flagged votes only
        </button>
      </div>

      <p className="text-xs text-white/30 flex items-center gap-2 flex-wrap">
        {officialSource
          ? `${votes.length} roll-call positions from Congress.gov — click any vote for bill summary and party split.`
          : 'Click any vote for bill context and source link.'}
        <SourceTierHelp />
      </p>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No votes match this filter</div>
        ) : (
          filtered.map(vote => (
            <VoteRow
              key={vote.id}
              vote={vote}
              finance={finance}
              isFeatured={isFeatured}
            />
          ))
        )}
      </div>
    </div>
  );
}
