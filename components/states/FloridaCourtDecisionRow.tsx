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
  const panelId = `court-panel-${row.id ?? row.link ?? caseName}`.replace(/\W+/g, '-');

  return (
    <div className="rounded-[13px] border border-[var(--border-subtle)] overflow-hidden bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-start gap-2 p-3 hover:bg-[var(--bg-elevated)]/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0 pr-6 relative">
          <div className="absolute top-0 right-0">
            <TierDot tier={row.source.tier} />
          </div>
          <p className="text-sm text-[var(--foreground)] font-medium leading-snug">{caseName}</p>
          {row.detail && (
            <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{row.detail}</p>
          )}
          {!hasSourceText && (
            <p className="text-[10px] text-[var(--muted)] mt-1 italic">
              No verbatim CourtListener metadata on file for this decision.
            </p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-[var(--muted)] flex-shrink-0 mt-0.5" aria-hidden />
          : <ChevronRight className="h-4 w-4 text-[var(--muted)] flex-shrink-0 mt-0.5" aria-hidden />}
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-3 border-t border-[var(--border-subtle)]">
          {hasSourceText && (
            <div className="mt-2">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                CourtListener {row.summarySource ?? 'metadata'}
              </p>
              <p className="text-xs text-[var(--foreground)]/85 mt-1 whitespace-pre-wrap">{sourceText}</p>
            </div>
          )}
          {row.date && (
            <p className="text-xs text-[var(--muted)] mt-2">
              <span className="text-[var(--muted)]/90">Filed:</span> {row.date}
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
              className="inline-flex items-center gap-1 text-[var(--gold)] hover:text-[var(--foreground)] text-xs mt-2"
            >
              Full opinion <ExternalLink className="h-3 w-3" aria-hidden />
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
  title?: string;
  records: SnapshotRecordRow[];
  metaNote?: string;
  compact?: boolean;
}) {
  if (!records.length) {
    return (
      <p className="text-[13px] text-[var(--muted)] italic">No verified record available</p>
    );
  }
  return (
    <div className="space-y-2">
      {title && !compact && (
        <p className="text-[12px] font-medium text-[var(--foreground)] mb-2">{title}</p>
      )}
      {records.map((row) => (
        <FloridaCourtDecisionRow key={row.id ?? row.link ?? row.title} row={row} />
      ))}
      {metaNote && <p className="text-[10px] text-[var(--muted)] mt-2">{metaNote}</p>}
    </div>
  );
}
