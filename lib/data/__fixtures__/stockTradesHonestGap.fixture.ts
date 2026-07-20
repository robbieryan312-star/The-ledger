/**
 * Append-only fixtures — S000033 STOCK Act trades honest-gap / fetch-failed UI (M6).
 * Silent empty (no status/note) is the frozen anti-pattern.
 */

/** Frozen good: on-disk S000033 trades.json shape after Senate eFD 503. */
export const S000033_TRADES_FETCH_FAILED_KNOWN_GOOD = {
  bioguideId: 'S000033',
  status: 'fetch-failed' as const,
  note: 'Senate eFD maintenance (HTTP 503) — no verified STOCK Act trades on record',
  trades: [] as const,
  uiHonestGapLabel: 'No verified record available',
};

/**
 * Frozen bad: empty trades with no fetch-failed / eFD signal — would look like
 * verified zero if UI only checked trades.length === 0 without status/note.
 */
export const TRADES_SILENT_EMPTY_KNOWN_BAD = {
  bioguideId: 'S000033',
  status: undefined,
  note: undefined,
  trades: [] as const,
};
