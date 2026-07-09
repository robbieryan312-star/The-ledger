'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import type { SnapshotRecordRow } from '@/lib/types/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';
import TierDot from '@/components/ui/TierDot';

function displayHeadline(row: SnapshotRecordRow): string {
  return row.summary?.trim() || row.title;
}

export default function FloridaLegislationBillRow({ row }: { row: SnapshotRecordRow }) {
  const [open, setOpen] = useState(false);
  const headline = displayHeadline(row);
  const hasSummary = Boolean(row.summary?.trim());

  return (
    <div className="rounded-lg border border-[#1e3a5f]/80 overflow-hidden bg-[#0a1628]/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 p-3 hover:bg-[#1e3a5f]/30 transition-colors text-left"
      >
        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-6 relative">
          <div className="absolute top-0 right-0">
            <TierDot tier={row.source.tier} />
          </div>
          <p className="text-sm text-white font-medium leading-snug line-clamp-3">{headline}</p>
          {!hasSummary && (
            <p className="text-[10px] text-gray-600 mt-1 italic">No LegiScan description on file — showing bill number and title.</p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
          : <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-[#1e3a5f]/60 ml-6">
          {row.officialTitle && (
            <p className="text-xs text-gray-300 mt-2">
              <span className="text-gray-500">Official title:</span> {row.officialTitle}
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
              LegiScan record <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function FloridaLegislationSection({
  records,
  metaNote,
}: {
  records: SnapshotRecordRow[];
  metaNote?: string;
}) {
  if (!records.length) return null;
  return (
    <section id="legislation" className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] overflow-hidden scroll-mt-24">
      <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0a1628]">
        <h2 className="text-white font-bold text-sm">Florida Legislation</h2>
        <p className="text-xs text-gray-400 mt-1">
          Bill summaries from LegiScan official descriptions — expand for full title, status, and source link.
        </p>
        {metaNote && <p className="text-[10px] text-gray-500 mt-1">{metaNote}</p>}
      </div>
      <div className="p-4 space-y-2">
        {records.map((row) => (
          <FloridaLegislationBillRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}
