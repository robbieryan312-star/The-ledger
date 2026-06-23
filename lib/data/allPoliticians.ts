/**
 * allPoliticians.ts — the single national roster the app lists/searches over.
 *
 * Merges the richly hand-authored FEATURED profiles (mockPoliticians) with the
 * lightweight, real-sourced records for every other current member of Congress
 * and every confirmed sitting governor. De-duplication is by bioguide ID
 * (Congress) and by state (governors): a featured politician and their dataset
 * record merge into ONE entry, with the featured profile winning.
 *
 * CRITICAL: current-office / in-office vs. former status everywhere downstream
 * is derived from `resolveCurrentOffice` (the authoritative datasets), NEVER the
 * hand-typed `inOffice` flag. A former official can no longer appear as current.
 */
import { Politician, ResolvedOffice } from '../types';
import { mockPoliticians } from './mockPoliticians';
import {
  generatedCongressPoliticians,
  generatedGovernorPoliticians,
} from './generatedPoliticians';
import { resolveCurrentOffice } from './officeResolution';
import { congressPhotoUrl } from './photos';

// Featured profiles ALSO get an official photo: when a hand-authored profile has
// a bioguide ID but no explicit imageUrl, derive its public-domain portrait.
const featured: Politician[] = mockPoliticians.map((p) =>
  !p.imageUrl && p.bioguideId ? { ...p, imageUrl: congressPhotoUrl(p.bioguideId) } : p,
);

const featuredBioguides = new Set(
  featured.map((p) => p.bioguideId).filter((b): b is string => !!b),
);
const featuredGovernorStates = new Set(
  featured.filter((p) => p.chamber === 'governor').map((p) => p.stateCode),
);

const dedupedCongress = generatedCongressPoliticians.filter(
  (p) => !p.bioguideId || !featuredBioguides.has(p.bioguideId),
);
const dedupedGovernors = generatedGovernorPoliticians.filter(
  (p) => !featuredGovernorStates.has(p.stateCode),
);

/** The complete national roster: featured first, then lightweight records. */
export const allPoliticians: Politician[] = [
  ...featured,
  ...dedupedCongress,
  ...dedupedGovernors,
];

const byId = new Map<string, Politician>(allPoliticians.map((p) => [p.id, p]));

export function getPoliticianById(id: string): Politician | undefined {
  return byId.get(id);
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

const CHAMBER_DISPLAY_ORDER: Record<string, number> = {
  senate: 0,
  governor: 1,
  house: 2,
};

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
    .slice(0, limit);
}

/** Senators → governor → representatives (by district) for map sidebars. */
export function sortOfficialsForDisplay(politicians: Politician[]): Politician[] {
  return [...politicians].sort((a, b) => {
    const ca = CHAMBER_DISPLAY_ORDER[a.chamber] ?? 9;
    const cb = CHAMBER_DISPLAY_ORDER[b.chamber] ?? 9;
    if (ca !== cb) return ca - cb;
    if (a.chamber === 'house' && b.chamber === 'house') {
      return (parseInt(a.district ?? '0', 10) || 0) - (parseInt(b.district ?? '0', 10) || 0);
    }
    return a.lastName.localeCompare(b.lastName);
  });
}

/** National coverage stats for surfacing in the UI / docs. */
export function getCoverageStats(): {
  total: number;
  featured: number;
  lightweight: number;
  withPhotos: number;
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
    senators: allPoliticians.filter((p) => p.chamber === 'senate').length,
    representatives: allPoliticians.filter((p) => p.chamber === 'house').length,
    governors: allPoliticians.filter((p) => p.chamber === 'governor').length,
  };
}
