'use client';

import { useState } from 'react';
import type { ExecutiveAction, ExecutiveActionType } from '@/lib/types';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

const TYPE_LABELS: Record<ExecutiveActionType, string> = {
  executive_order: 'Executive order',
  appointment: 'Appointment',
  nomination: 'Nomination',
  agenda: 'Public agenda',
  international: 'International action',
  memorandum: 'Memorandum',
  directive: 'Directive',
};

const TYPE_STYLE: Record<ExecutiveActionType, string> = {
  executive_order: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  appointment: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  nomination: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  agenda: 'bg-teal-500/20 text-teal-300 border-teal-500/20',
  international: 'bg-red-500/20 text-red-300 border-red-500/20',
  memorandum: 'bg-gray-500/20 text-gray-300 border-gray-500/20',
  directive: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
};

function ActionRow({ action }: { action: ExecutiveAction }) {
  const [open, setOpen] = useState(false);
  const typeStyle = TYPE_STYLE[action.type];

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden" style={{ background: 'rgba(5,9,15,0.5)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5 ${typeStyle}`}>
          {TYPE_LABELS[action.type]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm">{action.title}</div>
          <div className="text-white/35 text-xs mt-0.5">{action.date}</div>
          {!open && (
            <p className="text-white/50 text-xs mt-1 line-clamp-2">{action.description}</p>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-white/25 flex-shrink-0 mt-0.5" />
          : <ChevronRight className="h-4 w-4 text-white/25 flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06]">
          <p className="text-white/60 text-xs leading-relaxed mt-3">{action.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SourceProvenance source={action.source} recordDate={action.date} size="xs" />
            {action.url && (
              <a
                href={action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#c8a951] hover:text-white transition-colors"
              >
                Primary record <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  actions: ExecutiveAction[];
  name: string;
}

export default function ExecutiveActions({ actions, name }: Props) {
  const sorted = [...actions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl p-8 border border-white/[0.07] text-center" style={{ background: 'rgba(11,25,41,0.6)' }}>
        <p className="text-white/60 text-sm font-medium">No executive actions on record</p>
        <p className="text-white/35 text-xs mt-1 max-w-md mx-auto leading-relaxed">
          Executive orders, nominations, and department actions for {name} will appear here when integrated from Federal Register and official .gov sources.
        </p>
      </div>
    );
  }

  const byType = sorted.reduce<Record<string, ExecutiveAction[]>>((acc, a) => {
    (acc[a.type] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <p className="text-white/35 text-xs leading-relaxed">
        Sourced executive orders, nominations, appointments, and international actions — not congressional roll-call votes.
      </p>
      {Object.entries(byType).map(([type, items]) => (
        <div key={type}>
          <div className="text-[10px] uppercase tracking-wide text-white/35 font-medium mb-2">
            {TYPE_LABELS[type as ExecutiveActionType] ?? type}
          </div>
          <div className="space-y-2">
            {items.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
