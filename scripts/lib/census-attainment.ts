/**
 * Derive educational attainment percentages from ACS B15003 table columns.
 * https://api.census.gov/data/2023/acs/acs5/variables/B15003_001E.json
 *
 * Returns null when total population is missing/zero — never emit false 0% rows.
 */

export type AttainmentSummary = {
  hsPlusPct: number;
  someCollegePct: number;
  bachelorsPct: number;
  graduatePct: number;
  bachelorsPlusPct: number;
};

export function attainmentFromB15003(row: Record<string, string>): AttainmentSummary | null {
  const n = (k: string) => Number(row[k]) || 0;
  const total = n('B15003_001E');
  if (total <= 0) {
    return null;
  }
  const hsDiploma = n('B15003_017E') + n('B15003_018E');
  const someCollege = n('B15003_019E') + n('B15003_020E') + n('B15003_021E');
  const bachelors = n('B15003_022E');
  const graduate = n('B15003_023E') + n('B15003_024E') + n('B15003_025E');
  const hsPlus = hsDiploma + someCollege + bachelors + graduate;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    hsPlusPct: round1((hsPlus / total) * 100),
    someCollegePct: round1((someCollege / total) * 100),
    bachelorsPct: round1((bachelors / total) * 100),
    graduatePct: round1((graduate / total) * 100),
    bachelorsPlusPct: round1(((bachelors + graduate) / total) * 100),
  };
}

export const B15003_VARS = [
  'B15003_001E',
  'B15003_017E',
  'B15003_018E',
  'B15003_019E',
  'B15003_020E',
  'B15003_021E',
  'B15003_022E',
  'B15003_023E',
  'B15003_024E',
  'B15003_025E',
].join(',');
