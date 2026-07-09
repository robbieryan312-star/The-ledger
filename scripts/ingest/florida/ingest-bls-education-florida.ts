/**
 * Education-tier unemployment and earnings — US CPS national reference (4 tiers).
 * Florida state-level CPS by education is not exposed in the BLS v1 timeseries API.
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import { BLS_SOURCE, fetchBlsSeries, latestPoint } from '../../lib/bls-api';

const TIERS: Array<{
  educationLevel: string;
  unemploymentSeries: string;
  earningsSeries: string;
  earningsUnit: string;
}> = [
  {
    educationLevel: 'Less than high school',
    unemploymentSeries: 'LNS14027659',
    earningsSeries: 'LEU0252887700',
    earningsUnit: 'USD/week',
  },
  {
    educationLevel: 'High school diploma',
    unemploymentSeries: 'LNS14027660',
    earningsSeries: 'LEU0252887900',
    earningsUnit: 'USD/week',
  },
  {
    educationLevel: 'Some college or associate degree',
    unemploymentSeries: 'LNS14027662',
    earningsSeries: 'LEU0252888000',
    earningsUnit: 'USD/week',
  },
  {
    educationLevel: "Bachelor's degree and higher",
    unemploymentSeries: 'LNS14027689',
    earningsSeries: 'LEU0252888200',
    earningsUnit: 'USD/week',
  },
];

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  const allSeries = [...new Set(TIERS.flatMap((t) => [t.unemploymentSeries, t.earningsSeries]))];

  try {
    const data = await fetchBlsSeries(allSeries, year - 2, year);

    for (const tier of TIERS) {
      const unempPts = data.get(tier.unemploymentSeries);
      const earnPts = data.get(tier.earningsSeries);
      const unemp = latestPoint(unempPts);
      const earn = latestPoint(earnPts);

      records.push({
        educationLevel: tier.educationLevel,
        geography: 'US',
        unemploymentRate: unemp?.value ?? null,
        unemploymentPeriod: unemp?.period ?? null,
        unemploymentSeriesId: tier.unemploymentSeries,
        medianWeeklyEarnings: earn?.value ?? null,
        earningsPeriod: earn?.period ?? null,
        earningsSeriesId: tier.earningsSeries,
        earningsUnit: tier.earningsUnit,
        source: {
          ...BLS_SOURCE,
          date: unemp?.date ?? earn?.date,
          description:
            'Current Population Survey (CPS) — national reference; Florida state-level education breakdown not in BLS v1 API.',
        },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${tier.unemploymentSeries}`,
        note: 'US national CPS reference — not Florida state estimate.',
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const out = await writeFloridaSnapshot('bls', 'florida-education-labor.json', {
    meta: {
      source: BLS_SOURCE,
      asOf,
      count: records.length,
      stateCode: 'FL',
      fetchedLive: records.length === 4,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
      note:
        'Four education tiers from US CPS (national). Florida state-level breakdown not in BLS v1 API. Bachelor\'s vs advanced degree cannot be split in this API — tier 4 is "Bachelor\'s degree and higher".',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} education tiers)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
