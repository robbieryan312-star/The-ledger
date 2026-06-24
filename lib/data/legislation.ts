/**
 * legislation.ts — read the generated GovTrack legislation snapshot and expose
 * typed accessors + filters for the "Upcoming Legislation" tracker (feature #7).
 *
 * The snapshot is produced by scripts/sync-legislation.ts. When the live GovTrack
 * fetch is unavailable, the snapshot is a VALID file with an empty `bills` array
 * and `meta.fetchedLive === false` — the UI renders an honest empty state rather
 * than any fabricated rows.
 */
import type { Bill, BillChamber, BillStage, Source } from '../types';
import snapshotJson from './generated/legislation.json';

export interface LegislationSnapshotMeta {
  source: Source;
  asOf: string;
  count: number;
  congress: number;
  /** True when the live GovTrack fetch succeeded; false = honest empty snapshot. */
  fetchedLive: boolean;
  datasetUrl?: string;
  /** Source used for the per-bill Congress.gov (Tier 1) deep links. */
  officialDeepLinkSource?: Source;
  nextSteps: string[];
  note?: string;
}

export interface LegislationSnapshot {
  meta: LegislationSnapshotMeta;
  bills: Bill[];
}

const snapshot = snapshotJson as unknown as LegislationSnapshot;

export function getLegislationSnapshot(): LegislationSnapshot {
  return snapshot;
}

export function getLegislationMeta(): LegislationSnapshotMeta {
  return snapshot.meta;
}

export function getBills(): Bill[] {
  return snapshot.bills;
}

export function hasLegislation(): boolean {
  return snapshot.bills.length > 0;
}

export function getBillById(id: string): Bill | undefined {
  return snapshot.bills.find((b) => b.id === id);
}

// ── Stage metadata for filter UI (neutral process ordering) ──────────────────
export const BILL_STAGE_LABELS: Record<BillStage, string> = {
  introduced: 'Introduced',
  committee: 'In committee',
  passed_one_chamber: 'Passed one chamber',
  passed_both: 'Passed both chambers',
  enacted: 'Enacted',
  failed: 'Failed / vetoed',
  other: 'Other',
};

export const BILL_STAGE_ORDER: BillStage[] = [
  'introduced',
  'committee',
  'passed_one_chamber',
  'passed_both',
  'enacted',
  'failed',
  'other',
];

export function billStageLabel(stage: BillStage): string {
  return BILL_STAGE_LABELS[stage];
}

/** Distinct stages present in the snapshot, returned in process order. */
export function availableStages(): BillStage[] {
  const present = new Set(snapshot.bills.map((b) => b.stage));
  return BILL_STAGE_ORDER.filter((s) => present.has(s));
}

// ── Filtering + sorting ──────────────────────────────────────────────────────
export type BillSortKey = 'recent_action' | 'introduced' | 'number';
export type ChamberFilter = 'all' | BillChamber;
export type StageFilter = 'all' | BillStage;

export interface BillFilterOptions {
  query?: string;
  chamber?: ChamberFilter;
  stage?: StageFilter;
  sort?: BillSortKey;
}

export function filterBills(bills: Bill[], opts: BillFilterOptions): Bill[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  const chamber = opts.chamber ?? 'all';
  const stage = opts.stage ?? 'all';
  const sort = opts.sort ?? 'recent_action';

  const out = bills.filter((b) => {
    if (chamber !== 'all' && b.chamber !== chamber) return false;
    if (stage !== 'all' && b.stage !== stage) return false;
    if (q) {
      const hay =
        `${b.billNumber} ${b.title} ${b.sponsor?.name ?? ''} ${b.sponsor?.state ?? ''} ${b.statusLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  out.sort((a, b) => {
    if (sort === 'introduced') {
      return new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime();
    }
    if (sort === 'number') {
      if (a.congress !== b.congress) return b.congress - a.congress;
      return a.billNumber.localeCompare(b.billNumber, undefined, { numeric: true });
    }
    return new Date(b.latestAction.date).getTime() - new Date(a.latestAction.date).getTime();
  });

  return out;
}
