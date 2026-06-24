'use client';

import { HelpCircle } from 'lucide-react';
import type { SourceTier } from '@/lib/types';
import { TIER_HELP, tierHelpText } from '@/lib/data/sourceTiers';

interface Props {
  tier?: SourceTier;
  /** Compact icon-only trigger with tooltip */
  variant?: 'icon' | 'inline';
  className?: string;
}

export default function SourceTierHelp({ tier, variant = 'icon', className = '' }: Props) {
  if (tier) {
    const help = TIER_HELP[tier];
    if (variant === 'inline') {
      return (
        <span
          className={`inline-flex items-center gap-1 text-[10px] text-gray-500 ${className}`}
          title={tierHelpText(tier)}
        >
          <HelpCircle className="h-3 w-3 flex-shrink-0" />
          {help.short}
        </span>
      );
    }
    return (
      <span title={tierHelpText(tier)} className={`inline-flex ${className}`}>
        <HelpCircle className="h-3 w-3 text-gray-500 hover:text-gray-300 cursor-help" />
      </span>
    );
  }

  const tooltip = (Object.keys(TIER_HELP) as SourceTier[])
    .map((t) => tierHelpText(t))
    .join('\n');

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-help ${className}`}
    >
      <HelpCircle className="h-3 w-3" />
      Source tiers
    </span>
  );
}

export function SourceTierLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 items-center ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {(Object.keys(TIER_HELP) as SourceTier[]).map((tier) => {
        const h = TIER_HELP[tier];
        if (tier === 'alleged' || tier === 'unverified') {
          if (tier === 'unverified') return null;
        }
        return (
          <span
            key={tier}
            className="text-gray-500 border border-white/[0.06] px-1.5 py-0.5 rounded-full"
            title={h.description}
          >
            {h.short}
          </span>
        );
      })}
    </div>
  );
}
