/**
 * congressClient.ts — minimal Congress.gov API v3 client.
 *
 * Reads CONGRESS_API_KEY from process.env (set in .env.local for sync scripts;
 * never log or print the key). Used by scripts/sync-congress-votes.ts only —
 * the app reads the generated congressVotes.json snapshot at build time.
 */
import type { Source, VoteChoice } from '../types';

const API_BASE = 'https://api.congress.gov/v3';

export const CONGRESS_GOV_SOURCE: Source = {
  name: 'Congress.gov',
  url: 'https://www.congress.gov',
  tier: 'official',
  description: 'Official U.S. legislative records and roll-call votes via api.congress.gov',
};

export interface HouseVoteSummary {
  congress: number;
  sessionNumber: number;
  rollCallNumber: number;
  startDate?: string;
  result?: string;
  legislationType?: string;
  legislationNumber?: string;
  legislationUrl?: string;
  voteQuestion?: string;
  voteType?: string;
  url?: string;
  sourceDataURL?: string;
}

export interface HouseMemberVote {
  bioguideId: string;
  firstName?: string;
  lastName?: string;
  voteCast: string;
  voteState?: string;
}

export interface HouseVoteMembersResponse extends HouseVoteSummary {
  results?: HouseMemberVote[];
  voteQuestion?: string;
}

interface Pagination {
  count?: number;
  next?: string;
}

interface HouseVoteListResponse {
  houseRollCallVotes?: HouseVoteSummary[];
  rollCallVotes?: HouseVoteSummary[];
  votes?: HouseVoteSummary[];
  pagination?: Pagination;
}

function extractVoteList(data: HouseVoteListResponse): HouseVoteSummary[] {
  return data.houseRollCallVotes ?? data.rollCallVotes ?? data.votes ?? [];
}

interface HouseVoteMembersApiResponse {
  houseRollCallVoteMemberVotes?:
    | HouseMemberVote[]
    | (HouseVoteMembersResponse & { results?: HouseMemberVote[] });
  results?: HouseMemberVote[];
  voteQuestion?: string;
  congress?: number;
  sessionNumber?: number;
  rollCallNumber?: number;
  startDate?: string;
  result?: string;
  legislationType?: string;
  legislationNumber?: string;
  legislationUrl?: string;
  voteType?: string;
  url?: string;
  sourceDataURL?: string;
}

function extractMemberVotes(data: HouseVoteMembersApiResponse): HouseMemberVote[] {
  const container = data.houseRollCallVoteMemberVotes;
  if (Array.isArray(container)) return container;
  if (container?.results && Array.isArray(container.results)) return container.results;
  if (Array.isArray(data.results)) return data.results;
  const legacy = (data as { memberVotes?: HouseMemberVote[] }).memberVotes;
  return Array.isArray(legacy) ? legacy : [];
}

function voteMembersPayload(data: HouseVoteMembersApiResponse): HouseVoteMembersResponse {
  const container = data.houseRollCallVoteMemberVotes;
  if (container && !Array.isArray(container) && typeof container === 'object') {
    return container;
  }
  return data as HouseVoteMembersResponse;
}

/** Returns the API key if configured; undefined when missing (graceful no-op). */
export function getCongressApiKey(): string | undefined {
  const key = process.env.CONGRESS_API_KEY?.trim();
  return key || undefined;
}

export function isCongressConfigured(): boolean {
  return !!getCongressApiKey();
}

