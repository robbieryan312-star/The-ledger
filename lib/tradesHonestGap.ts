/**
 * STOCK Act trades empty-state helpers — UI-safe (no generated JSON imports).
 * Used by client components and by stockTrades.ts / sync guards.
 */

/** Canonical UI label when STOCK Act trades are unverified (never silent empty). */
export const TRADES_HONEST_GAP_LABEL = 'No verified record available';

/**
 * True when empty trades mean an unverified/fetch gap (Senate eFD 503, fetch-failed,
 * maintenance) — not a verified zero-trade record.
 */
export function isTradesFetchFailedGap(opts: {
  status?: string | null;
  note?: string | null;
}): boolean {
  if (opts.status === 'fetch-failed') return true;
  const note = opts.note ?? '';
  return /fetch-failed|Senate eFD|HTTP\s*503|under maintenance/i.test(note);
}

/** Empty-state copy for Stock Trades tab — honest-gap vs verified-none. */
export function tradesEmptyStateCopy(opts: {
  status?: string | null;
  note?: string | null;
  name: string;
}): { headline: string; detail: string; isHonestGap: boolean } {
  if (isTradesFetchFailedGap(opts)) {
    const detail =
      opts.note?.trim() ||
      'STOCK Act trade data could not be verified (Senate eFD / House Clerk PTR).';
    return {
      headline: TRADES_HONEST_GAP_LABEL,
      detail,
      isHonestGap: true,
    };
  }
  return {
    headline: `No stock trades reported for ${opts.name}`,
    detail: 'Stock disclosures are required under the STOCK Act (2012)',
    isHonestGap: false,
  };
}
