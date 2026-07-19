type DisplayLabel = {
  title: string;
  sub?: string;
};

const DISPLAY_LABELS = new Map<string, DisplayLabel>([
  ['Median household income', { title: 'Household income', sub: 'median — half earn more, half less' }],
  ['Median home value', { title: 'Home value', sub: 'median' }],
  ['Unemployment level', { title: 'People unemployed' }],
  ['Labor force', { title: 'Workforce size' }],
  ['Employment', { title: 'People employed' }],
  ["Adults with a bachelor's+", { title: 'College-educated adults', sub: "bachelor's degree or higher" }],
  ['Cost of living index', { title: 'Cost of living', sub: 'U.S. average = 100' }],
]);

export function displayLabelFor(sliceLabel: string): DisplayLabel {
  return DISPLAY_LABELS.get(sliceLabel) ?? { title: sliceLabel };
}
