/**
 * U.S. Bureau of Labor Statistics — Florida labor statistics (no key, v1 API).
 * Output: data/bls/florida-labor.json
 *
 * Tier 1 official. Florida statewide Local Area Unemployment Statistics (LAUS):
 * unemployment rate, unemployment level, employment, and labor force, with the
 * latest reading and recent monthly history. Each series dated and linked.
 */
import { fetchJson, writeFloridaSnapshot } from './lib/ingest-utils';

const BLS_SOURCE = {
  name: 'U.S. Bureau of Labor Statistics',
  url: 'https://www.bls.gov',
  tier: 'official' as const,
  description: 'Local Area Unemployment Statistics (LAUS) for Florida via api.bls.gov',
};

const SERIES: Record<string, { label: string; unit: string }> = {
  LAUST120000000000003: { label: 'Unemployment rate', unit: '%' },
  LAUST120000000000004: { label: 'Unemployment level', unit: 'persons' },
  LAUST120000000000005: { label: 'Employment', unit: 'persons' },
  LAUST120000000000006: { label: 'Labor force', unit: 'persons' },
};

interface BLSResp {
  status: string;
  Results?: {
    series: Array<{ seriesID: string; data: Array<{ year: string; period: string; periodName: string; value: string }> }>;
  };
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  try {
    const data = await fetchJson<BLSResp>('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesid: Object.keys(SERIES), startyear: String(year - 2), endyear: String(year) }),
    });
    if (data.status !== 'REQUEST_SUCCEEDED') errors.push(`BLS status: ${data.status}`);
    for (const s of data.Results?.series ?? []) {
      const meta = SERIES[s.seriesID] ?? { label: s.seriesID, unit: '' };
      const pts = s.data ?? []; // newest first
      const latest = pts[0];
      const mm = latest ? latest.period.replace('M', '').padStart(2, '0') : '01';
      records.push({
        indicator: meta.label,
        unit: meta.unit,
        seriesId: s.seriesID,
        latestPeriod: latest ? `${latest.periodName} ${latest.year}` : 'No record on file',
        latestValue: latest ? latest.value : null,
        recent: pts.slice(0, 12).map((p) => ({ period: `${p.periodName} ${p.year}`, value: p.value })),
        source: { ...BLS_SOURCE, date: latest ? `${latest.year}-${mm}-01` : undefined },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${s.seriesID}`,
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('bls', 'florida-labor.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
      note: 'Florida statewide labor statistics (LAUS): latest reading + recent monthly history. Tier 1 official BLS.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
