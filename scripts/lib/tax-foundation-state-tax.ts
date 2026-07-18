/**
 * State income tax estimates from Tax Foundation published bracket tables (2024).
 * Tier: nonpartisan — cited bracket schedules, not IRS official data.
 * https://taxfoundation.org/data/all/state/state-income-tax-rates-2024/
 */

type Bracket = { upTo: number; rate: number };

const NY_2024_SINGLE: Bracket[] = [
  { upTo: 8_500, rate: 0.04 },
  { upTo: 11_700, rate: 0.045 },
  { upTo: 13_900, rate: 0.0525 },
  { upTo: 80_650, rate: 0.055 },
  { upTo: 215_400, rate: 0.06 },
  { upTo: 1_077_550, rate: 0.0685 },
  { upTo: 5_000_000, rate: 0.0965 },
  { upTo: 25_000_000, rate: 0.103 },
  { upTo: Infinity, rate: 0.109 },
];

const CA_2024_SINGLE: Bracket[] = [
  { upTo: 10_412, rate: 0.01 },
  { upTo: 24_684, rate: 0.02 },
  { upTo: 38_959, rate: 0.04 },
  { upTo: 54_081, rate: 0.06 },
  { upTo: 68_350, rate: 0.08 },
  { upTo: 349_137, rate: 0.093 },
  { upTo: 418_961, rate: 0.103 },
  { upTo: 698_271, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

function taxFromBrackets(taxableIncome: number, brackets: Bracket[]): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of brackets) {
    const band = Math.min(taxableIncome, upTo) - prev;
    if (band <= 0) break;
    tax += band * rate;
    prev = upTo;
  }
  return Math.round(tax);
}

/** NY standard deduction 2024 (single) — Tax Foundation schedule. */
const NY_STD_DED = 8_000;
const CA_STD_DED = 5_202;

export const TAX_FOUNDATION_CITATION = {
  name: 'Tax Foundation',
  url: 'https://taxfoundation.org/data/all/state/state-income-tax-rates-2024/',
  tier: 'nonpartisan' as const,
  citation: 'Tax Foundation State Individual Income Tax Rates and Brackets (2024)',
};

export const TAX_FOUNDATION_BURDEN_CITATION = {
  name: 'Tax Foundation',
  url: 'https://taxfoundation.org/data/all/state/state-local-tax-burden/',
  tier: 'nonpartisan' as const,
  citation: 'Tax Foundation Facts & Figures — state and local tax burden (% of income)',
};

/** Florida state+local burden vs U.S. average (Tax Foundation Facts & Figures 2024). */
export const TF_STATE_LOCAL_BURDEN = {
  floridaPct: 9.1,
  usAveragePct: 11.2,
  salesTaxAvgPct: 7.0,
  propertyEffectivePct: 0.8,
};

export function stateIncomeTaxSingle(state: 'NY' | 'CA', grossIncome: number): number {
  const std = state === 'NY' ? NY_STD_DED : CA_STD_DED;
  const brackets = state === 'NY' ? NY_2024_SINGLE : CA_2024_SINGLE;
  return taxFromBrackets(grossIncome - std, brackets);
}
