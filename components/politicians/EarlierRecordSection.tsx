'use client';

import { useState } from 'react';
import type { EvidenceItem } from '@/lib/types';
import ExpandableEvidenceRow from '@/components/politicians/ExpandableEvidenceRow';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface Props {
  items: EvidenceItem[];
  label?: string;
}

export default function EarlierRecordSection({ items, label = 'Earlier record' }: Props) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[11px] text-white/40 hover:text-white/60 transition-colors w-full text-left"
      >
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span className="font-medium">{label}</span>
        <span className="text-white/25">({items.length} older item{items.length !== 1 ? 's' : ''})</span>
        {open
          ? <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0" />
          : <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-1">
          <p className="text-[10px] text-white/30 leading-relaxed mb-1">
            Older sourced statements or actions — shown for factual comparison when dates conflict with more recent records above.
          </p>
          {items.map((ev, j) => (
            <ExpandableEvidenceRow key={j} item={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
