'use client';

import { useState } from 'react';
import type { EvidenceItem } from '@/lib/types';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { ChevronDown, ChevronRight } from 'lucide-react';

const EVIDENCE_TYPE_STYLE: Record<string, string> = {
  vote: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  legislation: 'bg-green-500/20 text-green-300 border-green-500/20',
  quote: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  statement: 'bg-gray-500/20 text-gray-300 border-gray-500/20',
  action: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  committee_action: 'bg-teal-500/20 text-teal-300 border-teal-500/20',
};

function previewText(item: EvidenceItem): string {
  const text = item.description;
  if (text.length <= 120) return text;
  return `${text.slice(0, 117)}…`;
}

export default function ExpandableEvidenceRow({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(item.quote) || item.description.length > 120;
  const typeStyle = EVIDENCE_TYPE_STYLE[item.type] || EVIDENCE_TYPE_STYLE.statement;

  if (!hasDetail) {
    return (
      <div className="rounded-lg p-2.5 border border-white/[0.05]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-start gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5 ${typeStyle}`}>
            {item.type.replace('_', ' ')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white/65 text-xs leading-relaxed">{item.description}</p>
            <div className="mt-1.5">
              <SourceProvenance source={item.source} recordDate={item.date} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.05] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 p-2.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5 ${typeStyle}`}>
          {item.type.replace('_', ' ')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white/65 text-xs leading-relaxed">{open ? item.description : previewText(item)}</p>
          {!open && item.quote && (
            <p className="text-[#c8a951]/60 text-[11px] italic mt-0.5 line-clamp-1">&ldquo;{item.quote}&rdquo;</p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-3 w-3 text-white/25 flex-shrink-0 mt-0.5" />
          : <ChevronRight className="h-3 w-3 text-white/25 flex-shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 border-t border-white/[0.05]">
          {item.quote && (
            <blockquote className="mt-2 pl-2.5 border-l-2 border-[#c8a951]/40 text-[#c8a951]/70 text-xs italic leading-relaxed">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
          )}
          <div className="mt-2">
            <SourceProvenance source={item.source} recordDate={item.date} />
          </div>
        </div>
      )}
    </div>
  );
}
