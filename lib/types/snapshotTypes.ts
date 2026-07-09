import type { Source, SourceTier } from './index';

/** Compact record row for in-page Florida snapshot panels. */
export interface SnapshotRecordRow {
  id: string;
  /** Official case name or bill title (primary headline). */
  title: string;
  /** Official case name or bill title (alias for courts). */
  officialTitle?: string;
  /** Verbatim sourced metadata from upstream (not summarized or invented). */
  summary?: string;
  summarySource?: string;
  detail?: string;
  date?: string;
  link?: string;
  source: Source;
  asOf: string;
  tierFlag?: string;
}

export interface SnapshotSliceMeta {
  source: Source;
  asOf: string;
  fetchedAt?: string;
  totalCount: number;
  datasetUrl?: string;
  note?: string;
  tierFlag?: string;
}

export interface SnapshotSlice {
  meta: SnapshotSliceMeta;
  records: SnapshotRecordRow[];
}

export interface VoteviewMemberSlice {
  bioguideId: string;
  name: string;
  chamber: string;
  party: string;
  district?: string | null;
  nominateEconomic: number;
  nominateSocial: number;
  congress: number;
  source: Source;
  asOf: string;
  voteviewUrl: string;
}

export interface VoteviewSlice {
  meta: SnapshotSliceMeta;
  byBioguideId: Record<string, VoteviewMemberSlice>;
}

export interface StateEconomicHistoryPoint {
  period: string;
  value: number;
}

export interface StateEconomicIndicator {
  label: string;
  /** @deprecated Prefer rawValue + unit; kept for slice migration reads */
  value?: string;
  rawValue: number;
  unit: string;
  period?: string;
  link?: string;
  source: Source;
  asOf: string;
  history?: StateEconomicHistoryPoint[];
  /** National benchmark for vs-US delta chip */
  nationalValue?: number;
  nationalLabel?: string;
  note?: string;
  tenYearGrowthPct?: number | null;
  geography?: string;
}

export interface StateEducationLaborTier {
  educationLevel: string;
  unemploymentRate: number | null;
  unemploymentPeriod: string | null;
  unemploymentGapReason?: string;
  medianWeeklyEarnings: number | null;
  medianAnnualEarnings: number | null;
  earningsPeriod: string | null;
  earningsUnit: string;
  annualEarningsNote?: string;
  note?: string;
  source: Source;
  link?: string;
}

export interface StateEconomicSlice {
  meta: SnapshotSliceMeta & {
    honestGaps?: string[];
    educationNote?: string;
  };
  stateCode: string;
  stateName: string;
  indicators: StateEconomicIndicator[];
  educationTiers?: StateEducationLaborTier[];
}

export interface LegislationSourceSection {
  sourceId: string;
  label: string;
  meta: SnapshotSliceMeta;
  records: SnapshotRecordRow[];
}

export interface LegislationBundleSlice {
  asOf: string;
  fetchedAt?: string;
  sections: LegislationSourceSection[];
}

export interface NewsSourceSection {
  sourceId: string;
  label: string;
  meta: SnapshotSliceMeta;
  records: SnapshotRecordRow[];
}

export interface NewsBundleSlice {
  asOf: string;
  fetchedAt?: string;
  sections: NewsSourceSection[];
}

export function tierFromMeta(tier: string | undefined): SourceTier {
  if (tier === 'official') return 'official';
  if (tier === 'nonpartisan') return 'nonpartisan';
  if (tier === 'media') return 'media';
  if (tier === 'alleged') return 'alleged';
  return 'unverified';
}
