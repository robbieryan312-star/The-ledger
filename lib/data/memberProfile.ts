/**
 * Per-category profile files for migrated gold-standard members (Phase 17b architecture).
 * One JSON per destination view under lib/data/generated/profiles/{bioguideId}/.
 * Other members continue to read from the topicPositions mega-bundle.
 *
 * Uses static JSON imports (no node:fs) so this module is safe to import from
 * code paths consumed by client components via topicPositions.ts.
 */
import sandersStatements from './generated/profiles/S000033/statements.json';
import sandersPositions from './generated/profiles/S000033/positions.json';
import sandersSaidDid from './generated/profiles/S000033/saidDid.json';
import sandersOrgVoteLinks from './generated/profiles/S000033/orgVoteLinks.json';
import sandersVotes from './generated/profiles/S000033/votes.json';
import sandersFinance from './generated/profiles/S000033/finance.json';
import sandersNews from './generated/profiles/S000033/news.json';
import sandersControversies from './generated/profiles/S000033/controversies.json';
import sandersEndorsements from './generated/profiles/S000033/endorsements.json';

import o000172Statements from './generated/profiles/O000172/statements.json';
import o000172Positions from './generated/profiles/O000172/positions.json';
import o000172SaidDid from './generated/profiles/O000172/saidDid.json';
import o000172OrgVoteLinks from './generated/profiles/O000172/orgVoteLinks.json';
import o000172Votes from './generated/profiles/O000172/votes.json';
import o000172Finance from './generated/profiles/O000172/finance.json';
import o000172News from './generated/profiles/O000172/news.json';
import o000172Controversies from './generated/profiles/O000172/controversies.json';
import o000172Endorsements from './generated/profiles/O000172/endorsements.json';

import m000355Statements from './generated/profiles/M000355/statements.json';
import m000355Positions from './generated/profiles/M000355/positions.json';
import m000355SaidDid from './generated/profiles/M000355/saidDid.json';
import m000355OrgVoteLinks from './generated/profiles/M000355/orgVoteLinks.json';
import m000355Votes from './generated/profiles/M000355/votes.json';
import m000355Finance from './generated/profiles/M000355/finance.json';
import m000355News from './generated/profiles/M000355/news.json';
import m000355Controversies from './generated/profiles/M000355/controversies.json';
import m000355Endorsements from './generated/profiles/M000355/endorsements.json';

import m001184Statements from './generated/profiles/M001184/statements.json';
import m001184Positions from './generated/profiles/M001184/positions.json';
import m001184SaidDid from './generated/profiles/M001184/saidDid.json';
import m001184OrgVoteLinks from './generated/profiles/M001184/orgVoteLinks.json';
import m001184Votes from './generated/profiles/M001184/votes.json';
import m001184Finance from './generated/profiles/M001184/finance.json';
import m001184News from './generated/profiles/M001184/news.json';
import m001184Controversies from './generated/profiles/M001184/controversies.json';
import m001184Endorsements from './generated/profiles/M001184/endorsements.json';

import w000817Statements from './generated/profiles/W000817/statements.json';
import w000817Positions from './generated/profiles/W000817/positions.json';
import w000817SaidDid from './generated/profiles/W000817/saidDid.json';
import w000817OrgVoteLinks from './generated/profiles/W000817/orgVoteLinks.json';
import w000817Votes from './generated/profiles/W000817/votes.json';
import w000817Finance from './generated/profiles/W000817/finance.json';
import w000817News from './generated/profiles/W000817/news.json';
import w000817Controversies from './generated/profiles/W000817/controversies.json';
import w000817Endorsements from './generated/profiles/W000817/endorsements.json';

import c001098Statements from './generated/profiles/C001098/statements.json';
import c001098Positions from './generated/profiles/C001098/positions.json';
import c001098SaidDid from './generated/profiles/C001098/saidDid.json';
import c001098OrgVoteLinks from './generated/profiles/C001098/orgVoteLinks.json';
import c001098Votes from './generated/profiles/C001098/votes.json';
import c001098Finance from './generated/profiles/C001098/finance.json';
import c001098News from './generated/profiles/C001098/news.json';
import c001098Controversies from './generated/profiles/C001098/controversies.json';
import c001098Endorsements from './generated/profiles/C001098/endorsements.json';

