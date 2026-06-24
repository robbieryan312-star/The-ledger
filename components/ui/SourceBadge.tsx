'use client';

import { Source, SourceTier } from '@/lib/types';
import { Shield, CheckCircle, FileText, AlertTriangle, HelpCircle, ExternalLink } from 'lucide-react';
import { TIER_HELP, tierHelpText } from '@/lib/data/sourceTiers';
import SourceTierHelp from '@/components/ui/SourceTierHelp';

const TIER_CONFIG: Record<SourceTier, {
  label: string;
  icon: typeof Shield;
  color: string;
  bg: string;
  border: string;
}> = {
  official: {
    label: 'Official',
    icon: Shield,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
  },
  nonpartisan: {
    label: 'Research',
    icon: CheckCircle,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
  },
  media: {
    label: 'Journalism',
    icon: FileText,
    color: 'text-gray-300',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/20',
  },
  alleged: {
    label: 'Unverified',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  unverified: {
    label: 'Unverified',
    icon: HelpCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
};

interface Props {
  source: Source;
  showName?: boolean;
  showTierHelp?: boolean;
  size?: 'xs' | 'sm';
}

export default function SourceBadge({ source, showName = false, showTierHelp = true, size = 'xs' }: Props) {
  const cfg = TIER_CONFIG[source.tier];
  const Icon = cfg.icon;
  const padding = size === 'xs' ? 'px-1.5 py-0' : 'px-2 py-0.5';
  const text = size === 'xs' ? 'text-[10px]' : 'text-xs';
  const tierNum = TIER_HELP[source.tier].number;

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} ${text} font-medium`}
      title={tierHelpText(source.tier)}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {showName ? source.name : `T${tierNum} · ${cfg.label}`}
      {showTierHelp && <SourceTierHelp tier={source.tier} className="opacity-70" />}
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
            title={tierHelpText(tier)}
          >
            <Icon className="h-3 w-3" />
            T{TIER_HELP[tier].number} · {cfg.label}
          </span>
        );
      })}
    </div>
  );
}
