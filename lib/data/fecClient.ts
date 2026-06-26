/**
 * fecClient.ts — minimal OpenFEC API client.
 *
 * Reads FEC_API_KEY from process.env (set in .env.local for sync scripts;
 * never log or print the key). Used by scripts/sync-fec-finance.ts only —
 * the app reads the generated fecFinance.json snapshot at build time.
 */
import type { Source } from '../types';

const API_BASE = 'https://api.open.fec.gov/v1';

export const FEC_SOURCE: Source = {
  name: 'Federal Election Commission (OpenFEC)',
  url: 'https://www.fec.gov/data/',
  tier: 'official',
  description: 'Official campaign finance disclosures via api.open.fec.gov',
};

export interface FecCandidateTotals {
  candidateId: string;
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
}

export interface FecCandidateSearchHit {
  candidateId: string;
  name: string;
  office: string;
  state: string;
  party: string;
  activeThrough?: number;
  candidateInactive: boolean;
}

interface RawTotalsRow {
  candidate_id: string;
  candidate_election_year?: number;
  cycle?: number | null;
  receipts?: number;
  disbursements?: number;
  last_cash_on_hand_end_period?: number;
  individual_contributions?: number;
  other_political_committee_contributions?: number;
  candidate_contribution?: number;
  coverage_start_date?: string;
  coverage_end_date?: string;
  last_report_type_full?: string;
}

interface RawSearchRow {
  candidate_id: string;
  name: string;
  office: string;
  state: string;
  party: string;
  active_through?: number;
  candidate_inactive?: boolean;
}

function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

/** Returns the API key if configured; undefined when missing (graceful no-op). */
export function getFecApiKey(): string | undefined {
  const key = process.env.FEC_API_KEY?.trim();
  return key || undefined;
}

export function isFecConfigured(): boolean {
  return !!getFecApiKey();
}

async function fecFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getFecApiKey();
  if (!key) {
    throw new Error('FEC_API_KEY is not configured');
  }

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`OpenFEC request failed: HTTP ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function mapTotalsRow(row: RawTotalsRow): FecCandidateTotals | null {
  if (row.receipts == null && row.disbursements == null) return null;
  const electionYear = row.candidate_election_year ?? row.cycle ?? 0;
  if (!electionYear) return null;

  return {
    candidateId: row.candidate_id,
    electionYear,
    receipts: row.receipts ?? 0,
    disbursements: row.disbursements ?? 0,
    cashOnHand: row.last_cash_on_hand_end_period ?? 0,
    individualContributions: row.individual_contributions ?? 0,
    pacContributions: row.other_political_committee_contributions ?? 0,
    selfFunding: row.candidate_contribution ?? 0,
    coverageStart: isoDate(row.coverage_start_date),
    coverageEnd: isoDate(row.coverage_end_date),
    reportType: row.last_report_type_full,
  };
}

/** Latest financial totals for a FEC candidate committee ID. */
export async function fetchCandidateTotals(
  candidateId: string,
): Promise<FecCandidateTotals | null> {
  const data = await fecFetch<{ results: RawTotalsRow[] }>(
    `/candidate/${encodeURIComponent(candidateId)}/totals/`,
    { sort: '-candidate_election_year', per_page: '5' },
  );

  for (const row of data.results ?? []) {
    const mapped = mapTotalsRow(row);
    if (mapped && (mapped.receipts > 0 || mapped.disbursements > 0)) {
      return mapped;
    }
  }
  return null;
}

/** Search candidates by name/state/office when fecIds are unavailable. */
export async function searchCandidates(
  lastName: string,
  stateCode: string,
  office?: 'S' | 'H' | 'P' | 'G',
): Promise<FecCandidateSearchHit[]> {
  const attempts: Array<Record<string, string>> = office
    ? [{ name: lastName, state: stateCode, office, per_page: '5', sort: '-active_through' }]
    : [
        { name: lastName, state: stateCode, per_page: '5', sort: '-active_through' },
      ];

  if (office === 'G') {
    attempts.unshift(
      { name: lastName, office: 'P', per_page: '5', sort: '-active_through' },
      { name: lastName, state: stateCode, office: 'P', per_page: '5', sort: '-active_through' },
      { name: lastName, per_page: '5', sort: '-active_through' },
    );
  }

  for (const params of attempts) {
    try {
      const data = await fecFetch<{ results: RawSearchRow[] }>('/candidates/search/', params);
      const hits = (data.results ?? []).map((r) => ({
        candidateId: r.candidate_id,
        name: r.name,
        office: r.office,
        state: r.state,
        party: r.party,
        activeThrough: r.active_through,
        candidateInactive: r.candidate_inactive ?? false,
      }));
      if (hits.length > 0) return hits;
    } catch {
      // try next param set (e.g. office=G is not accepted by OpenFEC search)
    }
  }
  return [];
}

export function fecProfileUrl(candidateId: string): string {
  return `https://www.fec.gov/data/candidate/${candidateId}/`;
}

