/**
 * SAM.gov entity search for Florida (requires SAM_API_KEY).
 * Output: data/sam/florida-contractors.json
 */
import { fetchJson, loadEnvLocal, writeFloridaSnapshot } from './lib/ingest-utils';

const SAM_SOURCE = {
  name: 'SAM.gov',
  url: 'https://sam.gov',
  tier: 'official' as const,
  description: 'System for Award Management entity registrations via api.sam.gov',
};

async function main(): Promise<void> {
  await loadEnvLocal();
  const key = process.env.SAM_API_KEY?.trim();
  const asOf = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const out = await writeFloridaSnapshot('sam', 'florida-contractors.json', {
      meta: {
        source: SAM_SOURCE,
        asOf,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        errors: ['SAM_API_KEY not configured'],
        note:
          'Blocked: SAM.gov API requires login.gov identity-verified account. No record on file until SAM_API_KEY obtained.',
      },
      records: [],
    });
    console.warn(`Wrote empty ${out} — SAM_API_KEY missing (login.gov verification required)`);
    return;
  }

  try {
    const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${encodeURIComponent(key)}&physicalAddressProvinceOrStateCode=FL&includeSections=entityRegistration&size=100`;
    const data = await fetchJson<{
      entityData?: Array<{
        entityRegistration?: {
          legalBusinessName?: string;
          ueiSAM?: string;
          registrationStatus?: string;
          registrationDate?: string;
        };
      }>;
    }>(url);

    for (const entity of data.entityData ?? []) {
      const reg = entity.entityRegistration;
      records.push({
        legalBusinessName: reg?.legalBusinessName ?? 'No record on file',
        uei: reg?.ueiSAM ?? 'No record on file',
        registrationStatus: reg?.registrationStatus ?? 'No record on file',
        registrationDate: reg?.registrationDate ?? 'No record on file',
        state: 'FL',
        source: SAM_SOURCE,
        asOf,
        samUrl: reg?.ueiSAM
          ? `https://sam.gov/content/entities/${reg.ueiSAM}`
          : 'https://sam.gov/',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('sam', 'florida-contractors.json', {
    meta: {
      source: SAM_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: errors.length === 0 && records.length > 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.sam.gov/entity-information/v3/entities',
      note: 'Florida-registered SAM.gov entities. Tier 1 official.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} records)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