import type { OrgVoteTopicLink } from './buildOrgVoteTopicLinks';
import type { FecFinanceEntry } from './fecFinance';
import type { Controversy, NewsItem, Source, VoteRecord } from '../types';
import type {
  PlatformPositionEntry,
  SaidDidLinkEntry,
  TopicPositionData,
  TopicStatementEntry,
} from './topicPositions';
import { leadSummary } from './displaySummary';

function isDisplayableStatement(statement: TopicStatementEntry): boolean {
  if (statement.tier === 'media' || statement.tier === 'alleged') {
    return statement.verbatim === true;
  }
  return true;
}

/** Members migrated off the topicPositions mega-bundle. */
export const MIGRATED_PROFILE_BIOGUIDES = new Set([
  'S000033',
  'O000172',
  'M000355',
  'M001184',
  'W000817',
  'C001098',
]);

export function usesMemberProfile(bioguideId: string): boolean {
  return MIGRATED_PROFILE_BIOGUIDES.has(bioguideId);
}

interface StatementsFile {
  byTopic: Record<string, { statements: TopicStatementEntry[] }>;
}

interface PositionsFile {
  byTopic: Record<string, { platformPositions: PlatformPositionEntry[] }>;
}

interface SaidDidFile {
  byTopic: Record<string, SaidDidLinkEntry[]>;
}

interface ProfileVotesFile {
  bioguideId: string;
  politicianId: string;
  chamber?: 'house' | 'senate';
  votes: VoteRecord[];
  asOf: string;
  status?: 'unavailable';
  source?: Source;
  note?: string;
}

interface ProfileFinanceFile {
  bioguideId: string;
  entry: FecFinanceEntry | null;
}

/** Roll-call votes materialized from data/votes/national/congress-votes.json. */
export interface MemberProfileCongressVotes {
  politicianId: string;
  bioguideId: string;
  chamber: 'house' | 'senate';
  votes: VoteRecord[];
  source: Source;
  asOf: string;
}

const PROFILE_DATA: Record<
  string,
  { statements: StatementsFile; positions: PositionsFile; saidDid: SaidDidFile }
> = {
  S000033: {
    statements: sandersStatements as StatementsFile,
    positions: sandersPositions as PositionsFile,
    saidDid: sandersSaidDid as SaidDidFile,
  },
  O000172: {
    statements: o000172Statements as StatementsFile,
    positions: o000172Positions as PositionsFile,
    saidDid: o000172SaidDid as SaidDidFile,
  },
  M000355: {
    statements: m000355Statements as StatementsFile,
    positions: m000355Positions as PositionsFile,
    saidDid: m000355SaidDid as SaidDidFile,
  },
  M001184: {
    statements: m001184Statements as StatementsFile,
    positions: m001184Positions as PositionsFile,
    saidDid: m001184SaidDid as SaidDidFile,
  },
  W000817: {
    statements: w000817Statements as StatementsFile,
    positions: w000817Positions as PositionsFile,
    saidDid: w000817SaidDid as SaidDidFile,
  },
  C001098: {
    statements: c001098Statements as StatementsFile,
    positions: c001098Positions as PositionsFile,
    saidDid: c001098SaidDid as SaidDidFile,
  },
};

const ORG_VOTE_LINKS: Record<string, OrgVoteTopicLink[]> = {
  S000033: (sandersOrgVoteLinks as { links: OrgVoteTopicLink[] }).links,
  O000172: (o000172OrgVoteLinks as { links: OrgVoteTopicLink[] }).links,
  M000355: (m000355OrgVoteLinks as { links: OrgVoteTopicLink[] }).links,
  M001184: (m001184OrgVoteLinks as { links: OrgVoteTopicLink[] }).links,
  W000817: (w000817OrgVoteLinks as { links: OrgVoteTopicLink[] }).links,
  C001098: (c001098OrgVoteLinks as { links: OrgVoteTopicLink[] }).links,
};

const PROFILE_VOTES: Record<string, ProfileVotesFile> = {
  S000033: sandersVotes as ProfileVotesFile,
  O000172: o000172Votes as ProfileVotesFile,
  M000355: m000355Votes as ProfileVotesFile,
  M001184: m001184Votes as ProfileVotesFile,
  W000817: w000817Votes as ProfileVotesFile,
  C001098: c001098Votes as ProfileVotesFile,
};

