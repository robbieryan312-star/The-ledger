/**
 * Sync-script fetch helpers — re-exports canonical HTTP client from lib/data.
 * Checkpoint I/O lives in syncKernel.ts.
 */
import {
  fetchWithRetry,
  HostRateLimiter,
  resetRateLimiters,
  type FetchWithRetryOptions,
  type FetchWithRetryResult,
} from '../../lib/data/resilientFetch';

export {
  fetchWithRetry,
  HostRateLimiter,
  resetRateLimiters,
  type FetchWithRetryOptions,
  type FetchWithRetryResult,
};

export { sleep, loadCheckpoint, saveCheckpoint } from './syncKernel';

/** Back-compat alias for scripts that imported RateLimiter. */
export { HostRateLimiter as RateLimiter };

export function getHostLimiter(_url: string, rps = 1): HostRateLimiter {
  return new HostRateLimiter(rps, rps);
}
