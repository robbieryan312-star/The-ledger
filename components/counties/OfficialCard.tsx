'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Star, Quote, Building2, User } from 'lucide-react';
import { CountyOfficial } from '@/lib/types';

export default function OfficialCard({ official, compact = false }: { official: CountyOfficial; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const partyColor =
    official.party === 'Democrat'   ? 'bg-blue-500/20 text-blue-400' :
    official.party === 'Republican' ? 'bg-red-500/20 text-red-400' :
    'bg-gray-500/20 text-gray-300';

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-[#c8a951]/40' : 'border-[#1e3a5f]'}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-[#1e3a5f]/40 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
          <span className="text-[#c8a951] text-xs font-bold">
            {official.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/officials/${official.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-white text-sm font-semibold truncate block hover:text-[#c8a951] transition-colors"
          >
            {official.name}
          </Link>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-1.5 rounded ${partyColor}`}>{official.party[0]}</span>
            <span className="text-gray-400 text-xs">{official.position}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${official.inOffice ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {official.inOffice ? 'In Office' : 'Former'}
          </span>
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && !compact && (
        <div className="px-3 pb-3 border-t border-[#1e3a5f] bg-[#06101e]/60 space-y-3">
          <p className="text-gray-400 text-xs leading-relaxed mt-2.5">{official.bio.slice(0, 200)}{official.bio.length > 200 ? '…' : ''}</p>

          {official.termEnd && (
            <div className="text-xs text-gray-500">
              Term ends: <span className="text-gray-300">{official.termEnd}</span>
              {official.nextElection && (
                <span className="ml-2 text-[#c8a951]">Next election: {official.nextElection}</span>
              )}
            </div>
          )}

          {official.topIssues && official.topIssues.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Star className="h-3 w-3" /> Key Positions
              </div>
              <div className="space-y-1">
                {official.topIssues.slice(0, 2).map((issue) => (
                  <div key={issue.name} className="text-xs bg-[#0d1f35] rounded-lg p-2">
                    <span className="text-[#c8a951] font-medium">{issue.name}:</span>{' '}
                    <span className="text-gray-300">{issue.position}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {official.statements && official.statements.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Quote className="h-3 w-3" /> On Record
              </div>
              <div className="bg-[#0d1f35] rounded-lg p-2 border-l-2 border-[#c8a951]/40">
                <p className="text-gray-300 text-xs italic">&ldquo;{official.statements[0].quote}&rdquo;</p>
              </div>
            </div>
          )}

          <Link
            href={`/officials/${official.id}`}
            className="flex items-center justify-center gap-1.5 w-full bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white text-xs py-2 rounded-lg transition-colors font-medium"
          >
            <User className="h-3.5 w-3.5" /> Full Profile & Elections
          </Link>
        </div>
      )}
    </div>
  );
}
