/**
 * Voteview (UCLA) — DW-NOMINATE ideology scores for Florida's Congress (no key).
 * Output: data/voteview/florida-ideology.json
 *
 * Tier 2 nonpartisan academic. DW-NOMINATE is the standard political-science
 * measure of roll-call voting position (Poole-Rosenthal). Presented neutrally as
 * a sourced metric, not an editorial judgment. Each record dated + linked.
 */
import { sleep, writeFloridaSnapshot } from './lib/ingest-utils';

const VOTEVIEW_SOURCE = {
  name: 'Voteview (UCLA)',
  url: 'https://voteview.com',
  tier: 'nonpartisan' as const,
  description: 'DW-NOMINATE congressional roll-call ideology scores (Lewis et al., UCLA)',
};

const PARTY: Record<string, string> = { '100': 'Democrat', '200': 'Republican', '328': 'Independent' };

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function fetchCsvText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  const congress = 119;

  try {
    for (const chamberFile of [`H${congress}`, `S${congress}`]) {
      const text = await fetchCsvText(`https://voteview.com/static/data/out/members/${chamberFile}_members.csv`);
      const lines = text.split('\n').filter((l) => l.trim());
      const header = parseCsvLine(lines[0]);
      const idx = (name: string) => header.indexOf(name);
      const iState = idx('state_abbrev'), iChamber = idx('chamber'), iParty = idx('party_code');
      const iDist = idx('district_code'), iName = idx('bioname'), iBio = idx('bioguide_id');
      const iIcpsr = idx('icpsr'), iD1 = idx('nominate_dim1'), iD2 = idx('nominate_dim2');
      for (const line of lines.slice(1)) {
        const c = parseCsvLine(line);
        if (c[iState] !== 'FL') continue;
        const d1 = parseFloat(c[iD1]);
        const d2 = parseFloat(c[iD2]);
        records.push({
          name: c[iName] || 'No record on file',
          chamber: c[iChamber] || 'No record on file',
          party: PARTY[c[iParty]] ?? c[iParty] ?? 'No record on file',
          district: c[iChamber] === 'House' ? (c[iDist] || null) : null,
          bioguideId: c[iBio] || null,
          nominateEconomic: Number.isFinite(d1) ? d1 : null,
          nominateSocial: Number.isFinite(d2) ? d2 : null,
          congress,
          source: { ...VOTEVIEW_SOURCE },
          asOf,
          voteviewUrl: c[iIcpsr] ? `https://voteview.com/person/${c[iIcpsr]}` : 'https://voteview.com',
        });
      }
      await sleep(300);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('voteview', 'florida-ideology.json', {
    meta: {
      source: VOTEVIEW_SOURCE,
      asOf,
      fetchedAt,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: `https://voteview.com/static/data/out/members/H${congress}_members.csv`,
      note: 'DW-NOMINATE ideology scores for Florida U.S. House & Senate members, 119th Congress. nominateEconomic is the 1st dimension (economic/redistribution axis), nominateSocial the 2nd; values roughly -1 to +1. A sourced nonpartisan political-science metric, not an editorial label. Tier 2.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
