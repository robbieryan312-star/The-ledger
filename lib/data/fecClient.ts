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

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`OpenFEC request failed: HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
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
