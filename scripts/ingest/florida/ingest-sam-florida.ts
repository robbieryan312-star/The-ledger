/**
 * SAM.gov entity search for Florida (requires SAM_API_KEY).
 * Output: data/florida/sam/florida-contractors.json
 *
 * Wave-1 / core-rules §6: never overwrite a fetched-live snapshot with an empty /
 * honest-gap payload when SAM_API_KEY is missing or the fetch fails.
 * login.gov identity verification is required to obtain a key — documented honest-gap until then.
 */
import { fetchJson, loadEnvLocal, writeFloridaSnapshotPreservingLive } from '../../lib/ingest-utils';

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
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  if (!key) {
    const { action, outFile } = await writeFloridaSnapshotPreservingLive('sam', 'florida-contractors.json', {
      meta: {
        source: SAM_SOURCE,
        asOf,
        fetchedAt,
        count: 0,
        stateCode: 'FL',
        fetchedLive: false,
        provenance: 'honest-gap',
        errors: ['SAM_API_KEY not configured'],
        datasetUrl: 'https://api.sam.gov/entity-information/v3/entities',
        note:
          'Honest-gap: SAM.gov API requires login.gov identity-verified account. SAM_API_KEY EMPTY — prior fetched-live snapshot (if any) preserved. See KEYS.md.',
      },
      records: [],
    });
    console.warn(
      action === 'preserved-prior'
        ? `Preserved prior fetched-live ${outFile} — SAM_API_KEY missing (login.gov)`
        : `Wrote honest-gap ${outFile} — SAM_API_KEY missing (login.gov verification required)`,
    );
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

  const fetchedLive = errors.length === 0 && records.length > 0;
  const payload = fetchedLive
    ? {
        meta: {
          source: SAM_SOURCE,
          asOf,
          fetchedAt,
          count: records.length,
          stateCode: 'FL' as const,
          fetchedLive: true,
          provenance: 'fetched-live' as const,
          datasetUrl: 'https://api.sam.gov/entity-information/v3/entities',
          note: 'Florida-registered SAM.gov entities. Tier official.',
        },
        records,
      }
    : {
        meta: {
          source: SAM_SOURCE,
          asOf,
          fetchedAt,
          count: 0,
          stateCode: 'FL' as const,
          fetchedLive: false,
          provenance: 'honest-gap' as const,
          errors: errors.length ? errors : ['SAM.gov returned no entities'],
          datasetUrl: 'https://api.sam.gov/entity-information/v3/entities',
          note: 'Fetch failed or empty — prior fetched-live snapshot preserved when present (Wave-1 / core-rules §6).',
        },
        records: [] as Array<Record<string, unknown>>,
      };

  const { action, outFile } = await writeFloridaSnapshotPreservingLive('sam', 'florida-contractors.json', payload);

  if (action === 'preserved-prior') {
    console.warn(
      `Preserved prior fetched-live ${outFile} — refused to overwrite after errors: ${errors.join('; ') || 'empty'}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Wrote ${outFile} (${fetchedLive ? records.length : 0} records, fetchedLive=${fetchedLive})`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
