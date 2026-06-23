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

export function getFecFinance(politicianId: string): FecFinanceEntry | undefined {
  return snapshot.byPoliticianId[politicianId];
}

export function hasFecFinance(politicianId: string): boolean {
  return !!snapshot.byPoliticianId[politicianId];
}

export function fecFinanceCount(): number {
  return Object.keys(snapshot.byPoliticianId).length;
}

/** Overlay official FEC totals onto a featured profile's mock finance block. */
export function mergeCampaignFinance(
  politicianId: string,
  mock: CampaignFinance,
): { finance: CampaignFinance; fecEntry?: FecFinanceEntry } {
  const fec = getFecFinance(politicianId);
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
