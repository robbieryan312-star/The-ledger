/**
 * governors.ts — curated, sourced list of the 50 current U.S. state governors.
 *
 * Governors are NOT in the congress-legislators dataset, so this is a small,
 * hand-verified authoritative list modeled with the same provenance envelope
 * (Source + OfficeRecord shape) as everything else, so governors flow through
 * the SAME recency resolver and source tiering as members of Congress.
 *
 * Source of record: National Governors Association governors roster, verified
 * against the cross-referenced "List of current United States governors"
 * (as of January 2026). Accuracy over completeness — every entry here is a
 * confirmed sitting governor; if one cannot be confirmed it is omitted and
 * tracked as a TODO in DATA_INTEGRATION_PLAN.md rather than guessed.
 */
import { OfficeRecord, Party, Source } from '../types';

export const GOVERNORS_AS_OF = '2026-01-20';

/** Primary provenance for the curated governors list (Tier 2 — nonpartisan). */
export const GOVERNORS_SOURCE: Source = {
  name: 'National Governors Association — Governors Roster',
  url: 'https://www.nga.org/governors/',
  tier: 'nonpartisan',
  date: GOVERNORS_AS_OF,
  description:
    'Roster of current U.S. governors maintained by the nonpartisan National Governors Association; cross-checked against state and official records.',
};

