/**
 * Frozen regression evidence for the dead-route-link guard (W3a, 2026-07-19). Append-only.
 *
 * Owner/Claude-confirmed defect: components/counties/OfficialCard.tsx linked (2×) to
 * `/officials/[id]`, a route whose page.tsx body only called `notFound()` — a guaranteed 404
 * user path. Fixed by repointing the links to `/politicians/[id]` (officials ARE politicians in
 * our data) and deleting the dead route. The guard asserts no internal <Link>/href targets a
 * route whose page.tsx only calls notFound().
 */
export const DEAD_ROUTE_LINK_KNOWN_BAD = {
  defect: 'internal-link-targets-notfound-only-route',
  route: 'app/officials/[id]/page.tsx',
  deadPrefix: '/officials/',
  linkExample: '/officials/${official.id}',
  /** A notFound()-only page body, verbatim shape of the removed officials route. */
  notFoundOnlyPageSource: [
    "import { notFound } from 'next/navigation';",
    '',
    'export default async function OfficialProfilePage({ params }: { params: Promise<{ id: string }> }) {',
    '  await params;',
    '  notFound();',
    '}',
  ].join('\n'),
  /** A page that conditionally notFound()s but renders JSX is NOT dead (counter-example). */
  renderingPageSource: [
    "import { notFound } from 'next/navigation';",
    'export default async function Page() {',
    '  const x = get();',
    '  if (!x) notFound();',
    '  return (<div>{x}</div>);',
    '}',
  ].join('\n'),
  description:
    'Internal link pointed at /officials/[id] whose page.tsx only calls notFound() → 404. Repointed to /politicians/[id] and route deleted.',
};
