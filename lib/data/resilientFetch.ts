/**
 * Resilient fetch with retry, exponential backoff, jitter, adaptive rate limiting,
 * and per-host token-bucket rate limiter.
 *
 * Shared infrastructure for congressClient.ts and senateVotesClient.ts.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Token-bucket rate limiter. Supports adaptive halving on 429. */
export class HostRateLimiter {
  private tokens: number;
  private last: number;
  private rps: number;
  private readonly baseRps: number;
  private halvedUntil = 0;

  constructor(rps: number, private readonly burst = rps) {
    this.rps = rps;
    this.baseRps = rps;
    this.tokens = burst;
    this.last = Date.now();
  }

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      if (now > this.halvedUntil && this.rps !== this.baseRps) {
        this.rps = this.baseRps;
      }
      this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rps);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await sleep(Math.max(10, ((1 - this.tokens) / this.rps) * 1000));
    }
  }

  /** On 429: halve rate for 60 seconds. */
  backoff(): void {
    this.rps = Math.max(0.5, this.baseRps / 2);
    this.halvedUntil = Date.now() + 60_000;
  }
}

const hostLimiters = new Map<string, HostRateLimiter>();

function getHostLimiter(url: string): HostRateLimiter {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    host = '__unknown__';
  }

  let limiter = hostLimiters.get(host);
  if (!limiter) {
    let rps = 2;
    if (host.includes('congress.gov')) {
      rps = Number(process.env.CONGRESS_MAX_RPS ?? 2);
    } else if (host.includes('senate.gov')) {
      rps = Number(process.env.SENATE_MAX_RPS ?? 2);
    }
    limiter = new HostRateLimiter(rps);
    hostLimiters.set(host, limiter);
  }
  return limiter;
}

export interface FetchWithRetryOptions extends RequestInit {
  /** Max attempts (default 4). */
  maxAttempts?: number;
  /** Per-attempt timeout in ms (default 30000). */
  timeoutMs?: number;
}

export interface FetchWithRetryResult {
  response: Response;
  attempts: number;
}

/**
 * Fetch with retry on 429/5xx/timeout. Exponential backoff with jitter.
 * Honors Retry-After header. Per-host token-bucket rate limiting.
 */
export async function fetchWithRetry(
  url: string,
  opts: FetchWithRetryOptions = {},
): Promise<FetchWithRetryResult> {
  const { maxAttempts = 4, timeoutMs = 30_000, ...fetchInit } = opts;
  const limiter = getHostLimiter(url);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await limiter.acquire();

    try {
      const res = await fetch(url, {
        ...fetchInit,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 429) {
        limiter.backoff();
        if (attempt < maxAttempts) {
          const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
          const delay = retryAfter ?? backoffDelay(attempt);
          await sleep(delay);
          continue;
        }
      }

      if (res.status >= 500 && attempt < maxAttempts) {
        const delay = backoffDelay(attempt);
        await sleep(delay);
        continue;
      }

      return { response: res, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const delay = backoffDelay(attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError ?? new Error(`fetchWithRetry: all ${maxAttempts} attempts failed for ${url}`);
}

/** Exponential backoff with jitter: base * 2^(attempt-1) + random jitter. */
function backoffDelay(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s
  const jitter = Math.random() * 500;
  return base + jitter;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const ms = date - Date.now();
    return ms > 0 ? ms : null;
  }
  return null;
}

/** Reset all host limiters (for testing). */
export function resetRateLimiters(): void {
  hostLimiters.clear();
}
