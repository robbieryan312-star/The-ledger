'use client';

import type { SourceTier } from '@/lib/types';
import { TIER_CONFIG } from '@/components/ui/SourceBadge';
import SourceTierHelp from '@/components/ui/SourceTierHelp';

interface TierDotProps {
  tier: SourceTier;
  className?: string;
}

/** Compact corner tier bubble — reuses TIER_CONFIG colors from SourceBadge. */
export default function TierDot({ tier, className = '' }: TierDotProps) {
  const cfg = TIER_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
      title={cfg.label}
    >
      <Icon className="h-2.5 w-2.5 flex-shrink-0" />
      <span className="sr-only">{cfg.label}</span>
      <SourceTierHelp tier={tier} className="sr-only" />
    </span>
  );
}
