/**
 * Florida congressional districts from unitedstates/congress-legislators + Census geocoder reference.
 * Replaces deprecated Google Civic representatives API.
 * Output: data/civic/florida-districts.json
 */
import { fetchJson, loadFloridaLegislators, writeFloridaSnapshot } from './lib/ingest-utils';

const CENSUS_SOURCE = {
  name: 'U.S. Census Bureau / congress-legislators',
  url: 'https://www.census.gov',
  tier: 'official' as const,
  description: 'Congressional district boundaries and current seat assignments from official-derived datasets',
};

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const legislators = await loadFloridaLegislators();

  const districtMap = new Map<number, typeof legislators>();
  for (const leg of legislators) {
    if (leg.chamber !== 'house') continue;
    const district = leg.district ? Number(leg.district) : 0;
    const list = districtMap.get(district) ?? [];
    list.push(leg);
    districtMap.set(district, list);
  }

  const records = [...districtMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([district, members]) => ({
      stateCode: 'FL',
      stateName: 'Florida',
      congressionalDistrict: district,
      representative: members[0]
        ? {
            bioguideId: members[0].bioguideId,
            name: members[0].name,
            party: members[0].party,
            office: members[0].office,
          }
        : { name: 'No record on file' },
      censusGeocoderNote:
        'District geometry available via Census TIGER/Line; seat holder from unitedstates/congress-legislators (Tier 1).',
      censusGeocoderUrl: 'https://geocoding.geo.census.gov/geocoder/geographies/address',
      legislatorsSourceUrl:
        'https://unitedstates.github.io/congress-legislators/legislators-current.json',
      source: CENSUS_SOURCE,
      asOf,
    }));

  const senators = legislators.filter((l) => l.chamber === 'senate');
  records.unshift({
    stateCode: 'FL',
    stateName: 'Florida',
    congressionalDistrict: 0,
    representative: {
      name: senators.map((s) => s.name).join('; ') || 'No record on file',
      bioguideId: senators.map((s) => s.bioguideId).join('; '),
      party: senators.map((s) => s.party).join('; '),
      office: 'U.S. Senate (at-large by state)',
    },
    censusGeocoderNote: 'Senate seats are statewide; district field 0 denotes statewide senators.',
    censusGeocoderUrl: 'https://geocoding.geo.census.gov/geocoder/geographies/address',
    legislatorsSourceUrl:
      'https://unitedstates.github.io/congress-legislators/legislators-current.json',
    source: CENSUS_SOURCE,
    asOf,
  } as (typeof records)[number]);

  const out = await writeFloridaSnapshot('civic', 'florida-districts.json', {
    meta: {
      source: CENSUS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: true,
      note: 'Substitute for deprecated Google Civic representatives API. District seats from congress-legislators; geocoder for address lookup.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} district records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
