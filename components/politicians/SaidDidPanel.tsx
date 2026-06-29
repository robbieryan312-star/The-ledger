'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import SourceBadge from '@/components/ui/SourceBadge';
import type { SaidDidDiff } from '@/lib/types';

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
      <p className="text-sm text-gray-500 mb-6">
        No verified Said → Did records available.
      </p>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {diffs.map((diff, idx) => (
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
              <p className="text-gray-200 text-sm leading-relaxed">
                {diff.said.verbatim ? (
                  <>&ldquo;{diff.said.quote}&rdquo;</>
                ) : (
                  diff.said.quote
                )}
              </p>
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
              <p className="text-gray-200 text-sm leading-relaxed">{diff.did.action}</p>
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
      ))}
    </div>
  );
}