async function congressFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getCongressApiKey();
  if (!key) {
    throw new Error('CONGRESS_API_KEY is not configured');
  }

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 403 && body.includes('API_KEY_INVALID')) {
      throw new Error('CONGRESS_API_KEY_INVALID');
    }
    throw new Error(`Congress.gov request failed: HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** List House roll-call votes for a congress session (newest pages via offset). */
export async function fetchHouseVoteList(
  congress: number,
  session: number,
  limit = 50,
  offset = 0,
): Promise<{ votes: HouseVoteSummary[]; nextOffset?: number }> {
  const data = await congressFetch<HouseVoteListResponse>(
    `/house-vote/${congress}/${session}`,
    { limit: String(limit), offset: String(offset) },
  );

  const votes = extractVoteList(data);
  const count = data.pagination?.count ?? votes.length;
  const nextOffset = offset + votes.length < count ? offset + votes.length : undefined;
  return { votes, nextOffset };
}

/** Member positions for a single House roll call. */
export async function fetchHouseVoteMembers(
  congress: number,
  session: number,
  rollCallNumber: number,
): Promise<HouseVoteMembersResponse> {
  const data = await congressFetch<HouseVoteMembersApiResponse>(
    `/house-vote/${congress}/${session}/${rollCallNumber}/members`,
    { limit: '250' },
  );

  const payload = voteMembersPayload(data);
  const members = extractMemberVotes(data);
  return {
    congress: payload.congress ?? data.congress ?? congress,
    sessionNumber: payload.sessionNumber ?? data.sessionNumber ?? session,
    rollCallNumber: payload.rollCallNumber ?? data.rollCallNumber ?? rollCallNumber,
    startDate: payload.startDate ?? data.startDate,
    result: payload.result ?? data.result,
    legislationType: payload.legislationType ?? data.legislationType,
    legislationNumber: payload.legislationNumber ?? data.legislationNumber,
    legislationUrl: payload.legislationUrl ?? data.legislationUrl,
    voteQuestion: payload.voteQuestion ?? data.voteQuestion,
    voteType: payload.voteType ?? data.voteType,
    url: payload.url ?? data.url,
    sourceDataURL: payload.sourceDataURL ?? data.sourceDataURL,
    results: members.map((m) => ({
      bioguideId: m.bioguideId ?? (m as { bioguideID?: string }).bioguideID ?? '',
      firstName: m.firstName,
      lastName: m.lastName,
      voteCast: m.voteCast,
      voteState: m.voteState,
    })).filter((m) => !!m.bioguideId),
  };
}

export function normalizeVoteChoice(raw: string): VoteChoice {
  const v = raw.trim().toLowerCase();
  if (v === 'yea' || v === 'aye' || v === 'yes') return 'Yea';
  if (v === 'nay' || v === 'no') return 'Nay';
  if (v.includes('not voting') || v === 'not voting') return 'Not Voting';
  return 'Present';
}

export function formatBillId(type?: string, number?: string): string {
  if (!type || !number) return 'Roll Call Vote';
  const t = type.toUpperCase();
  if (t === 'HR' || t === 'H.R.') return `H.R.${number}`;
  if (t === 'HRES' || t === 'H.RES.') return `H.Res.${number}`;
  if (t === 'HJRES') return `H.J.Res.${number}`;
  if (t === 'S' || t === 'S.') return `S.${number}`;
  return `${t} ${number}`;
}

export function houseVoteCongressUrl(vote: HouseVoteSummary): string {
  if (vote.url) {
    return vote.url.replace('api.congress.gov/v3/house-vote', 'www.congress.gov/roll-call-vote');
  }
  if (vote.legislationUrl) {
    const m = vote.legislationUrl.match(/congress\.gov\/bill\/(\d+)\/([^/]+)\/(\d+)/i);
    if (m) {
      return `https://www.congress.gov/bill/${m[1]}th-congress/${m[2]}/${m[3]}`;
    }
    return vote.legislationUrl.replace('api.congress.gov', 'www.congress.gov');
  }
  return `https://www.congress.gov/roll-call-vote/${vote.congress}th-congress/house/${vote.sessionNumber}/${vote.rollCallNumber}`;
}

export function voteResultLabel(result?: string): 'Passed' | 'Failed' {
  if (!result) return 'Failed';
  const r = result.toLowerCase();
  if (r.includes('pass') || r.includes('agreed') || r.includes('adopt')) return 'Passed';
  return 'Failed';
}

export function policyCategoryFromQuestion(question?: string, legislationType?: string): string {
  const q = (question ?? '').toLowerCase();
  if (q.includes('budget') || q.includes('appropriat')) return 'Budget';
  if (q.includes('rule')) return 'Procedural';
  if (legislationType?.toUpperCase().startsWith('HRES')) return 'Procedural';
  return 'Legislation';
}
