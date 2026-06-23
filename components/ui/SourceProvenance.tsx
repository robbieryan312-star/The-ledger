'use client';

import type { Source } from '@/lib/types';
import SourceBadge from '@/components/ui/SourceBadge';
import {
  completenessConfig,
  evidenceCompleteness,
  formatSourceDate,
  isJournalismTier,
  tierShortLabel,
} from '@/lib/data/sourceTiers';
import { ExternalLink } from 'lucide-react';

interface Props {
  source: Source;
  /** Event/record date when source.date is absent */
  recordDate?: string;
  /** Checked / as-of date for integration snapshots */
  asOf?: string;
  size?: 'xs' | 'sm';
  showTierNumber?: boolean;
  showCompleteness?: boolean;
}

export default function SourceProvenance({
  source,
  recordDate,
  asOf,
  size = 'xs',
  showTierNumber = true,
  showCompleteness = true,
}: Props) {
  const completeness = evidenceCompleteness(source);
  const cfg = completenessConfig(completeness);
  const displayDate = formatSourceDate(source, recordDate);
  const text = size === 'xs' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'xs' ? 'px-1.5 py-0' : 'px-2 py-0.5';

  return (
    <div className={`flex items-center gap-2 flex-wrap ${text}`}>
      <SourceBadge source={source} size={size} />
      {showTierNumber && (
        <span
          className={`${padding} rounded border font-medium ${
            source.tier === 'official' ? 'border-green-400/25 text-green-400/90 bg-green-400/5' :
            source.tier === 'nonpartisan' ? 'border-blue-400/25 text-blue-400/90 bg-blue-400/5' :
            source.tier === 'media' ? 'border-gray-400/25 text-gray-300 bg-gray-400/5' :
            source.tier === 'alleged' ? 'border-orange-400/25 text-orange-400 bg-orange-400/5' :
            'border-red-400/25 text-red-400 bg-red-400/5'
          }`}
          title={tierShortLabel(source.tier)}
        >
          {tierShortLabel(source.tier)}
        </span>
      )}
      {isJournalismTier(source.tier) && (
        <span
          className={`${padding} rounded border border-amber-400/30 text-amber-300/90 bg-amber-400/5 font-semibold uppercase tracking-wide`}
          title="Tier 3 journalism — corroborate with official records when possible"
        >
          Journalism
        </span>
      )}
      {showCompleteness && (
        <span
          className={`${padding} rounded border font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.border} ${cfg.color}`}
          title={cfg.description}
        >
          {cfg.label}
        </span>
      )}
      {displayDate && (
        <span className="text-gray-500" title="Date of underlying record">
          {displayDate}
        </span>
      )}
      {asOf && (
        <span className="text-gray-600" title="Date we last checked this source">
          checked {asOf}
        </span>
      )}
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[#c8a951]/80 hover:text-[#c8a951] transition-colors font-medium"
        >
          {source.name}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      ) : (
        <span className="text-gray-500">{source.name}</span>
      )}
    </div>
  );
}