export interface GovernorRecord {
  stateCode: string;
  state: string;
  name: string;
  firstName: string;
  lastName: string;
  party: Party;
  termStart: string; // ISO date
  termEnd: string; // year (term expiry)
  website?: string; // official state governor site, when confidently known
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// [stateCode, fullName, party, termStart, termEndYear, website?]
const RAW: [string, string, Party, string, string, string?][] = [
  ['AL', 'Kay Ivey', 'Republican', '2017-04-10', '2027', 'https://governor.alabama.gov'],
  ['AK', 'Mike Dunleavy', 'Republican', '2018-12-03', '2026', 'https://gov.alaska.gov'],
  ['AZ', 'Katie Hobbs', 'Democrat', '2023-01-02', '2027', 'https://azgovernor.gov'],
  ['AR', 'Sarah Huckabee Sanders', 'Republican', '2023-01-10', '2027', 'https://governor.arkansas.gov'],
  ['CA', 'Gavin Newsom', 'Democrat', '2019-01-07', '2027', 'https://www.gov.ca.gov'],
  ['CO', 'Jared Polis', 'Democrat', '2019-01-08', '2027', 'https://governor.colorado.gov'],
  ['CT', 'Ned Lamont', 'Democrat', '2019-01-09', '2027', 'https://portal.ct.gov/governor'],
  ['DE', 'Matt Meyer', 'Democrat', '2025-01-21', '2029', 'https://governor.delaware.gov'],
  ['FL', 'Ron DeSantis', 'Republican', '2019-01-08', '2027', 'https://www.flgov.com'],
  ['GA', 'Brian Kemp', 'Republican', '2019-01-14', '2027', 'https://gov.georgia.gov'],
  ['HI', 'Josh Green', 'Democrat', '2022-12-05', '2026', 'https://governor.hawaii.gov'],
  ['ID', 'Brad Little', 'Republican', '2019-01-07', '2027', 'https://gov.idaho.gov'],
  ['IL', 'JB Pritzker', 'Democrat', '2019-01-14', '2027', 'https://gov.illinois.gov'],
  ['IN', 'Mike Braun', 'Republican', '2025-01-13', '2029', 'https://www.in.gov/gov'],
  ['IA', 'Kim Reynolds', 'Republican', '2017-05-24', '2027', 'https://governor.iowa.gov'],
  ['KS', 'Laura Kelly', 'Democrat', '2019-01-14', '2027', 'https://governor.kansas.gov'],
  ['KY', 'Andy Beshear', 'Democrat', '2019-12-10', '2027', 'https://governor.ky.gov'],
  ['LA', 'Jeff Landry', 'Republican', '2024-01-08', '2028', 'https://gov.louisiana.gov'],
  ['ME', 'Janet Mills', 'Democrat', '2019-01-02', '2027', 'https://www.maine.gov/governor'],
  ['MD', 'Wes Moore', 'Democrat', '2023-01-18', '2027', 'https://governor.maryland.gov'],
  ['MA', 'Maura Healey', 'Democrat', '2023-01-05', '2027', 'https://www.mass.gov/orgs/office-of-the-governor'],
  ['MI', 'Gretchen Whitmer', 'Democrat', '2019-01-01', '2027', 'https://www.michigan.gov/whitmer'],
  ['MN', 'Tim Walz', 'Democrat', '2019-01-07', '2027', 'https://mn.gov/governor'],
  ['MS', 'Tate Reeves', 'Republican', '2020-01-14', '2028', 'https://governorreeves.ms.gov'],
  ['MO', 'Mike Kehoe', 'Republican', '2025-01-13', '2029', 'https://governor.mo.gov'],
  ['MT', 'Greg Gianforte', 'Republican', '2021-01-04', '2029', 'https://governor.mt.gov'],
  ['NE', 'Jim Pillen', 'Republican', '2023-01-05', '2027', 'https://governor.nebraska.gov'],
  ['NV', 'Joe Lombardo', 'Republican', '2023-01-02', '2027', 'https://gov.nv.gov'],
  ['NH', 'Kelly Ayotte', 'Republican', '2025-01-09', '2027', 'https://www.governor.nh.gov'],
  ['NJ', 'Mikie Sherrill', 'Democrat', '2026-01-20', '2030', 'https://www.nj.gov/governor'],
  ['NM', 'Michelle Lujan Grisham', 'Democrat', '2019-01-01', '2027', 'https://www.governor.state.nm.us'],
  ['NY', 'Kathy Hochul', 'Democrat', '2021-08-24', '2026', 'https://www.governor.ny.gov'],
  ['NC', 'Josh Stein', 'Democrat', '2025-01-01', '2029', 'https://governor.nc.gov'],
  ['ND', 'Kelly Armstrong', 'Republican', '2024-12-15', '2028', 'https://www.governor.nd.gov'],
  ['OH', 'Mike DeWine', 'Republican', '2019-01-14', '2027', 'https://governor.ohio.gov'],
  ['OK', 'Kevin Stitt', 'Republican', '2019-01-14', '2027', 'https://oklahoma.gov/governor.html'],
  ['OR', 'Tina Kotek', 'Democrat', '2023-01-09', '2027', 'https://www.oregon.gov/gov'],
  ['PA', 'Josh Shapiro', 'Democrat', '2023-01-17', '2027', 'https://www.governor.pa.gov'],
  ['RI', 'Dan McKee', 'Democrat', '2021-03-02', '2027', 'https://governor.ri.gov'],
  ['SC', 'Henry McMaster', 'Republican', '2017-01-24', '2027', 'https://governor.sc.gov'],
  ['SD', 'Larry Rhoden', 'Republican', '2025-01-25', '2027', 'https://governor.sd.gov'],
  ['TN', 'Bill Lee', 'Republican', '2019-01-19', '2027', 'https://www.tn.gov/governor'],
  ['TX', 'Greg Abbott', 'Republican', '2015-01-20', '2027', 'https://gov.texas.gov'],
  ['UT', 'Spencer Cox', 'Republican', '2021-01-04', '2029', 'https://governor.utah.gov'],
  ['VT', 'Phil Scott', 'Republican', '2017-01-05', '2027', 'https://governor.vermont.gov'],
  ['VA', 'Abigail Spanberger', 'Democrat', '2026-01-17', '2030', 'https://www.governor.virginia.gov'],
  ['WA', 'Bob Ferguson', 'Democrat', '2025-01-15', '2029', 'https://governor.wa.gov'],
  ['WV', 'Patrick Morrisey', 'Republican', '2025-01-13', '2029', 'https://governor.wv.gov'],
  ['WI', 'Tony Evers', 'Democrat', '2019-01-07', '2027', 'https://evers.wi.gov'],
  ['WY', 'Mark Gordon', 'Republican', '2019-01-07', '2027', 'https://governor.wyo.gov'],
];

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export const currentGovernors: GovernorRecord[] = RAW.map(([stateCode, name, party, termStart, termEnd, website]) => {
  const { firstName, lastName } = splitName(name);
  return {
    stateCode,
    state: STATE_NAMES[stateCode] ?? stateCode,
    name,
    firstName,
    lastName,
    party,
    termStart,
    termEnd,
    website,
  };
});

const byState = new Map<string, GovernorRecord>(currentGovernors.map((g) => [g.stateCode, g]));

/** O(1) lookup of the current governor of a state, if confirmed. */
export function findCurrentGovernor(stateCode: string): GovernorRecord | undefined {
  return byState.get(stateCode);
}

/** Build an authoritative OfficeRecord for a governor (flows through the resolver). */
export function governorOfficeRecord(g: GovernorRecord): OfficeRecord {
  return {
    chamber: 'governor',
    office: 'Governor',
    state: g.state,
    stateCode: g.stateCode,
    party: g.party,
    termStart: g.termStart,
    termEnd: g.termEnd,
    source: { ...GOVERNORS_SOURCE, url: g.website ?? GOVERNORS_SOURCE.url },
    asOf: GOVERNORS_AS_OF,
  };
}
