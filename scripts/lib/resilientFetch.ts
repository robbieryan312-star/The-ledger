/**
 * Shared resilient fetch for sync scripts: per-host token bucket, 15s timeout,
 * retry ×2 with exponential backoff + jitter, optional per-item checkpointing.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Token-bucket rate limiter (~1 req/s/host default). */
export class RateLimiter {
  private tokens: number;
  private last: number;

  constructor(
    private readonly rps: number,
    private readonly burst = rps,
  ) {
    this.tokens = burst;
    this.last = Date.now();
  }

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rps);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await sleep(Math.max(10, ((1 - this.tokens) / this.rps) * 1000));
    }
  }
}

const hostLimiters = new Map<string, RateLimiter>();

export function getHostLimiter(url: string, rps = 1): RateLimiter {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    host = '__unknown__';
  }
  const key = `${host}:${rps}`;
  let limiter = hostLimiters.get(key);
  if (!limiter) {
    limiter = new RateLimiter(rps);
    hostLimiters.set(key, limiter);
  }
  return limiter;
}

function backoffDelay(attempt: number): number {
  return 1000 * Math.pow(2, attempt - 1) + Math.random() * 400;
}

export interface FetchWithRetryOptions extends RequestInit {
  maxAttempts?: number;
  timeoutMs?: number;
  rps?: number;
}

export interface FetchWithRetryResult {
  response: Response;
  attempts: number;
}

/**
 * Fetch with per-host rate limit, timeout, and retry on 429/5xx/network error.
 */
export async function fetchWithRetry(
  url: string,
  opts: FetchWithRetryOptions = {},
): Promise<FetchWithRetryResult> {
  const { maxAttempts = 3, timeoutMs = 15_000, rps = 1, ...fetchInit } = opts;
  const limiter = getHostLimiter(url, rps);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await limiter.acquire();
    try {
      const res = await fetch(url, {
        ...fetchInit,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      return { response: res, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error(`fetchWithRetry failed after ${maxAttempts} attempts: ${url}`);
}

export async function loadCheckpoint<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function saveCheckpoint<T>(filePath: string, data: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true }).catch(() => undefined);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function resetRateLimiters(): void {
  hostLimiters.clear();
}
