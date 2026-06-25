/**
 * sync-legislators.ts
 *
 * Pulls the public-domain `unitedstates/congress-legislators` dataset
 * (legislators-current) — the canonical, official-records-derived list of every
 * CURRENT member of Congress — and writes a normalized local snapshot to
 * `lib/data/generated/currentLegislators.json`.
 *
 * No API key required. This is the authoritative source that makes the
 * "who currently holds this seat" question correct-by-construction: a person is
 * a current member if, and only if, they appear in this dataset.
 *
 * Run with:  npx tsx scripts/sync-legislators.ts
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_URL =
  'https://unitedstates.github.io/congress-legislators/legislators-current.json';

// Human-facing provenance recorded into the snapshot meta + every record.
const SOURCE_NAME = 'unitedstates/congress-legislators (legislators-current)';
const SOURCE_HOMEPAGE = 'https://github.com/unitedstates/congress-legislators';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'currentLegislators.json');

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
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  PR: 'Puerto Rico', GU: 'Guam', VI: 'Virgin Islands', AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
};

// Raw shapes (subset of fields we consume) from the upstream JSON.
interface RawTerm {
  type: 'sen' | 'rep';
  start: string;
  end: string;
  state: string;
  district?: number;
  party?: string;
  url?: string;
}
interface RawLegislator {
  id: { bioguide: string; lis?: string; govtrack?: number; fec?: string[] };
  name: { first: string; last: string; official_full?: string };
  terms: RawTerm[];
}

function normalizeParty(p?: string): string {
  if (!p) return 'Other';
  if (p === 'Democrat') return 'Democrat';
  if (p === 'Republican') return 'Republican';
  if (p === 'Independent') return 'Independent';
  if (p === 'Libertarian') return 'Libertarian';
  return 'Other';
}

async function main(): Promise<void> {
  console.log(`Fetching ${DATASET_URL} ...`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  }
  const raw = (await res.json()) as RawLegislator[];
  console.log(`Received ${raw.length} current legislators.`);

  const asOf = new Date().toISOString().slice(0, 10);

  const legislators = raw.map((p) => {
    // The most recent term is the current one for an in-office member.
    const term = p.terms[p.terms.length - 1];
    const stateCode = term.state;
    const chamber = term.type === 'sen' ? 'senate' : 'house';
    const office = term.type === 'sen' ? 'U.S. Senator' : 'U.S. Representative';
    return {
      bioguideId: p.id.bioguide,
      lisId: p.id.lis,
      name: p.name.official_full ?? `${p.name.first} ${p.name.last}`,
      firstName: p.name.first,
      lastName: p.name.last,
      stateCode,
      state: STATE_NAMES[stateCode] ?? stateCode,
      chamber,
      office,
      district: term.type === 'rep' ? String(term.district ?? 'At-Large') : undefined,
      party: normalizeParty(term.party),
      termStart: term.start,
      termEnd: term.end,
      govtrackId: p.id.govtrack,
      fecIds: p.id.fec ?? [],
      sourceUrl: term.url ?? SOURCE_HOMEPAGE,
    };
  });

  const snapshot = {
    meta: {
      source: {
        name: SOURCE_NAME,
        url: SOURCE_HOMEPAGE,
        tier: 'official' as const,
        description:
          'Public-domain dataset of all current members of Congress, maintained from official House/Senate records, GPO, and the Biographical Directory of Congress.',
      },
      datasetUrl: DATASET_URL,
      asOf,
      count: legislators.length,
      note:
        'Membership in this snapshot is the source of truth for current office. A featured politician not present here has left Congress and must resolve to a FORMER office.',
    },
    // Index by bioguide for O(1) current-office lookups in the resolver.
    legislators,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  const flSenators = legislators
    .filter((l) => l.stateCode === 'FL' && l.chamber === 'senate')
    .map((l) => `${l.name} (${l.party})`);
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  as-of: ${asOf}`);
  console.log(`  total: ${legislators.length}`);
  console.log(`  FL senators (real): ${flSenators.join(', ')}`);
  console.log(
    `  Rubio (R000595) present?: ${legislators.some((l) => l.bioguideId === 'R000595')}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
