/**
 * National FEC finance — single source of truth keyed by bioguideId.
 * Committed snapshot: data/fec/national/congress-finance.json (533 members with data).
 */
import type { Source } from '../types';
import nationalFecSnapshot from '../../data/fec/national/congress-finance.json';
import type { FecFinanceEntry } from './fecFinance';

interface NationalFecSnapshot {
  meta: { asOf: string; withFinanceData?: number; keyConfigured?: boolean };
  byBioguideId: Record<string, FecFinanceEntry>;
}

const snapshot = nationalFecSnapshot as NationalFecSnapshot;

export function getNationalFecFinanceByBioguide(bioguideId: string): FecFinanceEntry | undefined {
  return snapshot.byBioguideId[bioguideId];
}

export function hasNationalFecFinance(bioguideId: string): boolean {
  return !!snapshot.byBioguideId[bioguideId];
}

export function nationalFecFinanceAsOf(): string {
  return snapshot.meta.asOf;
}

export function getNationalFecFinanceSnapshot(): NationalFecSnapshot {
  return snapshot;
}

export type { FecFinanceEntry };
