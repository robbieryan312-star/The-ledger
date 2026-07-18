'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import type { SnapshotRecordRow } from '@/lib/types/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';
import TierDot from '@/components/ui/TierDot';

/** Locked mockup: "HB 11 — Short title" when bill number + title available. */
function displayHeadline(row: SnapshotRecordRow): string {
  const summary = row.summary?.trim();
  const title = row.title?.trim() ?? '';
  const billMatch = title.match(/^(HB|SB|HJR|SJR|HCR|SCR)\s*\d+[A-Z]?/i);
  if (billMatch) {
    const billNo = billMatch[0].replace(/\s+/, ' ').toUpperCase();
    const rest = title.slice(billMatch[0].length).replace(/^[\s:—-]+/, '').trim();
    if (rest) return `${billNo} — ${rest}`;
    return billNo;
  }
  return summary || title;
}

export default function FloridaLegislationBillRow({ row }: { row: SnapshotRecordRow }) {
  const [open, setOpen] = useState(false);
  const headline = displayHeadline(row);
  const hasSummary = Boolean(row.summary?.trim());
  const panelId = `leg-panel-${row.id ?? row.link ?? headline}`.replace(/\W+/g, '-');

  return (
    <div className="rounded-[13px] border border-[var(--border-subtle)] overflow-hidden bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-start gap-2 p-3 hover:bg-[var(--bg-elevated)]/40 transition-colors text-left"
      >
        <FileText className="h-4 w-4 text-[var(--muted)] flex-shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0 pr-6 relative">
          <div className="absolute top-0 right-0">
            <TierDot tier={row.source.tier} />
          </div>
          <p className="text-sm text-[var(--foreground)] font-medium leading-snug line-clamp-3">{headline}</p>
          {hasSummary && (
            <p className="text-[12px] text-[var(--foreground)]/80 mt-1 line-clamp-2">{row.summary}</p>
          )}
          {!hasSummary && (
            <p className="text-[10px] text-[var(--muted)] mt-1 italic">No LegiScan description on file — showing bill number and title.</p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-[var(--muted)] flex-shrink-0 mt-0.5" aria-hidden />
          : <ChevronRight className="h-4 w-4 text-[var(--muted)] flex-shrink-0 mt-0.5" aria-hidden />}
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-3 border-t border-[var(--border-subtle)] ml-6">
          {row.officialTitle && (
            <p className="text-xs text-[var(--foreground)]/85 mt-2">
              <span className="text-[var(--muted)]">Official title:</span> {row.officialTitle}
            </p>
          )}
          {row.detail && (
            <p className="text-xs text-[var(--muted)] mt-1">{row.detail}</p>
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
              LegiScan record <ExternalLink className="h-3 w-3" aria-hidden />
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
  compact = false,
}: {
  records: SnapshotRecordRow[];
  metaNote?: string;
  compact?: boolean;
}) {
  if (!records.length) return null;
  if (compact) {
    return (
      <div className="space-y-2">
        {records.map((row) => (
          <FloridaLegislationBillRow key={row.id ?? row.link ?? row.title} row={row} />
        ))}
        {metaNote && <p className="text-[10px] text-[var(--muted)] mt-2">{metaNote}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {records.map((row) => (
        <FloridaLegislationBillRow key={row.id ?? row.link ?? row.title} row={row} />
      ))}
      {metaNote && <p className="text-[10px] text-[var(--muted)] mt-2">{metaNote}</p>}
    </div>
  );
}
