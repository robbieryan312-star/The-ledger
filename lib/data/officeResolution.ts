/**
 * officeResolution.ts — recency-weighted CURRENT-office resolver.
 *
 * The owner's rule: "The most recent authoritative record determines a
 * politician's CURRENT office. Older records must NEVER set current position."
 *
 * This module makes that rule structural. For members of Congress, the
 * authoritative current-members snapshot (`currentLegislators.json`, produced by
 * scripts/sync-legislators.ts from unitedstates/congress-legislators) is the
 * source of truth: presence => current; absence => former. Hand-typed
 * `chamber`/`termEnd` strings can no longer assert someone is a sitting member.
 */
import {
  Chamber,
  OfficeRecord,
  Party,
  Politician,
  ResolvedOffice,
  Source,
  SourceTier,
  SourcedFact,
  SOURCE_TIER_RANK,
  AUTHORITATIVE_TIERS,
} from '../types';
import legislatorsSnapshot from './generated/currentLegislators.json';
import { findCurrentGovernor, governorOfficeRecord } from './governors';

interface RawLegislatorRecord {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  state: string;
  chamber: string;
  office: string;
  district?: string;
  party: string;
  termStart: string;
  termEnd: string;
  govtrackId?: number;
  fecIds?: string[];
  sourceUrl: string;
}

const snapshot = legislatorsSnapshot as {
  meta: { source: Source; datasetUrl: string; asOf: string; count: number; note: string };
  legislators: RawLegislatorRecord[];
};

/** Provenance for the legislators dataset — Tier 1 (official, public-domain). */
export const LEGISLATORS_SOURCE: Source = snapshot.meta.source;
export const LEGISLATORS_AS_OF: string = snapshot.meta.asOf;

const byBioguide = new Map<string, RawLegislatorRecord>(
  snapshot.legislators.map((l) => [l.bioguideId, l]),
);

const CONGRESSIONAL_CHAMBERS: Chamber[] = ['senate', 'house'];

function toOfficeRecord(rec: RawLegislatorRecord): OfficeRecord {
  return {
    bioguideId: rec.bioguideId,
    chamber: rec.chamber as Chamber,
    office: rec.office,
    state: rec.state,
    stateCode: rec.stateCode,
    district: rec.district,
    party: rec.party as Party,
    termStart: rec.termStart,
    termEnd: rec.termEnd,
    source: { ...LEGISLATORS_SOURCE, url: rec.sourceUrl || LEGISLATORS_SOURCE.url, date: LEGISLATORS_AS_OF },
    asOf: LEGISLATORS_AS_OF,
  };
}

/** Look up the authoritative current office for a bioguide ID, if any. */
export function findCurrentByBioguide(bioguideId?: string): OfficeRecord | undefined {
  if (!bioguideId) return undefined;
  const rec = byBioguide.get(bioguideId);
  return rec ? toOfficeRecord(rec) : undefined;
}

export function isCurrentMember(bioguideId?: string): boolean {
  return !!bioguideId && byBioguide.has(bioguideId);
}

/**
 * Reusable recency resolver. Given any set of dated, tiered OfficeRecords for
 * one person, collapse them to the single CURRENT office:
 *   1. Only authoritative-tier records (official/nonpartisan) may set current.
 *   2. Among those, the one with the latest `termStart` wins.
 *   3. Ties on date break toward the higher source tier.
 * Returns the winning record, or undefined if no record qualifies.
 */
export function resolveMostRecentOffice(records: OfficeRecord[]): OfficeRecord | undefined {
  const eligible = records.filter((r) => AUTHORITATIVE_TIERS.includes(r.source.tier));
  if (eligible.length === 0) return undefined;
  return [...eligible].sort((a, b) => {
    const dateDiff = new Date(b.termStart).getTime() - new Date(a.termStart).getTime();
    if (dateDiff !== 0) return dateDiff;
    return SOURCE_TIER_RANK[b.source.tier] - SOURCE_TIER_RANK[a.source.tier];
  })[0];
}

const FORMER_PREFIX: Record<string, string> = {
  senate: 'Former U.S. Senator',
  house: 'Former U.S. Representative',
  governor: 'Former Governor',
};

