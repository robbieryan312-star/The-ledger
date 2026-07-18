/**
 * allPoliticians.ts — the single national roster the app lists/searches over.
 *
 * Merges identity-only FEATURED profiles (from generated/roster.json) with the
 * lightweight, real-sourced records for every other current member of Congress
 * and every confirmed sitting governor. De-duplication is by bioguide ID
 * (Congress) and by state (governors): a featured politician and their dataset
 * record merge into ONE entry, with the featured profile winning.
 *
 * CRITICAL: current-office / in-office vs. former status everywhere downstream
 * is derived from `resolveCurrentOffice` (the authoritative datasets), NEVER the
 * hand-typed `inOffice` flag. A former official can no longer appear as current.
 */
import { Politician, ResolvedOffice, Chamber, CampaignFinance, ConsistencyData, Party } from '../types';
import rosterData from './generated/roster.json';
import { executiveOfficials } from './executiveOfficials';
import { judicialOfficials } from './judicialOfficials';
import { getPoliticianBranch, GovernmentBranch } from './branches';
import {
  generatedCongressPoliticians,
  generatedGovernorPoliticians,
} from './generatedPoliticians';
import { resolveCurrentOffice } from './officeResolution';
import { bioguideMatchesCurrentLegislator, congressPhotoUrl, executivePortraitUrl } from './photos';

const EMPTY_FINANCE: CampaignFinance = {
  totalRaised: 0, totalSpent: 0, cashOnHand: 0, cycle: '2024',
  donors: [], topIndustries: [], lobbyistMoney: [], foreignPAC: [],
  individualDonations: 0, pacDonations: 0, selfFunding: 0,
};
const EMPTY_CONSISTENCY: ConsistencyData = {
  overallScore: 0, campaignPromises: [],
  partyLineVotePercentage: 0, lobbyistAlignmentPercentage: 0,
  termConsistency: [],
};

const rosterPoliticians: Politician[] = (rosterData.entries as Array<Record<string, unknown>>).map((entry) => ({
  id: entry.id as string,
  bioguideId: (entry.bioguideId as string) || undefined,
  name: entry.name as string,
  firstName: entry.firstName as string,
  lastName: entry.lastName as string,
  party: entry.party as Party,
  state: entry.state as string,
  stateCode: entry.stateCode as string,
  chamber: entry.chamber as Chamber,
  level: entry.level as 'federal' | 'state' | 'local',
  district: (entry.district as string) || undefined,
  imageUrl: (entry.imageUrl as string) || undefined,
  website: (entry.website as string) || undefined,
  recordType: (entry.recordType as 'featured' | 'lightweight') || 'featured',
  inOffice: entry.inOffice as boolean,
  termStart: (entry.termStart as string) || undefined,
  termEnd: (entry.termEnd as string) || undefined,
  bio: '',
  topIssues: [],
  votingRecord: [],
  campaignFinance: EMPTY_FINANCE,
  stockTrades: [],
  consistency: EMPTY_CONSISTENCY,
  controversies: [],
  news: [],
}));

export const rosterStates = (
  (rosterData as Record<string, unknown>).states as Array<{
    code: string; name: string; activePoliticians: number;
  }> ?? []
);

function withOfficialPhoto(p: Politician): Politician {
  const hasLegacyCongressHost =
    !!p.imageUrl &&
    (p.imageUrl.includes('theunitedstates.io/images/congress') ||
      p.imageUrl.includes('bioguide.congress.gov/bioguide/photo') ||
      p.imageUrl.includes('govtrack.us/static/legislator-photos'));
  if (p.bioguideId && (!p.imageUrl || hasLegacyCongressHost)) {
    if (!bioguideMatchesCurrentLegislator(p.bioguideId, p)) {
      const execPhoto = executivePortraitUrl(p.id);
      return execPhoto ? { ...p, imageUrl: execPhoto } : { ...p, imageUrl: undefined };
    }
    return { ...p, imageUrl: congressPhotoUrl(p.bioguideId) };
  }
  if (p.imageUrl) return p;
  const execPhoto = executivePortraitUrl(p.id);
  return execPhoto ? { ...p, imageUrl: execPhoto } : p;
}

