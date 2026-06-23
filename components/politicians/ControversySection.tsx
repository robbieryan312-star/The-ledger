'use client';

import { useState } from 'react';
import { Controversy } from '@/lib/types';
import SourceBadge from '@/components/ui/SourceBadge';
import { AlertTriangle, Shield, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Gavel } from 'lucide-react';

const STATUS_CONFIG: Record<Controversy['status'], { color: string; bg: string; border: string; icon: typeof Clock }> = {
  'Alleged':             { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', icon: AlertTriangle },
  'Under Investigation': { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', icon: Clock },
  'Ongoing':             { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', icon: Clock },
  'Resolved':            { color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/20',  icon: CheckCircle },
  'Dismissed':           { color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/20',  icon: XCircle },
  'Acquitted':           { color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/20',  icon: CheckCircle },
  'Convicted':           { color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30',   icon: Gavel },
};

const CATEGORY_COLOR: Record<Controversy['category'], string> = {
  'Ethics':               'bg-purple-400/10 text-purple-400',
  'Legal':                'bg-red-400/10 text-red-400',
  'Financial':            'bg-yellow-400/10 text-yellow-400',
  'Campaign':             'bg-blue-400/10 text-blue-400',
  'Conduct':              'bg-orange-400/10 text-orange-400',
  'Policy':               'bg-gray-400/10 text-gray-300',
  'Conflict of Interest': 'bg-red-400/10 text-red-400',
};

function ControversyCard({ item }: { item: Controversy }) {
  const [open, setOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[item.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className={`rounded-xl border overflow-hidden ${
      !item.isVerified ? 'border-orange-400/20' :
      item.status === 'Convicted' ? 'border-red-400/30' :
      'border-[#1e3a5f]'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left hover:bg-[#1e3a5f]/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {!item.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-400/15 text-orange-400 border border-orange-400/30">
                  <AlertTriangle className="h-3 w-3" />
                  ALLEGED
                </span>
              )}
              {item.isVerified && item.status === 'Convicted' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 border border-red-400/30">
                  <Gavel className="h-3 w-3" />
                  CONVICTED
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLOR[item.category]}`}>
                {item.category}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                <StatusIcon className="h-3 w-3" />
                {item.status}
              </span>
            </div>

            <div className="text-white font-medium text-sm">{item.title}</div>
            <div className="text-gray-500 text-xs mt-0.5">{item.date}</div>
          </div>

          <div className="flex-shrink-0 mt-1">
            {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#1e3a5f] bg-[#06101e]/40">
          <p className="text-gray-300 text-sm leading-relaxed mt-3 mb-3">{item.summary}</p>

          {!item.isVerified && (
            <div className="bg-orange-400/10 border border-orange-400/20 rounded-lg p-3 mb-3 text-xs text-orange-300">
              <strong>Disclosure:</strong> This claim has not been officially confirmed, adjudicated, or documented by a
              government or established nonpartisan source. It is included for informational purposes only with its alleged
              status clearly labeled. Treat as unconfirmed until further corroboration.
            </div>
          )}

          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Sources:</div>
            {item.sources.map((src, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <SourceBadge source={src} />
                <div className="text-gray-400 flex-1">
                  <span className="text-gray-300">{src.name}</span>
                  {src.date && <span className="text-gray-600 ml-1">({src.date})</span>}
                  {src.description && <span className="text-gray-500 ml-1">— {src.description}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ControversySection({ controversies, name }: { controversies: Controversy[]; name: string }) {
  const [filter, setFilter] = useState<'all' | 'verified' | 'alleged'>('all');

  const verified = controversies.filter((c) => c.isVerified);
  const alleged = controversies.filter((c) => !c.isVerified);
  const shown = filter === 'verified' ? verified : filter === 'alleged' ? alleged : controversies;

  if (controversies.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-10 w-10 text-green-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No controversies or allegations on record for {name}</p>
        <p className="text-gray-600 text-xs mt-1">Based on available official, nonpartisan, and media sources</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
          <div className="text-2xl font-bold text-white">{controversies.length}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-red-400/20 text-center">
          <div className="text-2xl font-bold text-red-400">{verified.length}</div>
          <div className="text-xs text-gray-400">Documented</div>
        </div>
        <div className="bg-[#0d1f35] rounded-xl p-3 border border-orange-400/20 text-center">
          <div className="text-2xl font-bold text-orange-400">{alleged.length}</div>
          <div className="text-xs text-gray-400">Alleged</div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
        <span className="text-[#c8a951] font-medium">Editorial Standard: </span>
        All descriptions use factual, non-editorial language. Items marked <span className="text-orange-400 font-medium">ALLEGED</span> are
        credible claims that have not been officially confirmed or adjudicated. Documented items are sourced to official
        government records or established nonpartisan organizations.
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'verified', 'alleged'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-[#c8a951] text-[#0a1628]' : 'bg-[#0d1f35] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'verified' ? 'Documented' : 'Alleged Only'}
            {' '}({f === 'all' ? controversies.length : f === 'verified' ? verified.length : alleged.length})
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {shown.map((c) => <ControversyCard key={c.id} item={c} />)}
      </div>
    </div>
  );
}
