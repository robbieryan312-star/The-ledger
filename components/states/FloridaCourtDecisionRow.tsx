'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { SnapshotRecordRow } from '@/lib/types/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';
import TierDot from '@/components/ui/TierDot';

/** Headline derived only from official slice fields — no fabricated summaries. */
function courtHeadline(row: SnapshotRecordRow): string {
  return row.title;
}

function courtSubline(row: SnapshotRecordRow): string {
  return row.detail ?? row.date ?? '';
}

export default function FloridaCourtDecisionRow({ row }: { row: SnapshotRecordRow }) {
  const [open, setOpen] = useState(false);
  const headline = courtHeadline(row);
  const subline = courtSubline(row);

  return (
    <div className="rounded-lg border border-[#1e3a5f]/80 overflow-hidden bg-[#0a1628]/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 p-3 hover:bg-[#1e3a5f]/30 transition-colors text-left"
      >
        <div className="absolute pointer-events-none" />
        <div className="flex-1 min-w-0 pr-6 relative">
          <div className="absolute top-0 right-0">
            <TierDot tier={row.source.tier} />
          </div>
          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{headline}</p>
          {subline && (
            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{subline}</p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
          : <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-[#1e3a5f]/60">
          {row.date && (
            <p className="text-xs text-gray-400 mt-2">
              <span className="text-gray-500">Filed:</span> {row.date}
            </p>
          )}
          {row.detail && (
            <p className="text-xs text-gray-400 mt-1">{row.detail}</p>
          )}
          <div className="mt-2">
            <SourceProvenance source={row.source} recordDate={row.date} asOf={row.asOf} />
          </div>
          {row.link && (
            <Link
              href={row.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white text-xs mt-2"
            >
              Full opinion <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function FloridaCourtDecisionsSection({
  title,
  records,
  metaNote,
}: {
  title: string;
  records: SnapshotRecordRow[];
  metaNote?: string;
}) {
  if (!records.length) return null;
  return (
    <section id="courts" className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] overflow-hidden scroll-mt-24">
      <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0a1628]">
        <h2 className="text-white font-bold text-sm">{title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          Official case titles and docket metadata — expand for filing date and opinion link.
        </p>
        {metaNote && <p className="text-[10px] text-gray-500 mt-1">{metaNote}</p>}
      </div>
      <div className="p-4 space-y-2">
        {records.map((row) => (
          <FloridaCourtDecisionRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}