const executiveOfficialsWithPhotos = executiveOfficials.map(withOfficialPhoto);

const EXECUTIVE_CHAMBERS: Chamber[] = ['president', 'vice_president', 'cabinet'];
const EXECUTIVE_ORDER: Record<string, number> = {
  president: 0,
  vice_president: 1,
  cabinet: 2,
};

export { getPoliticianBranch };
export type { GovernmentBranch };

// Featured roster profiles get an official photo when they have a bioguide ID.
const featured: Politician[] = rosterPoliticians.map(withOfficialPhoto);

const featuredBioguides = new Set(
  [
    ...featured.map((p) => p.bioguideId),
    ...executiveOfficialsWithPhotos.map((p) => p.bioguideId),
  ].filter((b): b is string => !!b),
);
const featuredProfileIds = new Set([
  ...executiveOfficialsWithPhotos.map((p) => p.id),
  ...judicialOfficials.map((p) => p.id),
]);
const featuredGovernorStates = new Set(
  featured.filter((p) => p.chamber === 'governor').map((p) => p.stateCode),
);

const dedupedCongress = generatedCongressPoliticians
  .filter(
    (p) =>
      (!p.bioguideId || !featuredBioguides.has(p.bioguideId)) &&
      !featuredProfileIds.has(p.id),
  )
  .map(withOfficialPhoto);
const dedupedGovernors = generatedGovernorPoliticians.filter(
  (p) => !featuredGovernorStates.has(p.stateCode),
);

/** The complete national roster: executives and justices first, then featured, then lightweight. */
export const allPoliticians: Politician[] = [
  ...executiveOfficialsWithPhotos,
  ...judicialOfficials,
  ...featured,
  ...dedupedCongress,
  ...dedupedGovernors,
];

const byId = new Map<string, Politician>(allPoliticians.map((p) => [p.id, p]));

// Resolve a bioguide ID to the roster's profile id. For featured profiles this is
// their slug; for lightweight congressional records it is the bioguide itself.
// Featured profiles win (listed before lightweight dupes in the roster).
const profileIdByBioguide = new Map<string, string>();
for (const p of allPoliticians) {
  if (p.bioguideId && !profileIdByBioguide.has(p.bioguideId)) {
    profileIdByBioguide.set(p.bioguideId, p.id);
  }
}

export function getPoliticianById(id: string): Politician | undefined {
  return byId.get(id) ?? getPoliticianByBioguide(id);
}

/** Find a roster profile by bioguide ID (used to link bill sponsors when resolvable). */
export function getPoliticianByBioguide(bioguideId?: string): Politician | undefined {
  if (!bioguideId) return undefined;
  const id = profileIdByBioguide.get(bioguideId);
  return id ? byId.get(id) : undefined;
}

/** Resolve a politician's current office from authoritative data (cached helper). */
export function resolveOffice(p: Politician): ResolvedOffice {
  return resolveCurrentOffice(p);
}

/** True when the authoritative datasets place this person in office right now. */
export function isCurrentlyInOffice(p: Politician): boolean {
  return resolveCurrentOffice(p).isCurrent;
}

/**
 * Current officials for a state, by construction — derived from the resolver,
 * not the hand-typed `inOffice` flag. Replaces the old roster filter.
 */
export function getPoliticiansForState(stateCode: string): Politician[] {
  return allPoliticians.filter(
    (p) => p.stateCode === stateCode && isCurrentlyInOffice(p),
  );
}

/** Every currently-serving official across the country. */
export function getCurrentPoliticians(): Politician[] {
  return allPoliticians.filter(isCurrentlyInOffice);
}

