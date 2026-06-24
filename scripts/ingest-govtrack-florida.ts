/**
 * GovTrack Florida members (replaces retired ProPublica Congress API).
 * Output: data/govtrack/florida-members.json
 */
import { fetchJson, loadFloridaLegislators, writeFloridaSnapshot } from './lib/ingest-utils';

const GOVTRACK_SOURCE = {
  name: 'GovTrack.us',
  url: 'https://www.govtrack.us',
  tier: 'nonpartisan' as const,
  description: 'Nonpartisan congressional member records via GovTrack public API',
};

interface GovTrackPerson {
  id: number;
  firstname: string;
  lastname: string;
  middlename?: string;
  nickname?: string;
  bioguideid?: string;
  link: string;
  current_role?: {
    role_type: string;
    state: string;
    district?: number;
    party: string;
    startdate: string;
    enddate?: string;
  };
}

async function fetchGovTrackRoles(): Promise<GovTrackPerson[] | { objects?: GovTrackPerson[] }> {
  const urls = [
    'https://www.govtrack.us/api/v2/role?current=true&state=FL&limit=50',
    'https://www.govtrack.us/api/v2/role?current=true&limit=600',
  ];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      return await fetchJson<GovTrackPerson[]>(url);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const flLegislators = await loadFloridaLegislators();
  const flBioguides = new Set(flLegislators.map((l) => l.bioguideId));

  let raw: GovTrackPerson[] | { objects?: GovTrackPerson[] };
  let fetchedLive = true;
  try {
    raw = await fetchGovTrackRoles();
  } catch {
    fetchedLive = false;
    raw = flLegislators.map((leg) => ({
      id: leg.govtrackId ?? 0,
      firstname: leg.name.split(' ')[0] ?? leg.name,
      lastname: leg.name.split(' ').slice(1).join(' ') || leg.name,
      bioguideid: leg.bioguideId,
      link: `https://www.govtrack.us/congress/members/${leg.bioguideId}`,
      current_role: {
        role_type: leg.chamber === 'senate' ? 'senator' : 'representative',
        state: 'FL',
        party: leg.party.startsWith('Dem') ? 'Democrat' : leg.party.startsWith('Rep') ? 'Republican' : 'Independent',
        startdate: asOf,
      },
    }));
  }

  const data = Array.isArray(raw) ? raw : (raw.objects ?? []);
  let pool = data.filter((p) => p.bioguideid && flBioguides.has(p.bioguideid));

  if (pool.length === 0) {
    fetchedLive = false;
    pool = flLegislators.map((leg) => ({
      id: leg.govtrackId ?? 0,
      firstname: leg.name.split(' ')[0] ?? leg.name,
      lastname: leg.name.split(' ').slice(1).join(' ') || leg.name,
      bioguideid: leg.bioguideId,
      link: `https://www.govtrack.us/congress/members/${leg.bioguideId}`,
      current_role: {
        role_type: leg.chamber === 'senate' ? 'senator' : 'representative',
        state: 'FL',
        party: leg.party.startsWith('Dem') ? 'Democrat' : leg.party.startsWith('Rep') ? 'Republican' : 'Independent',
        startdate: asOf,
      },
    }));
  }

  const records = pool
    .map((p) => ({
      govtrackId: p.id,
      bioguideId: p.bioguideid!,
      name: [p.firstname, p.middlename, p.lastname].filter(Boolean).join(' '),
      currentRole: p.current_role
        ? {
            roleType: p.current_role.role_type,
            state: p.current_role.state,
            district: p.current_role.district,
            party: p.current_role.party,
            startDate: p.current_role.startdate,
            endDate: p.current_role.enddate,
          }
        : undefined,
      profileUrl: p.link,
      source: GOVTRACK_SOURCE,
      asOf,
    }));

  const out = await writeFloridaSnapshot('govtrack', 'florida-members.json', {
    meta: {
      source: GOVTRACK_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive,
      datasetUrl: 'https://www.govtrack.us/api/v2/role',
      note: 'Substitute for retired ProPublica Congress API. Tier 2 nonpartisan.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
