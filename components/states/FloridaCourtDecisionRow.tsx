'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { SnapshotRecordRow } from '@/lib/types/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';
import TierDot from '@/components/ui/TierDot';

function displayCaseName(row: SnapshotRecordRow): string {
  return row.officialTitle?.trim() || row.title;
}

export default function FloridaCourtDecisionRow({ row }: { row: SnapshotRecordRow }) {
  const [open, setOpen] = useState(false);
  const caseName = displayCaseName(row);
  const sourceText = row.summary?.trim();
  const hasSourceText = Boolean(sourceText);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-card)]/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 p-3 hover:bg-[var(--bg-elevated)]/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0 pr-6 relative">
          <div className="absolute top-0 right-0">
            <TierDot tier={row.source.tier} />
          </div>
          <p className="text-sm text-white font-medium leading-snug">{caseName}</p>
          {row.detail && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{row.detail}</p>
          )}
          {!hasSourceText && (
            <p className="text-[10px] text-gray-600 mt-1 italic">
              No verbatim CourtListener metadata on file for this decision.
            </p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
          : <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-[var(--border-subtle)]">
          {hasSourceText && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                CourtListener {row.summarySource ?? 'metadata'}
              </p>
              <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{sourceText}</p>
            </div>
          )}
          {row.date && (
            <p className="text-xs text-gray-400 mt-2">
              <span className="text-gray-500">Filed:</span> {row.date}
            </p>
          )}
          <div className="mt-2">
            <SourceProvenance source={row.source} recordDate={row.date} asOf={row.asOf} />
          </div>
          {row.link && (
            <Link
              href={row.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--gold)] hover:text-white text-xs mt-2"
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
  compact = false,
}: {
  title: string;
  records: SnapshotRecordRow[];
  metaNote?: string;
  compact?: boolean;
}) {
  if (!records.length) return null;
  if (compact) {
    return (
      <div className="space-y-0">
        {records.map((row) => (
          <FloridaCourtDecisionRow key={row.id} row={row} />
        ))}
        {metaNote && <p className="text-[10px] text-gray-500 mt-2">{metaNote}</p>}
      </div>
    );
  }
  return (
    <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <h2 className="text-white font-bold text-sm">{title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          Official Florida Supreme Court decisions from CourtListener — case title and status shown as provided; expand for verbatim sourced metadata and opinion link.
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
