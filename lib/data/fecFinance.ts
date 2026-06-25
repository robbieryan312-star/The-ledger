/**
 * fecFinance.ts — read the generated FEC finance snapshot and merge real
 * Tier-1 totals into featured profile display models.
 */
import type { CampaignFinance, Source } from '../types';
import fecSnapshot from './generated/fecFinance.json';

export interface FecFinanceEntry {
  politicianId: string;
  bioguideId?: string;
  fecCandidateId: string;
  electionYear: number;
  receipts: number;
  disbursements: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  selfFunding: number;
  coverageStart?: string;
  coverageEnd?: string;
  reportType?: string;
  source: Source;
  asOf: string;
  fecProfileUrl: string;
}

export interface FecFinanceSnapshotMeta {
  source: Source;
  asOf: string;
  featuredQueried: number;
  withFinanceData: number;
  keyConfigured: boolean;
  note?: string;
}

export interface FecFinanceSnapshot {
  meta: FecFinanceSnapshotMeta;
  byPoliticianId: Record<string, FecFinanceEntry>;
}

const snapshot = fecSnapshot as FecFinanceSnapshot;

export function getFecFinanceSnapshot(): FecFinanceSnapshot {
  return snapshot;
}

function lookupFecEntry(politicianId: string, bioguideId?: string): FecFinanceEntry | undefined {
  return (
    snapshot.byPoliticianId[politicianId] ??
    (bioguideId ? snapshot.byPoliticianId[bioguideId] : undefined)
  );
}

export function getFecFinance(politicianId: string, bioguideId?: string): FecFinanceEntry | undefined {
  return lookupFecEntry(politicianId, bioguideId);
}

export function hasFecFinance(politicianId: string, bioguideId?: string): boolean {
  return !!lookupFecEntry(politicianId, bioguideId);
}

export function fecFinanceCount(): number {
  return Object.keys(snapshot.byPoliticianId).length;
}

/** Overlay official FEC totals onto a profile finance block (featured or national). */
export function mergeCampaignFinance(
  politicianId: string,
  mock: CampaignFinance,
  bioguideId?: string,
): { finance: CampaignFinance; fecEntry?: FecFinanceEntry } {
  const fec = lookupFecEntry(politicianId, bioguideId);
  if (!fec) return { finance: mock };

  return {
    fecEntry: fec,
    finance: {
      ...mock,
      totalRaised: fec.receipts,
      totalSpent: fec.disbursements,
      cashOnHand: fec.cashOnHand,
      individualDonations: fec.individualContributions,
      pacDonations: fec.pacContributions,
      selfFunding: fec.selfFunding,
      cycle: String(fec.electionYear),
    },
  };
}
