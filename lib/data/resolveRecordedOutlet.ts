/**
 * Resolve a recorded outlet label without fabricating provenance.
 * Prefer the explicit outlet field; otherwise derive only from a verifiable URL host.
 * Returns null when neither is available — callers must omit the item (never invent a label).
 */
export function resolveRecordedOutlet(
  outlet: string | undefined | null,
  url: string | undefined | null,
): string | null {
  const recorded = (outlet ?? '').trim();
  if (recorded) return recorded;
  const rawUrl = (url ?? '').trim();
  if (!rawUrl) return null;
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'govinfo.gov' || host.endsWith('.govinfo.gov')) {
      return 'Congressional Record (GovInfo)';
    }
    if (host === 'congress.gov' || host.endsWith('.congress.gov')) {
      return 'Congress.gov';
    }
    if (host === 'senate.gov' || host.endsWith('.senate.gov')) {
      return 'U.S. Senate';
    }
  } catch {
    return null;
  }
  return null;
}
