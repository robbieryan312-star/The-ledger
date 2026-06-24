'use client';

import { useState } from 'react';
import type { CampaignFinance, VoteRecord } from '@/lib/types';
import {
  plainVoteSubtitle,
  plainVoteSummary,
  plainVoteTitle,
  formatPartyBreakdown,
  hasPartyBreakdown,
} from '@/lib/data/voteDisplay';
import { inferVoteDonorConnection } from '@/lib/data/voteDonorConnections';
import SourceBadge from '@/components/ui/SourceBadge';
import {
  CheckCircle, XCircle, MinusCircle, AlertTriangle, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react';

interface Props {
  vote: VoteRecord;
  finance?: CampaignFinance;
  isFeatured?: boolean;
  compact?: boolean;
}

export default function VoteRow({ vote, finance, isFeatured = false, compact = false }: Props) {
  const [open, setOpen] = useState(false);

  const voteColor =
    vote.vote === 'Yea' ? 'text-green-400' :
    vote.vote === 'Nay' ? 'text-red-400' : 'text-white/40';

  const VoteIcon =
    vote.vote === 'Yea' ? CheckCircle :
    vote.vote === 'Nay' ? XCircle : MinusCircle;

  const donorNote = inferVoteDonorConnection(vote, finance, isFeatured);
  const title = plainVoteTitle(vote);
  const subtitle = plainVoteSubtitle(vote);

  const hasBadge = vote.alignsWithDonors || vote.alignsWithCampaign === false || donorNote;

  const borderColor = vote.alignsWithDonors || donorNote
    ? 'border-yellow-400/25'
    : vote.alignsWithCampaign === false
    ? 'border-red-400/20'
    : 'border-white/[0.07]';

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${borderColor}`}
         style={{ background: open ? 'rgba(5,9,15,0.7)' : 'rgba(5,9,15,0.4)' }}>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <VoteIcon className={`h-4 w-4 flex-shrink-0 ${voteColor}`} />

        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium leading-snug">{title}</div>
          {!compact && (
            <div className="text-white/35 text-xs mt-0.5">{subtitle}</div>
          )}
          {hasBadge && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {vote.alignsWithDonors && (
                <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0 rounded-full border border-yellow-400/20">
                  <AlertTriangle className="h-3 w-3" /> Donor overlap (demo)
                </span>
              )}
              {vote.alignsWithCampaign === false && (
                <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0 rounded-full border border-red-400/20">
                  Broke campaign stance (demo)
                </span>
              )}
              {donorNote && (
                <span
                  className="text-[10px] text-yellow-300/90 bg-yellow-400/5 px-2 py-0 rounded-full border border-yellow-400/15"
                  title={donorNote.source?.name}
                >
                  {donorNote.isDemo ? 'Demo: ' : ''}{donorNote.text.replace(/^Demo: /, '').replace(/ \(demo finance overlay\)$/, '')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold ${voteColor}`}>{vote.vote}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${vote.result === 'Passed' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
            {vote.result}
          </span>
          {open ? <ChevronDown className="h-3.5 w-3.5 text-white/25" /> : <ChevronRight className="h-3.5 w-3.5 text-white/25" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06] space-y-2.5" style={{ background: 'rgba(5,9,15,0.4)' }}>
          <p className="text-white/60 text-sm leading-relaxed mt-3">{plainVoteSummary(vote)}</p>

          {hasPartyBreakdown(vote) && vote.partyBreakdown ? (
            <div className="text-xs text-white/45 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2">
              <span className="text-white/55 font-medium">Party breakdown: </span>
              {formatPartyBreakdown(vote.partyBreakdown)}
            </div>
          ) : (
            <div className="text-[11px] text-white/30 italic">
              Party breakdown: not in snapshot — open Congress.gov for full roll call.
            </div>
          )}

          {donorNote && (
            <div className="text-xs text-yellow-300/80 bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-3 py-2">
              {donorNote.text}
              {donorNote.source && (
                <span className="block mt-1 text-white/35">{donorNote.source.name}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-white/30 flex-wrap">
            <span>{new Date(vote.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="px-2 py-0.5 rounded-full border border-white/[0.07] text-white/35">{vote.category}</span>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <SourceBadge source={vote.source} size="xs" showTierHelp />
            {vote.source.url ? (
              <a
                href={vote.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs hover:text-white transition-colors font-medium"
                style={{ color: '#d4ac52' }}
              >
                View on Congress.gov <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-white/30">Source: {vote.source.name}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
