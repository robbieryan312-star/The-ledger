/**
 * ingest-voteview-member.ts — DW-NOMINATE scores for scoped Congress members (no key).
 * Merges into lib/data/generated/slices/profiles-voteview.json (VoteviewIdeologyPanel source).
 *
 * Run: npm run ingest:voteview -- --members S000033
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireSyncScope } from './lib/sync-scope';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(projectRoot, 'lib/data/generated/slices/profiles-voteview.json');
const NATIONAL_DIR = path.join(projectRoot, 'data/national/voteview');
const NATIONAL_FILE = path.join(NATIONAL_DIR, 'member-ideology.json');

const VOTEVIEW_SOURCE = {
  name: 'Voteview (UCLA)',
  url: 'https://voteview.com',
  tier: 'nonpartisan' as const,
  description: 'DW-NOMINATE congressional roll-call ideology scores (Lewis et al., UCLA)',
};

const PARTY: Record<string, string> = { '100': 'Democrat', '200': 'Republican', '328': 'Independent' };
const CONGRESS = 119;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function fetchCsvText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: 'text/csv' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

interface VoteviewMember {
  name: string;
  chamber: string;
  party: string;
  district: string | null;
  bioguideId: string;
  nominateEconomic: number;
  nominateSocial: number;
  congress: number;
  source: typeof VOTEVIEW_SOURCE;
  asOf: string;
  voteviewUrl: string;
}

async function main(): Promise<void> {
  const memberFilter = requireSyncScope(process.argv, 'ingest-voteview');
  if (!memberFilter || memberFilter.size === 0) {
    console.error('ingest:voteview requires --members <bioguideId[,...]> in agent sessions.');
    process.exit(1);
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const wanted = memberFilter;
  const found = new Map<string, VoteviewMember>();

  for (const chamberFile of [`H${CONGRESS}`, `S${CONGRESS}`]) {
    const text = await fetchCsvText(
      `https://voteview.com/static/data/out/members/${chamberFile}_members.csv`,
    );
    const lines = text.split('\n').filter((l) => l.trim());
    const header = parseCsvLine(lines[0]);
    const idx = (name: string) => header.indexOf(name);
    const iChamber = idx('chamber');
    const iParty = idx('party_code');
    const iDist = idx('district_code');
    const iName = idx('bioname');
    const iBio = idx('bioguide_id');
    const iIcpsr = idx('icpsr');
    const iD1 = idx('nominate_dim1');
    const iD2 = idx('nominate_dim2');

    for (const line of lines.slice(1)) {
      const c = parseCsvLine(line);
      const bioguideId = c[iBio]?.trim();
      if (!bioguideId || !wanted.has(bioguideId)) continue;
      const d1 = parseFloat(c[iD1]);
      const d2 = parseFloat(c[iD2]);
      if (!Number.isFinite(d1) || !Number.isFinite(d2)) continue;
      found.set(bioguideId, {
        name: c[iName] || bioguideId,
        chamber: c[iChamber] || 'No record on file',
        party: PARTY[c[iParty]] ?? c[iParty] ?? 'No record on file',
        district: c[iChamber] === 'House' ? c[iDist] || null : null,
        bioguideId,
        nominateEconomic: d1,
        nominateSocial: d2,
        congress: CONGRESS,
        source: { ...VOTEVIEW_SOURCE },
        asOf,
        voteviewUrl: c[iIcpsr] ? `https://voteview.com/person/${c[iIcpsr]}` : 'https://voteview.com',
      });
    }
  }

  let slice: {
    meta?: Record<string, unknown>;
    byBioguideId: Record<string, VoteviewMember>;
  } = { byBioguideId: {} };
  try {
    slice = JSON.parse(await readFile(OUT_FILE, 'utf8')) as typeof slice;
  } catch {
    /* fresh */
  }

  for (const [id, row] of found) {
    slice.byBioguideId[id] = row;
  }
  slice.meta = {
    ...(slice.meta ?? {}),
    source: VOTEVIEW_SOURCE,
    asOf,
    fetchedAt,
    count: Object.keys(slice.byBioguideId).length,
    datasetUrl: `https://voteview.com/static/data/out/members/S${CONGRESS}_members.csv`,
    note: 'DW-NOMINATE ideology scores (nonpartisan). nominateEconomic = 1st dimension; nominateSocial = 2nd. Tier nonpartisan.',
    lastScopedRefresh: [...wanted].join(','),
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(slice, null, 2)}\n`);

  await mkdir(NATIONAL_DIR, { recursive: true });
  await writeFile(
    NATIONAL_FILE,
    `${JSON.stringify(
      {
        meta: {
          source: VOTEVIEW_SOURCE,
          asOf,
          fetchedAt,
          scope: `scoped: ${[...wanted].join(',')}`,
          congress: CONGRESS,
        },
        byBioguideId: Object.fromEntries(found),
        missing: [...wanted].filter((id) => !found.has(id)),
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Voteview: wrote ${found.size}/${wanted.size} member(s) → ${OUT_FILE} + ${NATIONAL_FILE}`,
  );
  for (const [id, row] of found) {
    console.log(
      `  ${id}: econ=${row.nominateEconomic.toFixed(3)} social=${row.nominateSocial.toFixed(3)} ${row.voteviewUrl}`,
    );
  }
  for (const id of wanted) {
    if (!found.has(id)) console.warn(`  MISSING ${id} in ${CONGRESS}th Congress Voteview CSVs`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
