import type { Source, SourceTier } from '../types';

/** Compact record row for in-page Florida snapshot panels. */
export interface SnapshotRecordRow {
  id: string;
  title: string;
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

export interface StateEconomicIndicator {
  label: string;
  value: string;
  period?: string;
  link?: string;
  source: Source;
  asOf: string;
}

export interface StateEconomicSlice {
  meta: SnapshotSliceMeta;
  stateCode: string;
  stateName: string;
  indicators: StateEconomicIndicator[];
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
