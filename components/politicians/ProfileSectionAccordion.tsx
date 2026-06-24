'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

interface SectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  mb?: boolean;
}

/** Section-level accordion — summary header, expand for full content. */
export function ProfileSectionAccordion({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children,
  className = '',
  mb = true,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border border-white/[0.08] overflow-hidden ${mb ? 'mb-6' : ''} ${className}`}
      style={{ background: 'rgba(11,25,41,0.7)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-start gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 text-[#c8a951]/70 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm">{title}</h2>
            {subtitle && (
              <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-white/30 flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.06]">{children}</div>
      )}
    </div>
  );
}

interface RowProps {
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  borderClass?: string;
  highlight?: boolean;
}

/** Row-level accordion — headline visible, expand for sourced detail. */
export function ProfileExpandableRow({
  open,
  onToggle,
  header,
  summary,
  children,
  borderClass = 'border-white/[0.07]',
  highlight = false,
}: RowProps) {
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${borderClass}`}
      style={{ background: open || highlight ? 'rgba(212,172,82,0.04)' : 'rgba(5,9,15,0.4)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {header}
          {!open && summary && <div className="mt-2">{summary}</div>}
        </div>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-white/30 flex-shrink-0 mt-1" />
          : <ChevronRight className="h-3.5 w-3.5 text-white/30 flex-shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06]" style={{ background: 'rgba(5,9,15,0.4)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
