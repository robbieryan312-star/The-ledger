'use client';

import { Source, SourceTier } from '@/lib/types';
import { Shield, CheckCircle, FileText, AlertTriangle, HelpCircle, ExternalLink } from 'lucide-react';

const TIER_CONFIG: Record<SourceTier, {
  label: string;
  icon: typeof Shield;
  color: string;
  bg: string;
  border: string;
  tooltip: string;
}> = {
  official: {
    label: 'Official Record',
    icon: Shield,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
    tooltip: 'Government record — .gov, FEC, Congress.gov, court filing, STOCK Act disclosure',
  },
  nonpartisan: {
    label: 'Nonpartisan',
    icon: CheckCircle,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    tooltip: 'Established nonpartisan organization — Ballotpedia, OpenSecrets, GovTrack, AP, Reuters, Pew',
  },
  media: {
    label: 'Tier 3 · Media',
    icon: FileText,
    color: 'text-gray-300',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/20',
    tooltip: 'Tier 3 journalism — named outlet with editorial process; corroborate with official records',
  },
  alleged: {
    label: 'ALLEGED',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
    tooltip: 'Credible but unproven claim — reported but not officially confirmed or adjudicated',
  },
  unverified: {
    label: 'UNVERIFIED',
    icon: HelpCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    tooltip: 'Circulating claim with no verified sourcing — treat with significant skepticism',
  },
};

interface Props {
  source: Source;
  showName?: boolean;
  size?: 'xs' | 'sm';
}

export default function SourceBadge({ source, showName = false, size = 'xs' }: Props) {
  const cfg = TIER_CONFIG[source.tier];
  const Icon = cfg.icon;
  const padding = size === 'xs' ? 'px-1.5 py-0' : 'px-2 py-0.5';
  const text = size === 'xs' ? 'text-xs' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} ${text} font-medium`}
      title={cfg.tooltip}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {showName ? source.name : cfg.label}
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </span>
  );
}

export function TierLegend() {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-gray-500 mr-1">Source tiers:</span>
      {(Object.keys(TIER_CONFIG) as SourceTier[]).map((tier) => {
        const cfg = TIER_CONFIG[tier];
        const Icon = cfg.icon;
        return (
          <span
            key={tier}
            className={`inline-flex items-center gap-1 px-1.5 py-0 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} text-xs`}
            title={cfg.tooltip}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}
