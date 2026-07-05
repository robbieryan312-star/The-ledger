import type { Politician } from '@/lib/types';
import { EXECUTIVE_CHAMBERS } from '@/lib/chamberConstants';

const EXECUTIVE_ORDER: Record<string, number> = {
  president: 0,
  vice_president: 1,
  cabinet: 2,
};

export function getOfficeSortTier(p: Politician): number {
  if (EXECUTIVE_CHAMBERS.includes(p.chamber)) return 0;
  if (p.chamber === 'scotus') return 1;
  if (p.chamber === 'governor') return 2;
  if (p.level === 'federal' && p.chamber === 'senate') return 3;
  if (p.level === 'federal' && p.chamber === 'house') return 4;
  return 5;
}

function executiveSortKey(p: Politician): number {
  return EXECUTIVE_ORDER[p.chamber] ?? 9;
}

function judicialSortKey(p: Politician): number {
  if (!p.termStart) return 99;
  return new Date(p.termStart).getTime();
}

export function comparePoliticiansByOffice(a: Politician, b: Politician): number {
  const tierDiff = getOfficeSortTier(a) - getOfficeSortTier(b);
  if (tierDiff !== 0) return tierDiff;
  if (EXECUTIVE_CHAMBERS.includes(a.chamber) && EXECUTIVE_CHAMBERS.includes(b.chamber)) {
    const execDiff = executiveSortKey(a) - executiveSortKey(b);
    if (execDiff !== 0) return execDiff;
  }
  if (a.chamber === 'scotus' && b.chamber === 'scotus') {
    if (a.id === 'scotus-roberts') return -1;
    if (b.id === 'scotus-roberts') return 1;
    return judicialSortKey(a) - judicialSortKey(b);
  }
  if (a.chamber === 'house' && b.chamber === 'house' && a.district && b.district) {
    const da = parseInt(a.district, 10);
    const db = parseInt(b.district, 10);
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db;
  }
  return a.lastName.localeCompare(b.lastName) || a.name.localeCompare(b.name);
}