export function preferredFecIdOrder(
  fecIds: string[],
  chamber: 'senate' | 'house' | 'governor' | string,
): string[] {
  const prefix = chamber === 'senate' ? 'S' : chamber === 'house' ? 'H' : null;
  if (!prefix) return [...fecIds];
  const preferred = fecIds.filter((id) => id.startsWith(prefix));
  const rest = fecIds.filter((id) => !id.startsWith(prefix));
  return [...preferred, ...rest];
}

export async function resolveBestCandidateTotals(
  fecIds: string[],
  chamber: string,
): Promise<FecCandidateTotals | null> {
  const ordered = preferredFecIdOrder(fecIds, chamber);
  let best: FecCandidateTotals | null = null;

  for (const id of ordered) {
    const totals = await fetchCandidateTotals(id);
    if (!totals) continue;
    if (!best || totals.electionYear > best.electionYear) {
      best = totals;
    }
  }
  return best;
}

export interface FecScheduleAContributor {
  name: string;
  amount: number;
  date: string;
  employer?: string;
  occupation?: string;
  committeeId?: string;
}

export interface FecCandidateCommittee {
  committeeId: string;
  name?: string;
  designation?: string;
  committeeType?: string;
}

interface RawScheduleARow {
  contributor_name?: string;
  contribution_receipt_amount?: number;
  contribution_receipt_date?: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  committee_id?: string;
}

interface RawCandidateCommitteeRow {
  committee_id?: string;
  name?: string;
  designation?: string;
  committee_type?: string;
}

function preferredCandidateCommittees(committees: FecCandidateCommittee[]): FecCandidateCommittee[] {
  const authorized = committees.filter((c) => c.designation === 'P' || c.designation === 'A');
  return authorized.length > 0 ? authorized : [];
}

export async function fetchCandidateCommittees(
  candidateId: string,
  cycle?: string,
): Promise<FecCandidateCommittee[]> {
  const params: Record<string, string> = {
    per_page: '20',
  };
  if (cycle) params.cycle = cycle;

  const data = await fecFetch<{ results: RawCandidateCommitteeRow[] }>(
    `/candidate/${encodeURIComponent(candidateId)}/committees/`,
    params,
  );

  const seen = new Set<string>();
  const committees = (data.results ?? [])
    .filter((r) => r.committee_id)
    .map((r) => ({
      committeeId: r.committee_id!,
      name: r.name,
      designation: r.designation,
      committeeType: r.committee_type,
    }))
    .filter((c) => {
      if (seen.has(c.committeeId)) return false;
      seen.add(c.committeeId);
      return true;
    });

  return preferredCandidateCommittees(committees);
}

async function fetchScheduleAContributorsForCommittee(
  committeeId: string,
  twoYearPeriod: string,
  limit = 20,
): Promise<FecScheduleAContributor[]> {
  const data = await fecFetch<{ results: RawScheduleARow[] }>('/schedules/schedule_a/', {
    committee_id: committeeId,
    two_year_transaction_period: twoYearPeriod,
    sort: '-contribution_receipt_amount',
    per_page: String(Math.min(limit, 100)),
    is_individual: 'true',
  });

  return (data.results ?? [])
    .filter((r) => r.committee_id === committeeId && r.contributor_name && r.contribution_receipt_amount != null)
    .slice(0, limit)
    .map((r) => ({
      name: r.contributor_name!,
      amount: r.contribution_receipt_amount!,
      date: isoDate(r.contribution_receipt_date) ?? new Date().toISOString().slice(0, 10),
      employer: r.contributor_employer,
      occupation: r.contributor_occupation,
      committeeId: r.committee_id,
    }));
}

/** Itemized Schedule A receipts for authorized candidate committees (Tier 1). */
export async function fetchScheduleAContributorsForCommittees(
  committeeIds: string[],
  twoYearPeriod: string,
  limit = 20,
): Promise<FecScheduleAContributor[]> {
  const uniqueCommitteeIds = [...new Set(committeeIds)].slice(0, 5);
  const contributors = (
    await Promise.all(
      uniqueCommitteeIds.map((committeeId) =>
        fetchScheduleAContributorsForCommittee(committeeId, twoYearPeriod, limit),
      ),
    )
  ).flat();

  return contributors
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, limit);
}
