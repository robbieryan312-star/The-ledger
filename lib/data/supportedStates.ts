/**
 * Single source of truth for which /states/[code] pages are migrated (crawlable).
 * Consumed by the state route (to gate rendering) and app/sitemap.ts (to enumerate
 * crawlable state pages). Grows as new state profiles are migrated.
 */
export const SUPPORTED_STATES: Record<string, { name: string }> = {
  FL: { name: 'Florida' },
};

export const SUPPORTED_STATE_CODES: string[] = Object.keys(SUPPORTED_STATES);
