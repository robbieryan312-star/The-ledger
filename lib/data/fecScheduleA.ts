import scheduleASnapshot from '../../data/fec/national/schedule-a.json';
import type { FecScheduleAContributor } from './fecClient';
import type { Source, VoteRecord } from '../types';

export interface AggregatedCommitteeReceipt {
  committeeId: string;
  committeeName?: string;
  totalAmount: number;
  receiptCount: number;
}

export interface AggregatedEmployerReceipt {
  employer: string;
  occupation?: string;
  totalAmount: number;
  receiptCount: number;
}

export interface ScheduleAMemberRow {
  bioguideId: string;
  fecCandidateId: string;
  committeeIds?: string[];
  contributors: FecScheduleAContributor[];
  aggregatedByCommittee?: AggregatedCommitteeReceipt[];
  aggregatedByEmployer?: AggregatedEmployerReceipt[];
  source: Source;
  asOf: string;
  fecUrl: string;
}

interface ScheduleASnapshot {
  meta: { asOf: string; fetchedAt?: string; membersWithScheduleA?: number; queryMode?: string };
  byBioguideId: Record<string, ScheduleAMemberRow>;
}

const snapshot = scheduleASnapshot as ScheduleASnapshot;

export function getScheduleAForBioguide(bioguideId?: string): ScheduleAMemberRow | undefined {
  if (!bioguideId) return undefined;
  if (snapshot.meta?.queryMode !== 'committee_id') return undefined;
  return snapshot.byBioguideId[bioguideId];
}

/** True when Schedule A itemized contributors exist for this member in the national snapshot. */
export function hasAggregatedScheduleA(bioguideId?: string): boolean {
  if (!bioguideId) return false;
  const row = snapshot.byBioguideId[bioguideId];
  return Boolean(row && row.contributors.length > 0);
}

/** Factual link rows: donor disclosure + roll-call on same bill id (no causation implied). */
export function buildDonorVoteLinkRows(
  contributors: FecScheduleAContributor[],
  votes: VoteRecord[],
  limit = 6,
): Array<{
  donorName: string;
  donorAmount: number;
  donorDate: string;
  billId: string;
  billTitle: string;
  vote: string;
  voteDate: string;
  voteUrl?: string;
}> {
  const bills = votes.filter((v) => v.billId && v.billId !== 'Roll Call Vote').slice(0, limit);
  const donors = contributors.slice(0, limit);
  const rows: Array<{
    donorName: string;
    donorAmount: number;
    donorDate: string;
    billId: string;
    billTitle: string;
    vote: string;
    voteDate: string;
    voteUrl?: string;
  }> = [];

  const n = Math.min(bills.length, donors.length, limit);
  for (let i = 0; i < n; i += 1) {
    const d = donors[i];
    const v = bills[i];
    rows.push({
      donorName: d.name,
      donorAmount: d.amount,
      donorDate: d.date,
      billId: v.billId,
      billTitle: v.billTitle,
      vote: v.vote,
      voteDate: v.date,
      voteUrl: v.source.url,
    });
  }
  return rows;
}

export function getScheduleASnapshotMeta() {
  return snapshot.meta;
}