const PROFILE_FINANCE: Record<string, ProfileFinanceFile> = {
  S000033: sandersFinance as ProfileFinanceFile,
  O000172: o000172Finance as ProfileFinanceFile,
  M000355: m000355Finance as ProfileFinanceFile,
  M001184: m001184Finance as ProfileFinanceFile,
  W000817: w000817Finance as ProfileFinanceFile,
  C001098: c001098Finance as ProfileFinanceFile,
};

const PROFILE_NEWS: Record<string, ProfileNewsFile> = {
  S000033: sandersNews as ProfileNewsFile,
  O000172: o000172News as ProfileNewsFile,
  M000355: m000355News as ProfileNewsFile,
  M001184: m001184News as ProfileNewsFile,
  W000817: w000817News as ProfileNewsFile,
  C001098: c001098News as ProfileNewsFile,
};

interface ProfileControversiesFile {
  bioguideId: string;
  items: Controversy[];
}

interface EndorsementEntry {
  name: string;
  office: string;
  politicianId?: string;
  date?: string;
  source?: Source;
}

interface ProfileEndorsementsFile {
  bioguideId: string;
  endorses: EndorsementEntry[];
  endorsedBy: EndorsementEntry[];
}

const PROFILE_CONTROVERSIES: Record<string, ProfileControversiesFile> = {
  S000033: sandersControversies as ProfileControversiesFile,
  O000172: o000172Controversies as ProfileControversiesFile,
  M000355: m000355Controversies as ProfileControversiesFile,
  M001184: m001184Controversies as ProfileControversiesFile,
  W000817: w000817Controversies as ProfileControversiesFile,
  C001098: c001098Controversies as ProfileControversiesFile,
};

const PROFILE_ENDORSEMENTS: Record<string, ProfileEndorsementsFile> = {
  S000033: sandersEndorsements as ProfileEndorsementsFile,
  O000172: o000172Endorsements as ProfileEndorsementsFile,
  M000355: m000355Endorsements as ProfileEndorsementsFile,
  M001184: m001184Endorsements as ProfileEndorsementsFile,
  W000817: w000817Endorsements as ProfileEndorsementsFile,
  C001098: c001098Endorsements as ProfileEndorsementsFile,
};

/**
 * Reconstruct TopicPositionData map from per-category profile files.
 * Returns null when the member has not been migrated.
 */
export function getMemberProfileTopicPositions(
  bioguideId: string,
): Record<string, TopicPositionData> | null {
  const bundle = PROFILE_DATA[bioguideId];
  if (!bundle) return null;

  const topicIds = new Set<string>([
    ...Object.keys(bundle.statements.byTopic ?? {}),
    ...Object.keys(bundle.positions.byTopic ?? {}),
    ...Object.keys(bundle.saidDid.byTopic ?? {}),
  ]);

  const out: Record<string, TopicPositionData> = {};

  for (const topicId of topicIds) {
    const statements = (bundle.statements.byTopic[topicId]?.statements ?? []).filter(
      isDisplayableStatement,
    );
    const platformPositions = bundle.positions.byTopic[topicId]?.platformPositions ?? [];
    const saidDidLinks = bundle.saidDid.byTopic[topicId] ?? [];

    if (
      statements.length === 0 &&
      platformPositions.length === 0 &&
      saidDidLinks.length === 0
    ) {
      continue;
    }

    out[topicId] = {
      statements,
      saidDidLinks,
      ...(platformPositions.length > 0 ? { platformPositions } : {}),
    };
  }

  return Object.keys(out).length > 0 ? out : null;
}

export function getMemberProfileOrgVoteLinks(bioguideId: string): OrgVoteTopicLink[] | null {
  if (!MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) return null;
  return ORG_VOTE_LINKS[bioguideId] ?? [];
}

/**
 * Roll-call votes for migrated profiles — materialized from data/votes/national/congress-votes.json.
 */
export function getMemberProfileVotes(bioguideId: string): MemberProfileCongressVotes | null {
  const file = PROFILE_VOTES[bioguideId];
  if (!file || file.status === 'unavailable' || file.votes.length === 0) return null;
  return {
    politicianId: file.politicianId,
    bioguideId: file.bioguideId,
    chamber: file.chamber ?? inferChamberFromVotes(file.votes),
    votes: file.votes,
    source: file.source ?? {
      name: 'Congress.gov',
      url: 'https://www.congress.gov',
      tier: 'official',
    },
    asOf: file.asOf,
  };
}

