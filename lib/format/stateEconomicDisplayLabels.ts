type DisplayLabel = {
  title: string;
  sub?: string;
};

const DISPLAY_LABELS = new Map<string, DisplayLabel>([
  [
    'Median household income',
    { title: 'Typical household income', sub: 'middle of all households (median)' },
  ],
  ['Median home value', { title: 'Typical home value', sub: 'middle sale value (median)' }],
  ['Unemployment level', { title: 'People looking for work' }],
  ['Labor force', { title: 'People in the workforce' }],
  ['Employment', { title: 'People with jobs' }],
  [
    "Adults with a bachelor's+",
    { title: 'Adults with a college degree', sub: "bachelor's or higher" },
  ],
  [
    'Cost of living index',
    { title: 'How prices compare', sub: 'U.S. average = 100 (lower = cheaper)' },
  ],
]);

export function displayLabelFor(sliceLabel: string): DisplayLabel {
  return DISPLAY_LABELS.get(sliceLabel) ?? { title: sliceLabel };
}