function normalizeLastName(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Resolve a featured politician's CURRENT office label, correct-by-construction.
 *
 * - Has bioguide + present in dataset  -> real current office (Tier 1).
 * - Has bioguide + congressional + absent -> real FORMER office (Tier 1 negative).
 * - No bioguide / non-congressional office -> unresolved-demo (mock, flagged).
 */
export function resolveCurrentOffice(politician: Politician): ResolvedOffice {
  const real = findCurrentByBioguide(politician.bioguideId);
  if (real) {
    const districtSuffix = real.chamber === 'house' && real.district ? `, District ${real.district}` : '';
    return {
      isCurrent: true,
      label: `${real.office} (${real.stateCode})${districtSuffix}`,
      current: real,
      reason: 'real-current',
      source: real.source,
      asOf: real.asOf,
    };
  }

  // Bioguide-linked congressional member who is NOT in the current dataset:
  // they have left office. This is the Rubio case — resolved to FORMER without
  // anyone having to remember to flip an `inOffice` flag.
  if (politician.bioguideId && CONGRESSIONAL_CHAMBERS.includes(politician.chamber)) {
    const label = FORMER_PREFIX[politician.chamber] ?? 'Former Member of Congress';
    return {
      isCurrent: false,
      label: `${label} (${politician.stateCode})`,
      reason: 'real-former',
      source: { ...LEGISLATORS_SOURCE, date: LEGISLATORS_AS_OF },
      asOf: LEGISLATORS_AS_OF,
    };
  }

  // Governors: resolved against the curated, sourced current-governors list.
  // Presence + name match => current; a governor-chamber profile whose state has
  // a *different* sitting governor => former, by construction (same rule as
  // Congress: the authoritative roster, not a hand-typed flag, decides current).
  if (politician.chamber === 'governor') {
    const gov = findCurrentGovernor(politician.stateCode);
    if (gov && normalizeLastName(gov.lastName) === normalizeLastName(politician.lastName)) {
      const rec = governorOfficeRecord(gov);
      return {
        isCurrent: true,
        label: `${rec.office} (${rec.stateCode})`,
        current: rec,
        reason: 'real-current',
        source: rec.source,
        asOf: rec.asOf,
      };
    }
    if (gov) {
      // The state has a confirmed sitting governor who is someone else.
      return {
        isCurrent: false,
        label: `Former Governor (${politician.stateCode})`,
        reason: 'real-former',
        source: { ...governorOfficeRecord(gov).source },
        asOf: governorOfficeRecord(gov).asOf,
      };
    }
  }

  // Not yet wired to an authoritative source (e.g. local offices).
  const demoLabel = politician.chamber
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    isCurrent: politician.inOffice,
    label: `${demoLabel} (${politician.stateCode})`,
    reason: 'unresolved-demo',
    source: { name: 'Demo profile data', tier: 'unverified', description: 'Not yet linked to an authoritative dataset' },
    asOf: politician.termStart ?? 'n/a',
  };
}

/**
 * Low-trust corroboration rule. Tier 3/4 facts (media/alleged/unverified) may
 * only be shown when corroborated by at least one additional distinct source
 * (>= 2 distinct sources total). Authoritative facts always pass.
 */
export function meetsCorroborationRule<T>(fact: SourcedFact<T>): boolean {
  if (AUTHORITATIVE_TIERS.includes(fact.source.tier)) return true;
  const distinct = new Set<string>([fact.source.name, ...(fact.corroboration ?? []).map((s) => s.name)]);
  return distinct.size >= 2;
}

/** True when a fact is low-trust and must be visibly flagged as unverified/reported. */
export function isLowTrust(tier: SourceTier): boolean {
  return !AUTHORITATIVE_TIERS.includes(tier);
}

/** Convenience: every current FL senator from the real dataset. */
export function currentSenatorsForState(stateCode: string): OfficeRecord[] {
  return snapshot.legislators
    .filter((l) => l.stateCode === stateCode && l.chamber === 'senate')
    .map(toOfficeRecord);
}