function inferChamberFromVotes(votes: VoteRecord[]): 'house' | 'senate' {
  const id = votes[0]?.id ?? '';
  if (/\-h119\-/i.test(id) || /-\d{6}-119-\d+-/i.test(id)) return 'house';
  return 'senate';
}

/** FEC totals for migrated profiles — materialized from data/fec/national/congress-finance.json. */
export function getMemberProfileFinance(bioguideId: string): FecFinanceEntry | null {
  if (!MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) return null;
  return PROFILE_FINANCE[bioguideId]?.entry ?? null;
}

interface ProfileNewsFile {
  bioguideId: string;
  items: NewsItem[];
  status?: 'fetch-blocked';
  note?: string;
}

/**
 * News items for migrated profiles — materialized from
 * generated/profiles/{bioguideId}/news.json (Group C: approved-outlet journalism only).
 * Rendered headline/summary text is display-only here; the underlying `headline` and
 * `summary` fields on disk are never mutated (source-integrity guards check the raw fields).
 * Returns null (never `[]` as a false "verified empty") when the fetch is blocked and no
 * prior verified items exist, so callers can fall back rather than show an honest-gap that
 * isn't actually verified absence.
 */
export function getMemberProfileNews(bioguideId: string): NewsItem[] | null {
  const file = PROFILE_NEWS[bioguideId];
  if (!file) return null;
  if (file.items.length === 0 && file.status === 'fetch-blocked') return null;
  return file.items.map((item) => ({
    ...item,
    summary: leadSummary(item.summary || item.headline, 200) || item.headline,
  }));
}

/**
 * Display news for a politician page: prefer the migrated profile's news.json
 * (Group C GDELT pipeline, approved outlets only) when it has verified items;
 * otherwise return empty (honest gap — mock data is quarantined).
 */
export function mergeProfileNews(legacyNews: NewsItem[] | undefined, bioguideId?: string): NewsItem[] {
  if (bioguideId && MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) {
    const profileNews = getMemberProfileNews(bioguideId);
    if (profileNews && profileNews.length > 0) return profileNews;
  }
  return legacyNews ?? [];
}

/**
 * Controversies for migrated profiles — prefer profile file over mock.
 * Returns null when no profile data exists (caller should fall back to mock).
 */
export function getMemberProfileControversies(bioguideId: string): Controversy[] | null {
  if (!MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) return null;
  const file = PROFILE_CONTROVERSIES[bioguideId];
  if (!file || file.items.length === 0) return null;
  return file.items;
}

/**
 * Endorsements for migrated profiles — prefer profile file over mock.
 * Returns null when no profile data exists (caller should fall back to mock).
 */
export function getMemberProfileEndorsements(bioguideId: string): ProfileEndorsementsFile | null {
  if (!MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) return null;
  const file = PROFILE_ENDORSEMENTS[bioguideId];
  if (!file) return null;
  if (file.endorses.length === 0 && file.endorsedBy.length === 0) return null;
  return file;
}

/**
 * Merge controversies: for migrated members prefer profile files;
 * otherwise return empty (honest gap — mock data is quarantined).
 */
export function mergeProfileControversies(legacyControversies: Controversy[] | undefined, bioguideId?: string): Controversy[] {
  if (bioguideId && MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) {
    const profileData = getMemberProfileControversies(bioguideId);
    if (profileData && profileData.length > 0) return profileData;
  }
  return legacyControversies ?? [];
}

/**
 * Merge endorsements: for migrated members prefer profile files;
 * otherwise return undefined (honest gap — mock data is quarantined).
 */
export function mergeProfileEndorsements(
  legacyEndorsements: { endorses: EndorsementEntry[]; endorsedBy: EndorsementEntry[] } | undefined,
  bioguideId?: string,
): { endorses: EndorsementEntry[]; endorsedBy: EndorsementEntry[] } | undefined {
  if (bioguideId && MIGRATED_PROFILE_BIOGUIDES.has(bioguideId)) {
    const profileData = getMemberProfileEndorsements(bioguideId);
    if (profileData) return { endorses: profileData.endorses, endorsedBy: profileData.endorsedBy };
  }
  return legacyEndorsements;
}
