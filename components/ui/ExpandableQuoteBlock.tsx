'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function ExpandableQuoteBlock({
  summary,
  fullText,
  verbatim = false,
  maxSummary = 120,
}: {
  summary: string;
  fullText: string;
  verbatim?: boolean;
  maxSummary?: number;
}) {
  const [open, setOpen] = useState(false);
  const needsExpand = fullText.length > maxSummary + 20;
  const preview =
    summary.length > maxSummary ? `${summary.slice(0, maxSummary - 1)}…` : summary;

  if (!needsExpand) {
    return (
      <p className="text-gray-200 text-sm leading-relaxed">
        {verbatim ? <>&ldquo;{fullText}&rdquo;</> : fullText}
      </p>
    );
  }

  return (
    <div>
      <p className="text-gray-200 text-sm leading-relaxed">
        {verbatim ? <>&ldquo;{open ? fullText : preview}&rdquo;</> : open ? fullText : preview}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#c8a951] hover:text-white transition-colors"
      >
        {open ? (
          <>
            <ChevronDown className="h-3 w-3" /> Hide full text
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3" /> Show full text
          </>
        )}
      </button>
    </div>
  );
}
