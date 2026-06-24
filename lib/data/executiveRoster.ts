/**
 * executiveRoster.ts — curated, sourced list of sitting U.S. executive officials.
 *
 * The President, Vice President, and cabinet principals are NOT in the
 * congress-legislators dataset. This small roster is hand-verified against
 * whitehouse.gov administration pages and Senate confirmation records (as of
 * January 2026). Each entry flows through the same OfficeRecord / recency
 * resolver envelope as Congress and governors.
 *
 * A bioguide-linked official who left Congress for the executive branch (e.g.
 * Marco Rubio) resolves here — NOT as "Former U.S. Senator".
 */
import { Chamber, OfficeRecord, Party, Source } from '../types';

export const EXECUTIVE_AS_OF = '2026-01-20';

/** Primary provenance for the executive roster (Tier 1 — official .gov). */
export const EXECUTIVE_SOURCE: Source = {
  name: 'The White House — Administration',
  url: 'https://www.whitehouse.gov/administration/',
  tier: 'official',
  date: EXECUTIVE_AS_OF,
  description:
    'Official administration roster and biographies published by whitehouse.gov; cabinet confirmations cross-checked against Senate records.',
};

export type ExecutiveChamber = 'president' | 'vice_president' | 'cabinet';

export interface ExecutiveRecord {
  profileId: string;
  bioguideId?: string;
  name: string;
  firstName: string;
  lastName: string;
  party: Party;
  chamber: ExecutiveChamber;
  office: string;
  department?: string;
  termStart: string;
  termEnd: string;
  website?: string;
}

/** Sitting President, VP, and cabinet principals for the 2025–2029 term. */
export const currentExecutives: ExecutiveRecord[] = [
  {
    profileId: 'pres-us',
    name: 'Donald J. Trump',
    firstName: 'Donald',
    lastName: 'Trump',
    party: 'Republican',
    chamber: 'president',
    office: 'President of the United States',
    termStart: '2025-01-20',
    termEnd: '2029-01-20',
    website: 'https://www.whitehouse.gov/administration/donald-j-trump/',
  },
  {
    profileId: 'vp-us',
    bioguideId: 'V000137',
    name: 'JD Vance',
    firstName: 'JD',
    lastName: 'Vance',
    party: 'Republican',
    chamber: 'vice_president',
    office: 'Vice President of the United States',
    termStart: '2025-01-20',
    termEnd: '2029-01-20',
    website: 'https://www.whitehouse.gov/administration/jd-vance/',
  },
  {
    profileId: 'cab-rubio',
    bioguideId: 'R000595',
    name: 'Marco Rubio',
    firstName: 'Marco',
    lastName: 'Rubio',
    party: 'Republican',
    chamber: 'cabinet',
    office: 'U.S. Secretary of State',
    department: 'Department of State',
    termStart: '2025-01-21',
    termEnd: '2029-01-20',
    website: 'https://www.state.gov/biographies/marco-rubio',
  },
  {
    profileId: 'cab-bondi',
    name: 'Pam Bondi',
    firstName: 'Pam',
    lastName: 'Bondi',
    party: 'Republican',
    chamber: 'cabinet',
    office: 'U.S. Attorney General',
    department: 'Department of Justice',
    termStart: '2025-02-05',
    termEnd: '2029-01-20',
    website: 'https://www.justice.gov/ag/biography',
  },
  {
    profileId: 'cab-bessent',
    name: 'Scott Bessent',
    firstName: 'Scott',
    lastName: 'Bessent',
    party: 'Republican',
    chamber: 'cabinet',
    office: 'U.S. Secretary of the Treasury',
    department: 'Department of the Treasury',
    termStart: '2025-01-28',
    termEnd: '2029-01-20',
    website: 'https://home.treasury.gov/about/general-information/officials',
  },
  {
    profileId: 'cab-hegseth',
    name: 'Pete Hegseth',
    firstName: 'Pete',
    lastName: 'Hegseth',
    party: 'Republican',
    chamber: 'cabinet',
    office: 'U.S. Secretary of Defense',
    department: 'Department of Defense',
    termStart: '2025-01-25',
    termEnd: '2029-01-20',
    website: 'https://www.defense.gov/About/Secretary-of-Defense/',
  },
  {
    profileId: 'cab-noem',
    name: 'Kristi Noem',
    firstName: 'Kristi',
    lastName: 'Noem',
    party: 'Republican',
    chamber: 'cabinet',
    office: 'U.S. Secretary of Homeland Security',
    department: 'Department of Homeland Security',
    termStart: '2025-01-25',
    termEnd: '2029-01-20',
    website: 'https://www.dhs.gov/secretary-homeland-security',
  },
];

const byProfileId = new Map<string, ExecutiveRecord>(
  currentExecutives.map((e) => [e.profileId, e]),
);
const byBioguide = new Map<string, ExecutiveRecord>(
  currentExecutives.filter((e) => e.bioguideId).map((e) => [e.bioguideId!, e]),
);

export function findExecutiveByProfileId(profileId: string): ExecutiveRecord | undefined {
  return byProfileId.get(profileId);
}

export function findExecutiveByBioguide(bioguideId?: string): ExecutiveRecord | undefined {
  if (!bioguideId) return undefined;
  return byBioguide.get(bioguideId);
}

export function executiveOfficeRecord(e: ExecutiveRecord): OfficeRecord {
  return {
    bioguideId: e.bioguideId,
    chamber: e.chamber as Chamber,
    office: e.office,
    state: 'United States',
    stateCode: 'US',
    party: e.party,
    termStart: e.termStart,
    termEnd: e.termEnd,
    source: { ...EXECUTIVE_SOURCE, url: e.website ?? EXECUTIVE_SOURCE.url, date: EXECUTIVE_AS_OF },
    asOf: EXECUTIVE_AS_OF,
  };
}
