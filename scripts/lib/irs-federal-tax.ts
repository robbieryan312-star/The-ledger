/**
 * Federal income tax for single filers — 2024 tax year brackets.
 * Source: IRS Rev. Proc. 2023-34 (inflation-adjusted 2024 brackets).
 * https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024
 */

export const IRS_2024_SINGLE = {
  citation: 'IRS Rev. Proc. 2023-34 (tax year 2024, single filer)',
  url: 'https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024',
  standardDeduction: 14_600,
  brackets: [
    { upTo: 11_600, rate: 0.1 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_725, rate: 0.32 },
    { upTo: 609_350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
} as const;

/** Compute federal income tax on taxable wages (after standard deduction). */
export function federalIncomeTaxSingle(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of IRS_2024_SINGLE.brackets) {
    const band = Math.min(taxableIncome, upTo) - prev;
    if (band <= 0) break;
    tax += band * rate;
    prev = upTo;
  }
  return Math.round(tax);
}

export function federalTaxOnGrossIncomeSingle(grossIncome: number): number {
  const taxable = grossIncome - IRS_2024_SINGLE.standardDeduction;
  return federalIncomeTaxSingle(taxable);
}
