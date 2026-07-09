/**
 * Education-tier unemployment and earnings — US CPS national reference (4 tiers).
 * Florida state-level CPS by education is not exposed in the BLS v1 timeseries API.
 */
import { writeFloridaSnapshot } from '../../lib/ingest-utils';
import { BLS_SOURCE, fetchBlsSeries, latestPoint } from '../../lib/bls-api';

const TIERS: Array<{
  educationLevel: string;
  unemploymentSeries: string | null;
  earningsSeries: string;
  unemploymentGapReason?: string;
}> = [
  {
    educationLevel: 'Less than high school',
    unemploymentSeries: 'LNS14027659',
    earningsSeries: 'LEU0252916700',
  },
  {
    educationLevel: 'High school diploma',
    unemploymentSeries: 'LNS14027660',
    earningsSeries: 'LEU0252917300',
  },
  {
    educationLevel: "Bachelor's degree",
    /** LNS14028977/CGBD25O not in BLS v1 API — bachelor's-only unemployment unavailable. */
    unemploymentSeries: null,
    earningsSeries: 'LEU0252919100',
    unemploymentGapReason:
      "Bachelor's-only unemployment rate is not exposed in the BLS v1 timeseries API (probed LNS14028977, CGBD25O — no data).",
  },
  {
    educationLevel: 'Advanced degree',
    /** LNS14028978/CGAD25O not in BLS v1 API — advanced-only unemployment unavailable. */
    unemploymentSeries: null,
    earningsSeries: 'LEU0252919700',
    unemploymentGapReason:
      "Advanced-degree unemployment rate is not exposed in the BLS v1 timeseries API (probed LNS14028978, CGAD25O — no data).",
  },
];

/** Weekly earnings must rise monotonically with education tier (CPS median usual weekly pay). */
function assertMonotonicWeeklyEarnings(weeklyValues: number[]): void {
  for (let i = 1; i < weeklyValues.length; i++) {
    if (weeklyValues[i] < weeklyValues[i - 1]) {
      throw new Error(
        `Education earnings failed monotonic plausibility check: tier ${i} ($${weeklyValues[i]}/wk) < tier ${i - 1} ($${weeklyValues[i - 1]}/wk)`,
      );
    }
  }
  for (const v of weeklyValues) {
    if (v < 400 || v > 5000) {
      throw new Error(`Education earnings out of plausible weekly range: $${v}/wk`);
    }
  }
}

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const errors: string[] = [];
  const records: Array<Record<string, unknown>> = [];

  const allSeries = [
    ...new Set(
      TIERS.flatMap((t) => [t.unemploymentSeries, t.earningsSeries].filter((s): s is string => !!s)),
    ),
  ];

  try {
    const data = await fetchBlsSeries(allSeries, year - 2, year);
    const weeklyEarnings: number[] = [];

    for (const tier of TIERS) {
      const unempPts = tier.unemploymentSeries ? data.get(tier.unemploymentSeries) : undefined;
      const earnPts = data.get(tier.earningsSeries);
      const unemp = latestPoint(unempPts);
      const earn = latestPoint(earnPts);

      const weekly =
        earn?.value != null ? Number.parseFloat(String(earn.value).replace(/,/g, '')) : NaN;
      if (Number.isFinite(weekly)) weeklyEarnings.push(weekly);

      const annualEarnings = Number.isFinite(weekly) ? Math.round(weekly * 52) : null;

      records.push({
        educationLevel: tier.educationLevel,
        geography: 'US',
        unemploymentRate: unemp?.value ?? null,
        unemploymentPeriod: unemp?.period ?? null,
        unemploymentSeriesId: tier.unemploymentSeries,
        unemploymentGapReason: unemp ? undefined : tier.unemploymentGapReason,
        medianWeeklyEarnings: Number.isFinite(weekly) ? weekly : null,
        medianAnnualEarnings: annualEarnings,
        earningsPeriod: earn?.period ?? null,
        earningsSeriesId: tier.earningsSeries,
        earningsUnit: 'USD/week',
        annualEarningsUnit: 'USD/year (calculated)',
        annualEarningsNote: 'Annualized (weekly × 52)',
        source: {
          ...BLS_SOURCE,
          date: unemp?.date ?? earn?.date,
          description:
            'Current Population Survey (CPS) — national reference; Florida state-level education breakdown not in BLS v1 API.',
        },
        asOf,
        blsUrl: `https://data.bls.gov/timeseries/${tier.earningsSeries}`,
        note: 'US national CPS reference — not Florida state estimate.',
      });
    }

    if (weeklyEarnings.length === TIERS.length) {
      assertMonotonicWeeklyEarnings(weeklyEarnings);
    } else {
      errors.push(`Expected ${TIERS.length} earnings tiers; got ${weeklyEarnings.length}`);
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
      fetchedLive: records.length === 4 && errors.length === 0,
      errors: errors.length ? errors : undefined,
      datasetUrl: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
      note:
        'Four education tiers from US CPS (national): less than HS, HS, bachelor\'s only, and advanced degree. Earnings annualized (weekly × 52). Bachelor\'s-only and advanced unemployment rates are not in BLS v1 API — honest gaps in UI.',
    },
    records,
  });

  console.log(`Wrote ${out} (${records.length} education tiers)`);
  if (errors.length) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
