/**
 * generate-roster.ts — Build lib/data/generated/roster.json from authoritative
 * sources only: currentLegislators.json (real Congress data) + the 6+1 migrated
 * featured profiles whose identity fields are hard-coded here.
 *
 * No mock or DNU data is referenced. The `states` array in the output is derived
 * entirely from per-state legislator counts in currentLegislators.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

interface RosterEntry {
  id: string;
  bioguideId?: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  stateCode: string;
  chamber: string;
  level: string;
  district?: string;
  imageUrl?: string;
  website?: string;
  recordType: 'featured' | 'lightweight';
  inOffice: boolean;
  termStart?: string;
  termEnd?: string;
}

const legislatorsPath = path.join(ROOT, 'lib/data/generated/currentLegislators.json');
const legislatorsFile = JSON.parse(readFileSync(legislatorsPath, 'utf8')) as {
  legislators: Array<Record<string, unknown>>;
};
const legislatorsRaw = legislatorsFile.legislators as Array<{
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
  website?: string;
}>;

// The 7 migrated profiles that have real generated data
const MIGRATED: Record<string, { id: string }> = {
  S000033: { id: 'bernie-sanders' },
  O000172: { id: 'alexandria-ocasio-cortez' },
  M000355: { id: 'mitch-mcconnell' },
  M001184: { id: 'rep-massie' },
  W000817: { id: 'elizabeth-warren' },
  C001098: { id: 'ted-cruz' },
  P000197: { id: 'nancy-pelosi' },
};

// Hand-authored featured profiles that were in mockPoliticians — extract their
// identity fields manually. These are the IDs/bioguides from the DNU source.
const FEATURED_IDENTITIES: RosterEntry[] = [
  { id: 'bernie-sanders', bioguideId: 'S000033', name: 'Bernie Sanders', firstName: 'Bernie', lastName: 'Sanders', party: 'Independent', state: 'Vermont', stateCode: 'VT', chamber: 'senate', level: 'federal', recordType: 'featured', inOffice: true, termStart: '2007-01-04', termEnd: '2029-01-03' },
  { id: 'mitch-mcconnell', bioguideId: 'M000355', name: 'Mitch McConnell', firstName: 'Mitch', lastName: 'McConnell', party: 'Republican', state: 'Kentucky', stateCode: 'KY', chamber: 'senate', level: 'federal', recordType: 'featured', inOffice: true, termStart: '1985-01-03', termEnd: '2027-01-03' },
  { id: 'alexandria-ocasio-cortez', bioguideId: 'O000172', name: 'Alexandria Ocasio-Cortez', firstName: 'Alexandria', lastName: 'Ocasio-Cortez', party: 'Democrat', state: 'New York', stateCode: 'NY', chamber: 'house', level: 'federal', district: '14', recordType: 'featured', inOffice: true, termStart: '2019-01-03', termEnd: '2027-01-03' },
  // No bioguideId — D000628 is Neal P. Dunn (current FL-02). Governors are not in Congress;
  // a stale/wrong bioguideId caused Dunn's portrait and FEC/vote bleed on DeSantis's card.
  { id: 'ron-desantis', name: 'Ron DeSantis', firstName: 'Ron', lastName: 'DeSantis', party: 'Republican', state: 'Florida', stateCode: 'FL', chamber: 'governor', level: 'state', recordType: 'featured', inOffice: true, termStart: '2019-01-08', termEnd: '2027-01-05' },
  { id: 'rep-massie', bioguideId: 'M001184', name: 'Thomas Massie', firstName: 'Thomas', lastName: 'Massie', party: 'Republican', state: 'Kentucky', stateCode: 'KY', chamber: 'house', level: 'federal', district: '4', recordType: 'featured', inOffice: true, termStart: '2012-11-13', termEnd: '2027-01-03' },
  { id: 'elizabeth-warren', bioguideId: 'W000817', name: 'Elizabeth Warren', firstName: 'Elizabeth', lastName: 'Warren', party: 'Democrat', state: 'Massachusetts', stateCode: 'MA', chamber: 'senate', level: 'federal', recordType: 'featured', inOffice: true, termStart: '2013-01-03', termEnd: '2031-01-03' },
  { id: 'ted-cruz', bioguideId: 'C001098', name: 'Ted Cruz', firstName: 'Ted', lastName: 'Cruz', party: 'Republican', state: 'Texas', stateCode: 'TX', chamber: 'senate', level: 'federal', recordType: 'featured', inOffice: true, termStart: '2013-01-03', termEnd: '2031-01-03' },
  { id: 'nancy-pelosi', bioguideId: 'P000197', name: 'Nancy Pelosi', firstName: 'Nancy', lastName: 'Pelosi', party: 'Democrat', state: 'California', stateCode: 'CA', chamber: 'house', level: 'federal', district: '11', recordType: 'featured', inOffice: true, termStart: '2025-01-03', termEnd: '2027-01-03' },
];

// Derive per-state legislator counts from the real currentLegislators.json
const stateCounts = new Map<string, number>();
for (const leg of legislatorsRaw) {
  stateCounts.set(leg.stateCode, (stateCounts.get(leg.stateCode) ?? 0) + 1);
}

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',
  ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',
  RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',
  TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',
  AS:'American Samoa',GU:'Guam',MP:'Northern Mariana Islands',
  PR:'Puerto Rico',VI:'U.S. Virgin Islands',
};

const states = Array.from(stateCounts.entries())
  .map(([code, count]) => ({ code, name: STATE_NAMES[code] ?? code, activePoliticians: count }))
  .sort((a, b) => a.code.localeCompare(b.code));

const output = {
  generatedAt: new Date().toISOString(),
  count: FEATURED_IDENTITIES.length,
  entries: FEATURED_IDENTITIES,
  states,
};

const outPath = path.join(ROOT, 'lib/data/generated/roster.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${FEATURED_IDENTITIES.length} roster entries to ${outPath}`);
