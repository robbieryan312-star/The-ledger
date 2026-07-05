import type { Bill, BillChamber, BillStage } from '@/lib/types';

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

export function availableStagesFromBills(bills: Bill[]): BillStage[] {
  const present = new Set(bills.map((b) => b.stage));
  return BILL_STAGE_ORDER.filter((s) => present.has(s));
}

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
