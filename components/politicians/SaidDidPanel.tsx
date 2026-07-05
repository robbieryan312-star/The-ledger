'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import SourceBadge from '@/components/ui/SourceBadge';
import ExpandableQuoteBlock from '@/components/ui/ExpandableQuoteBlock';
import type { SaidDidDiff } from '@/lib/types';
import { stripCrecFloorOpener } from '@/lib/crecDisplayText';
import { leadSummary } from '@/lib/displaySummary';

function formatGapDays(gapDays: number): string {
  if (gapDays >= 30) {
    const months = Math.round(gapDays / 30);
    return `${months} month${months === 1 ? '' : 's'} between statement and vote`;
  }
  return `${gapDays} day${gapDays === 1 ? '' : 's'} between statement and vote`;
}

export default function SaidDidPanel({ diffs }: { diffs: SaidDidDiff[] }) {
  if (diffs.length === 0) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/40 border border-white/[0.06]">
        <svg className="h-5 w-5 text-[#c8a951] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="text-sm text-gray-300">No verified Said → Did records available.</p>
          <p className="text-xs text-gray-500 mt-1">When a verifiable statement can be paired with an official voting record on the same topic, it will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {diffs.map((diff, idx) => {
        const saidDisplay = stripCrecFloorOpener(diff.said.quote);
        return (
        <div
          key={idx}
          className="rounded-lg border border-white/[0.08] overflow-hidden"
          style={{ background: 'rgba(5,9,15,0.4)' }}
        >
          <div className="flex gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="w-1 flex-shrink-0 rounded-full bg-blue-500 self-stretch min-h-[3rem]" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-blue-400 font-semibold mb-1">
                Said
              </div>
              <ExpandableQuoteBlock
                summary={leadSummary(saidDisplay, 120)}
                fullText={saidDisplay}
                verbatim={diff.said.verbatim}
              />
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{diff.said.speaker}</span>
                <span>·</span>
                <span>{diff.said.date}</span>
                <span>·</span>
                <span>{diff.said.outlet}</span>
                <SourceBadge
                  source={{
                    name: diff.said.outlet,
                    url: diff.said.url,
                    tier: diff.said.tier,
                    date: diff.said.date,
                  }}
                  size="xs"
                />
                <Link
                  href={diff.said.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors"
                >
                  Source <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-4 py-3">
            <div className="w-1 flex-shrink-0 rounded-full bg-green-600 self-stretch min-h-[3rem]" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-green-500 font-semibold mb-1">
                Did
              </div>
              <ExpandableQuoteBlock
                summary={leadSummary(diff.did.action, 120)}
                fullText={diff.did.action}
              />
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{diff.did.date}</span>
                <SourceBadge
                  source={{
                    name: 'Congress.gov',
                    url: diff.did.url,
                    tier: diff.did.tier,
                    date: diff.did.date,
                  }}
                  size="xs"
                />
                <Link
                  href={diff.did.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors"
                >
                  Congress.gov <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {diff.gapDays !== null && (
            <p className="px-4 pb-3 text-[11px] text-gray-600">{formatGapDays(diff.gapDays)}</p>
          )}
        </div>
      );})}
    </div>
  );
}
