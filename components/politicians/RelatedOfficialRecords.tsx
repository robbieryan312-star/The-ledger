'use client';

import type { RecordJuxtaposition } from '@/lib/types';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { ArrowRight, Calendar, TrendingUp, Vote } from 'lucide-react';

interface Props {
  juxtapositions: RecordJuxtaposition[];
  name: string;
}

export default function RelatedOfficialRecords({ juxtapositions, name }: Props) {
  if (juxtapositions.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-white/[0.08] p-5 mb-6"
      style={{ background: 'rgba(11,25,41,0.7)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-white font-bold">Related Official Records</h2>
        <span className="text-[10px] uppercase tracking-wide text-[#c8a951]/70 border border-[#c8a951]/20 px-2 py-0.5 rounded-full">
          Timeline
        </span>
      </div>
      <p className="text-white/35 text-xs mb-4 leading-relaxed">
        STOCK Act disclosures and roll-call votes for {name.split(' ').pop()} shown by date proximity.
        Sector overlap is noted when bill text and trade ticker align in integrated data — not proof of misconduct.
      </p>

      <div className="space-y-3">
        {juxtapositions.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-[#1e3a5f] p-4"
            style={{ background: 'rgba(5,9,15,0.55)' }}
          >
            <p className="text-white text-sm font-medium leading-snug mb-3">{row.headline}</p>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="rounded-lg border border-white/[0.06] p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#c8a951] mb-1.5">
                  <TrendingUp className="h-3 w-3" />
                  STOCK Act PTR
                </div>
                <div className="text-white text-xs font-semibold">
                  {row.trade.type} · {row.trade.ticker}
                </div>
                <div className="text-gray-400 text-[11px] mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Trade {row.tradeDate} · filed {row.disclosureDate}
                </div>
                <div className="mt-2">
                  <SourceProvenance source={row.trade.source} recordDate={row.disclosureDate} size="xs" />
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-center text-gray-600 px-1">
                <span className="text-[10px] mb-0.5">{row.daysBetween}d</span>
                <ArrowRight className="h-4 w-4 text-[#c8a951]/50" />
              </div>

              <div className="rounded-lg border border-white/[0.06] p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-blue-300 mb-1.5">
                  <Vote className="h-3 w-3" />
                  Roll-call vote
                </div>
                <div className="text-white text-xs font-semibold line-clamp-2">{row.vote.billTitle}</div>
                <div className="text-gray-400 text-[11px] mt-0.5">
                  {row.vote.vote} · {row.voteDate}
                  {row.vote.billId && row.vote.billId !== 'Roll Call Vote' ? ` · ${row.vote.billId}` : ''}
                </div>
                <div className="mt-2">
                  <SourceProvenance source={row.vote.source} recordDate={row.voteDate} size="xs" />
                </div>
              </div>
            </div>

            {row.connection === 'sector' && (
              <div className="mt-2 text-[10px] text-gray-500">
                Bill category and trade sector overlap in integrated records.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
