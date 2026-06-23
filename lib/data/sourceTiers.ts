import type { Source, SourceTier } from '../types';

/** Numeric tier label shown in UI (1 = most credible). */
export const TIER_NUMBER: Record<SourceTier, number> = {
  official: 1,
  nonpartisan: 2,
  media: 3,
  alleged: 4,
  unverified: 4,
};

export type EvidenceCompleteness = 'verified' | 'reported' | 'disputed' | 'unverified';

const COMPLETENESS_CONFIG: Record<EvidenceCompleteness, {
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  verified: {
    label: 'Verified',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/25',
    description: 'Primary or nonpartisan record with a checkable source link',
  },
  reported: {
    label: 'Reported',
    color: 'text-gray-300',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/25',
    description: 'Journalism or secondary reporting — verify against primary records',
  },
  disputed: {
    label: 'Disputed',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
    description: 'Credible allegation not yet officially confirmed or adjudicated',
  },
  unverified: {
    label: 'Unverified',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    description: 'Circulating claim without verified sourcing — treat with skepticism',
  },
};

export function tierShortLabel(tier: SourceTier): string {
  switch (tier) {
    case 'official': return 'Tier 1 · Official';
    case 'nonpartisan': return 'Tier 2 · Nonpartisan';
    case 'media': return 'Tier 3 · Journalism';
    case 'alleged': return 'Tier 4 · Alleged';
    case 'unverified': return 'Tier 4 · Unverified';
  }
}

export function isJournalismTier(tier: SourceTier): boolean {
  return tier === 'media';
}

export function evidenceCompleteness(source: Source): EvidenceCompleteness {
  switch (source.tier) {
    case 'official':
    case 'nonpartisan':
      return 'verified';
    case 'media':
      return 'reported';
    case 'alleged':
      return 'disputed';
    case 'unverified':
      return 'unverified';
  }
}

export function completenessConfig(status: EvidenceCompleteness) {
  return COMPLETENESS_CONFIG[status];
}

export function formatSourceDate(source: Source, fallbackDate?: string): string | undefined {
  return source.date ?? fallbackDate;
}
