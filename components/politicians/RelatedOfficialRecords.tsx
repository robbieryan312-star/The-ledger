'use client';

import type { RecordJuxtaposition } from '@/lib/types';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { ProfileSectionAccordion } from '@/components/politicians/ProfileSectionAccordion';
import { plainVoteSubtitle, plainVoteTitle } from '@/lib/data/voteDisplay';
import { ArrowRight, Calendar, TrendingUp, Vote } from 'lucide-react';

interface Props {
  juxtapositions: RecordJuxtaposition[];
  name: string;
}

export default function RelatedOfficialRecords({ juxtapositions, name }: Props) {
  if (juxtapositions.length === 0) return null;

  const lastName = name.split(' ').pop() ?? name;

  return (
    <ProfileSectionAccordion
      title="Official records timeline (trades & votes)"
      subtitle={`${juxtapositions.length} STOCK Act disclosure${juxtapositions.length !== 1 ? 's' : ''} near roll-call votes for ${lastName} — proximity only, not proof of misconduct`}
      icon={TrendingUp}
      defaultOpen={false}
    >
      <div className="space-y-3 pt-1">
        {juxtapositions.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-[#1e3a5f] p-4"
            style={{ background: 'rgba(5,9,15,0.55)' }}
          >
            <p className="text-white text-sm leading-relaxed mb-3">{row.headline}</p>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="rounded-lg border border-white/[0.06] p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#c8a951] mb-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Stock disclosure
                </div>
                <div className="text-white text-xs font-semibold">
                  {row.trade.type} · {row.trade.ticker}
                </div>
                <div className="text-gray-400 text-[11px] mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Traded {row.tradeDate} · filed {row.disclosureDate}
                </div>
                <div className="mt-2">
                  <SourceProvenance source={row.trade.source} recordDate={row.disclosureDate} size="xs" showTierNumber={false} />
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-center text-gray-600 px-1">
                <span className="text-[10px] mb-0.5">{row.daysBetween}d apart</span>
                <ArrowRight className="h-4 w-4 text-[#c8a951]/50" />
              </div>

              <div className="rounded-lg border border-white/[0.06] p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-blue-300 mb-1.5">
                  <Vote className="h-3 w-3" />
                  Floor vote
                </div>
                <div className="text-white text-xs font-semibold line-clamp-3">{plainVoteTitle(row.vote)}</div>
                <div className="text-gray-400 text-[11px] mt-0.5">
                  {row.vote.vote} · {row.voteDate} · {plainVoteSubtitle(row.vote)}
                </div>
                <div className="mt-2">
                  <SourceProvenance source={row.vote.source} recordDate={row.voteDate} size="xs" showTierNumber={false} />
                </div>
              </div>
            </div>

            {row.connection === 'sector' && (
              <div className="mt-2 text-[10px] text-gray-500">
                Bill topic and trade sector overlap in integrated records — shown for timeline context.
              </div>
            )}
          </div>
        ))}
      </div>
    </ProfileSectionAccordion>
  );
}