/**
 * Office hierarchy for default roster ordering (neutral, not editorial "prominence"):
 * (0) President / VP / cabinet
 * (1) Supreme Court
 * (2) Governor — state chief executive before federal delegation in state views
 * (3) U.S. Senate
 * (4) U.S. House
 * (5) State & local offices
 * Within a tier: House by district number, then last name.
 */
export function getOfficeSortTier(p: Politician): number {
  if (EXECUTIVE_CHAMBERS.includes(p.chamber)) return 0;
  if (p.chamber === 'scotus') return 1;
  if (p.chamber === 'governor') return 2;
  if (p.level === 'federal' && p.chamber === 'senate') return 3;
  if (p.level === 'federal' && p.chamber === 'house') return 4;
  return 5;
}

/** @deprecated Use getOfficeSortTier */
export const getPoliticianProminenceTier = getOfficeSortTier;

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
  if (a.chamber === 'house' && b.chamber === 'house') {
    return (
      (parseInt(a.district ?? '0', 10) || 0) - (parseInt(b.district ?? '0', 10) || 0)
    );
  }
  return a.lastName.localeCompare(b.lastName);
}

/** @deprecated Use comparePoliticiansByOffice */
export const comparePoliticiansByProminence = comparePoliticiansByOffice;

/** Search the national roster by name, state, party, or district number. */
export function searchPoliticians(query: string, limit = 8): Politician[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return allPoliticians
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.stateCode.toLowerCase() === q ||
        p.party.toLowerCase().includes(q) ||
        (p.district != null && p.district.includes(q)),
    )
    .sort(comparePoliticiansByOffice)
    .slice(0, limit);
}

/** Default office hierarchy for map sidebars and browse lists. */
export function sortOfficialsForDisplay(politicians: Politician[]): Politician[] {
  return [...politicians].sort(comparePoliticiansByOffice);
}

/**
 * Featured profiles currently in office for a state — derived from the
 * authoritative resolver (resolveCurrentOffice), NEVER the hand-typed `inOffice`
 * flag. For the full national roster use getPoliticiansForState; this helper is
 * scoped to featured (non-lightweight) profiles only.
 */
export function getFeaturedPoliticiansForState(stateCode: string): Politician[] {
  return allPoliticians.filter(
    (p) => p.stateCode === stateCode && p.recordType !== 'lightweight' && resolveCurrentOffice(p).isCurrent,
  );
}

export function getStateCoverage(stateCode: string): {
  inDatabase: number;
  targetFederal: number;
  isPartial: boolean;
  label: string;
} {
  const inDatabase = getFeaturedPoliticiansForState(stateCode).length;
  const stateMeta = rosterStates.find((s) => s.code === stateCode);
  const targetFederal = stateMeta?.activePoliticians ?? 0;
  const isPartial = inDatabase > 0 && inDatabase < targetFederal;
  const label = inDatabase === 0
    ? 'No federal officials profiled yet'
    : isPartial
      ? `${inDatabase} of ${targetFederal} federal seats profiled`
      : `${inDatabase} officials in database`;
  return { inDatabase, targetFederal, isPartial, label };
}

/** National coverage stats for surfacing in the UI / docs. */
export function getCoverageStats(): {
  total: number;
  featured: number;
  lightweight: number;
  withPhotos: number;
  executives: number;
  justices: number;
  senators: number;
  representatives: number;
  governors: number;
} {
  const featured = allPoliticians.filter((p) => p.recordType !== 'lightweight').length;
  return {
    total: allPoliticians.length,
    featured,
    lightweight: allPoliticians.length - featured,
    withPhotos: allPoliticians.filter((p) => !!p.imageUrl).length,
    executives: allPoliticians.filter((p) => EXECUTIVE_CHAMBERS.includes(p.chamber)).length,
    justices: allPoliticians.filter((p) => p.chamber === 'scotus').length,
    senators: allPoliticians.filter((p) => p.chamber === 'senate').length,
    representatives: allPoliticians.filter((p) => p.chamber === 'house').length,
    governors: allPoliticians.filter((p) => p.chamber === 'governor').length,
  };
}
